import { apiClient } from './client'
import type { GoldSummaryResponse, GoldTypeResponse } from './types'

export async function getGoldTypes(): Promise<GoldTypeResponse[]> {
  const { data } = await apiClient.get<GoldTypeResponse[]>('/gold-types')
  return data
}

export async function createGoldType(name: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/gold-types', { name })
  return data
}

export async function updateGoldType(id: string, name: string): Promise<void> {
  await apiClient.put(`/gold-types/${id}`, { name })
}

export async function deleteGoldType(id: string): Promise<void> {
  await apiClient.delete(`/gold-types/${id}`)
}

export async function getGoldSummary(): Promise<GoldSummaryResponse> {
  const { data } = await apiClient.get<GoldSummaryResponse>('/gold/summary')
  return data
}
