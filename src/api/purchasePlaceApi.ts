import { apiClient } from './client'
import type { PurchasePlaceResponse } from './types'

export async function getPurchasePlaces(): Promise<PurchasePlaceResponse[]> {
  const { data } = await apiClient.get<PurchasePlaceResponse[]>('/purchase-places')
  return data
}

export async function createPurchasePlace(name: string): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/purchase-places', { name })
  return data
}

export async function updatePurchasePlace(id: string, name: string): Promise<void> {
  await apiClient.put(`/purchase-places/${id}`, { name })
}

export async function deletePurchasePlace(id: string): Promise<void> {
  await apiClient.delete(`/purchase-places/${id}`)
}
