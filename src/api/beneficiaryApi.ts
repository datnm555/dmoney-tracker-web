import { apiClient } from './client'
import type { BeneficiaryResponse } from './types'

export async function getBeneficiaries(): Promise<BeneficiaryResponse[]> {
  const { data } = await apiClient.get<BeneficiaryResponse[]>('/beneficiaries')
  return data
}

export async function createBeneficiary(name: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/beneficiaries', { name })
  return data
}

export async function updateBeneficiary(id: string, name: string): Promise<void> {
  await apiClient.put(`/beneficiaries/${id}`, { name })
}

export async function deleteBeneficiary(id: string): Promise<void> {
  await apiClient.delete(`/beneficiaries/${id}`)
}

export async function setDefaultBeneficiary(id: string): Promise<void> {
  await apiClient.put(`/beneficiaries/${id}/default`)
}
