import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../api/client'
import { getGoldTypes } from '../api/goldApi'
import { useI18n } from '../i18n/I18nContext'
import type { GoldTypeResponse } from '../api/types'

interface GoldTypesValue {
  goldTypes: GoldTypeResponse[]
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const GoldTypesContext = createContext<GoldTypesValue>({
  goldTypes: [],
  refresh: async () => {},
})

export function GoldTypesProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [goldTypes, setGoldTypes] = useState<GoldTypeResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setGoldTypes(await getGoldTypes())
    } catch (error) {
      // Keep the last known list, but tell the user the reload failed.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ goldTypes, refresh }), [goldTypes, refresh])

  return <GoldTypesContext.Provider value={value}>{children}</GoldTypesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useGoldTypes(): GoldTypesValue {
  return useContext(GoldTypesContext)
}
