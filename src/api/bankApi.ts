import { apiClient } from './client'
import type { BankResponse } from './types'

export async function getBanks(): Promise<BankResponse[]> {
  const { data } = await apiClient.get<BankResponse[]>('/banks')
  return data
}

export async function createBank(name: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/banks', { name })
  return data
}

export async function updateBank(id: string, name: string): Promise<void> {
  await apiClient.put(`/banks/${id}`, { name })
}

export async function deleteBank(id: string): Promise<void> {
  await apiClient.delete(`/banks/${id}`)
}
