import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../api/client'
import { getCategories } from '../api/categoryApi'
import { useI18n } from '../i18n/I18nContext'
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
  const { t } = useI18n()
  const [customCategories, setCustomCategories] = useState<CategoryResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setCustomCategories(await getCategories())
    } catch (error) {
      // Keep the last known list, but tell the user the reload failed.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

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
