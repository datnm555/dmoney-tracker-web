import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { STORAGE_KEYS } from '../api/client'
import { I18nProvider } from '../i18n/I18nContext'
import { ThemeProvider } from './ThemeContext'
import { ThemeToggle } from './ThemeToggle'
import { applyTheme, readStoredTheme, resolveTheme, storeTheme, systemPrefersDark, useTheme } from './theme'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

/** Controllable matchMedia: flip `setDark` to simulate the OS switching appearance. */
function mockMatchMedia(initialDark: boolean) {
  let dark = initialDark
  const listeners = new Set<(event: MediaQueryListEvent) => void>()
  const original = window.matchMedia
  window.matchMedia = ((query: string) => ({
    get matches() {
      return query === '(prefers-color-scheme: dark)' ? dark : false
    },
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: (event: MediaQueryListEvent) => void) => listeners.delete(cb),
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  return {
    setDark(next: boolean) {
      dark = next
      listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent))
    },
    listenerCount: () => listeners.size,
    restore: () => {
      window.matchMedia = original
    },
  }
}

const html = () => document.documentElement

beforeEach(() => {
  localStorage.clear()
  html().classList.remove('dark')
})

describe('theme helpers', () => {
  it('resolves system from the OS preference and passes explicit choices through', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })

  it('defaults to system and ignores garbage stored values', () => {
    expect(readStoredTheme()).toBe('system')
    localStorage.setItem(STORAGE_KEYS.theme, 'purple')
    expect(readStoredTheme()).toBe('system')
  })

  it('persists the preference under dmoney.theme', () => {
    storeTheme('dark')
    expect(localStorage.getItem('dmoney.theme')).toBe('dark')
    expect(readStoredTheme()).toBe('dark')
  })

  it('reads the OS preference via matchMedia', () => {
    const media = mockMatchMedia(true)
    try {
      expect(systemPrefersDark()).toBe(true)
      media.setDark(false)
      expect(systemPrefersDark()).toBe(false)
    } finally {
      media.restore()
    }
  })

  it('toggles the dark class on the root element', () => {
    applyTheme('dark')
    expect(html()).toHaveClass('dark')
    applyTheme('light')
    expect(html()).not.toHaveClass('dark')
  })
})

describe('ThemeProvider', () => {
  let media: ReturnType<typeof mockMatchMedia>

  afterEach(() => media.restore())

  function Probe() {
    const { theme, resolvedTheme } = useTheme()
    return <span data-testid="probe">{`${theme}:${resolvedTheme}`}</span>
  }

  it('follows the OS while on system, including live changes', () => {
    media = mockMatchMedia(true)
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('system:dark')
    expect(html()).toHaveClass('dark')

    act(() => media.setDark(false))
    expect(screen.getByTestId('probe')).toHaveTextContent('system:light')
    expect(html()).not.toHaveClass('dark')

    unmount()
    expect(media.listenerCount()).toBe(0)
  })

  it('restores a stored explicit choice regardless of the OS', () => {
    media = mockMatchMedia(true)
    localStorage.setItem(STORAGE_KEYS.theme, 'light')
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    )
    expect(screen.getByTestId('probe')).toHaveTextContent('light:light')
    expect(html()).not.toHaveClass('dark')
  })

  it('toggle buttons switch the dark class on <html> and persist the choice', async () => {
    media = mockMatchMedia(false)
    const user = userEvent.setup()
    render(
      <I18nProvider>
        <ThemeProvider>
          <ThemeToggle />
        </ThemeProvider>
      </I18nProvider>,
    )

    expect(await screen.findByRole('group', { name: 'theme.title' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'theme.system' })).toHaveAttribute('aria-pressed', 'true')
    expect(html()).not.toHaveClass('dark')

    await user.click(screen.getByRole('button', { name: 'theme.dark' }))
    expect(html()).toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('dark')
    expect(screen.getByRole('button', { name: 'theme.dark' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: 'theme.light' }))
    expect(html()).not.toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('light')

    // Back to system while the OS is dark → dark again.
    act(() => media.setDark(true))
    expect(html()).not.toHaveClass('dark')
    await user.click(screen.getByRole('button', { name: 'theme.system' }))
    expect(html()).toHaveClass('dark')
    expect(localStorage.getItem(STORAGE_KEYS.theme)).toBe('system')
  })
})
