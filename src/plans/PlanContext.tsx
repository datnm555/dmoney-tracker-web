import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import type { ReactNode } from 'react'
import { STORAGE_KEYS, getApiErrorMessage } from '../api/client'
import { getPlans } from '../api/planApi'
import { useI18n } from '../i18n/I18nContext'
import type { PlanResponse } from '../api/types'

interface PlansValue {
  plans: PlanResponse[]
  /** Null until the first load finishes; pages must not fetch before it is set. */
  selectedPlanId: string | null
  selectPlan: (id: string) => void
  refresh: () => Promise<void>
}

// Safe default so components (and tests) outside the provider still render.
const PlanContext = createContext<PlansValue>({
  plans: [],
  selectedPlanId: null,
  selectPlan: () => {},
  refresh: async () => {},
})

export function PlanProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n()
  const [plans, setPlans] = useState<PlanResponse[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)

  const selectPlan = useCallback((id: string) => {
    localStorage.setItem(STORAGE_KEYS.planId, id)
    setSelectedPlanId(id)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const loaded = await getPlans()
      setPlans(loaded)
      // Stored selection wins while it still exists; otherwise the default plan.
      const stored = localStorage.getItem(STORAGE_KEYS.planId)
      const valid = loaded.find((p) => p.id === stored) ?? loaded.find((p) => p.isDefault) ?? loaded[0]
      if (valid) {
        localStorage.setItem(STORAGE_KEYS.planId, valid.id)
        setSelectedPlanId(valid.id)
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const value = useMemo(
    () => ({ plans, selectedPlanId, selectPlan, refresh }),
    [plans, selectedPlanId, selectPlan, refresh],
  )

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePlans(): PlansValue {
  return useContext(PlanContext)
}
