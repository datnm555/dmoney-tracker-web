import { apiClient } from './client'
import type { SavingsSummaryResponse } from './types'

export async function getSavingsSummary(): Promise<SavingsSummaryResponse> {
  const { data } = await apiClient.get<SavingsSummaryResponse>('/savings/summary')
  return data
}
