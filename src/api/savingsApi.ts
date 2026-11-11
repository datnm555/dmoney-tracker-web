import { apiClient } from './client'
import type { SavingsSummaryResponse } from './types'

export async function getSavingsSummary(): Promise<SavingsSummaryResponse> {
  const { data } = await apiClient.get<SavingsSummaryResponse>('/savings/summary')
  return data
}

export async function setSavingsGoal(input: {
  savingsBank: string
  targetAmount: number
  startPeriod: string
  months: number
  initialAmount: number
}): Promise<{ id: string }> {
  const { data } = await apiClient.put<{ id: string }>('/savings/goals', input)
  return data
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  await apiClient.delete(`/savings/goals/${id}`)
}
