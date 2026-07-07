import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { STORAGE_KEYS } from '../api/client'
import { getResources } from '../api/resourceApi'

interface I18nContextValue {
  lang: string
  setLang: (lang: string) => void
  t: (key: string) => string
  ready: boolean
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => localStorage.getItem(STORAGE_KEYS.lang) ?? 'vi')
  const [resources, setResources] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    getResources(lang)
      .then((data) => {
        if (!cancelled) {
          setResources(data)
          setReady(true)
        }
      })
      .catch(() => {
        // t() falls back to raw keys; the app stays usable offline.
        if (!cancelled) {
          setReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [lang])

  const setLang = useCallback((next: string) => {
    localStorage.setItem(STORAGE_KEYS.lang, next)
    setLangState(next)
  }, [])

  const t = useCallback((key: string) => resources[key] ?? key, [resources])

  const value = useMemo(() => ({ lang, setLang, t, ready }), [lang, setLang, t, ready])

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-primary"
          aria-label="loading"
        />
      </div>
    )
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return ctx
}
