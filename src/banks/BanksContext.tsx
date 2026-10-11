import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../api/client'
import { getBanks } from '../api/bankApi'
import { useI18n } from '../i18n/I18nContext'
import type { BankResponse } from '../api/types'

interface BanksValue {
  banks: BankResponse[]
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const BanksContext = createContext<BanksValue>({
  banks: [],
  refresh: async () => {},
})

export function BanksProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [banks, setBanks] = useState<BankResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setBanks(await getBanks())
    } catch (error) {
      // Keep the last known list, but tell the user the reload failed.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ banks, refresh }), [banks, refresh])

  return <BanksContext.Provider value={value}>{children}</BanksContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBanks(): BanksValue {
  return useContext(BanksContext)
}
