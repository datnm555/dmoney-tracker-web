import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  DARK_QUERY,
  ThemeContext,
  applyTheme,
  readStoredTheme,
  resolveTheme,
  storeTheme,
  systemPrefersDark,
} from './theme'
import type { ThemePreference } from './theme'

/**
 * Owns the Light / Dark / System preference: persists it, follows OS changes while on `system`,
 * and keeps the `.dark` class on <html> in sync. index.html applies the same class before React
 * mounts, so there is no flash of the wrong theme on load.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(readStoredTheme)
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(DARK_QUERY)
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches)
    media.addEventListener?.('change', onChange)
    return () => media.removeEventListener?.('change', onChange)
  }, [])

  const resolvedTheme = resolveTheme(theme, prefersDark)

  useEffect(() => {
    applyTheme(resolvedTheme)
  }, [resolvedTheme])

  const setTheme = useCallback((next: ThemePreference) => {
    storeTheme(next)
    setThemeState(next)
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
