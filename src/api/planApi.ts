import { apiClient } from './client'
import type { PlanResponse } from './types'

export async function getPlans(): Promise<PlanResponse[]> {
  const { data } = await apiClient.get<PlanResponse[]>('/plans')
  return data
}

export async function createPlan(name: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/plans', { name })
  return data
}

export async function updatePlan(id: string, name: string): Promise<void> {
  await apiClient.put(`/plans/${id}`, { name })
}

export async function deletePlan(id: string): Promise<void> {
  await apiClient.delete(`/plans/${id}`)
}

export async function setDefaultPlan(id: string): Promise<void> {
  await apiClient.put(`/plans/${id}/default`)
}
