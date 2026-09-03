import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../api/client'
import { getPurchasePlaces } from '../api/purchasePlaceApi'
import { useI18n } from '../i18n/I18nContext'
import type { PurchasePlaceResponse } from '../api/types'

interface PurchasePlacesValue {
  purchasePlaces: PurchasePlaceResponse[]
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const PurchasePlacesContext = createContext<PurchasePlacesValue>({
  purchasePlaces: [],
  refresh: async () => {},
})

export function PurchasePlacesProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [purchasePlaces, setPurchasePlaces] = useState<PurchasePlaceResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setPurchasePlaces(await getPurchasePlaces())
    } catch (error) {
      // Keep the last known list, but tell the user the reload failed.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ purchasePlaces, refresh }), [purchasePlaces, refresh])

  return <PurchasePlacesContext.Provider value={value}>{children}</PurchasePlacesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePurchasePlaces(): PurchasePlacesValue {
  return useContext(PurchasePlacesContext)
}
