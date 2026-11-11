import { createContext, useContext } from 'react'
import { STORAGE_KEYS } from '../api/client'

/** What the user picked. `system` follows the OS `prefers-color-scheme`. */
export type ThemePreference = 'light' | 'dark' | 'system'
/** What is actually painted. */
export type ResolvedTheme = 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['light', 'dark', 'system']

export const DARK_QUERY = '(prefers-color-scheme: dark)'

function isPreference(value: unknown): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system'
}

/**
 * Stored preference, defaulting to `system` for missing/garbage values or blocked storage.
 * Mirrors the inline boot script in index.html — keep the two in sync.
 */
export function readStoredTheme(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.theme)
    return isPreference(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function storeTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEYS.theme, preference)
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(DARK_QUERY).matches
    : false
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (preference === 'system') return prefersDark ? 'dark' : 'light'
  return preference
}

/** Toggles the `.dark` class on <html> — the hook every `dark:` utility and the dark tokens key off. */
export function applyTheme(resolved: ResolvedTheme, root: HTMLElement = document.documentElement): void {
  root.classList.toggle('dark', resolved === 'dark')
}

export interface ThemeContextValue {
  theme: ThemePreference
  resolvedTheme: ResolvedTheme
  setTheme: (theme: ThemePreference) => void
}

// Default lets components (e.g. the Toaster) render outside a provider, as in isolated tests.
export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}
