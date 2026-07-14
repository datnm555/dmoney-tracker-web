import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getCategories } from '../api/categoryApi'
import type { CategoryResponse } from '../api/types'

interface CategoriesValue {
  /** User-defined parent categories (built-in ones live in utils/categories.ts). */
  customCategories: CategoryResponse[]
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const CategoriesContext = createContext<CategoriesValue>({
  customCategories: [],
  refresh: async () => {},
})

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [customCategories, setCustomCategories] = useState<CategoryResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setCustomCategories(await getCategories())
    } catch {
      // Keep the last known list; pages surface their own load errors.
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ customCategories, refresh }), [customCategories, refresh])

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCategories(): CategoriesValue {
  return useContext(CategoriesContext)
}
