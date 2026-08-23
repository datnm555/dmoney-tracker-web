import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { getApiErrorMessage } from '../api/client'
import { getBeneficiaries } from '../api/beneficiaryApi'
import { useI18n } from '../i18n/I18nContext'
import type { BeneficiaryResponse } from '../api/types'

interface BeneficiariesValue {
  beneficiaries: BeneficiaryResponse[]
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const BeneficiariesContext = createContext<BeneficiariesValue>({
  beneficiaries: [],
  refresh: async () => {},
})

export function BeneficiariesProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryResponse[]>([])

  const refresh = useCallback(async () => {
    try {
      setBeneficiaries(await getBeneficiaries())
    } catch (error) {
      // Keep the last known list, but tell the user the reload failed.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(() => ({ beneficiaries, refresh }), [beneficiaries, refresh])

  return <BeneficiariesContext.Provider value={value}>{children}</BeneficiariesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useBeneficiaries(): BeneficiariesValue {
  return useContext(BeneficiariesContext)
}
