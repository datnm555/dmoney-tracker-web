import { apiClient } from './client'
import type { AccountInput, AccountResponse, AccountSnapshotResponse, SnapshotInput } from './types'

export async function getAccounts(): Promise<AccountResponse[]> {
  const { data } = await apiClient.get<AccountResponse[]>('/accounts')
  return data
}

export async function createAccount(input: AccountInput): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/accounts', input)
  return data
}

export async function updateAccount(id: string, input: AccountInput): Promise<void> {
  await apiClient.put(`/accounts/${id}`, input)
}

export async function deleteAccount(id: string): Promise<void> {
  await apiClient.delete(`/accounts/${id}`)
}

export async function getSnapshots(accountId: string): Promise<AccountSnapshotResponse[]> {
  const { data } = await apiClient.get<AccountSnapshotResponse[]>(`/accounts/${accountId}/snapshots`)
  return data
}

export async function createSnapshot(accountId: string, input: SnapshotInput): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>(`/accounts/${accountId}/snapshots`, input)
  return data
}

export async function updateSnapshot(id: string, input: SnapshotInput): Promise<void> {
  await apiClient.put(`/accounts/snapshots/${id}`, input)
}

export async function deleteSnapshot(id: string): Promise<void> {
  await apiClient.delete(`/accounts/snapshots/${id}`)
}
