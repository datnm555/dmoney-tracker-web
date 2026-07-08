import { apiClient } from './client'
import type { DashboardStatsResponse, MonthlySummaryResponse } from './types'

export interface TransactionPayload {
  date: string // YYYY-MM-DD
  content: string
  creditAmount: number
  debitAmount: number
  note: string | null
  category: string | null
  paymentMethod: string
  cardType: string | null
  bank: string | null
}

export async function getMonthlySummary(month: string): Promise<MonthlySummaryResponse> {
  const { data } = await apiClient.get<MonthlySummaryResponse>('/transactions', { params: { month } })
  return data
}

export async function createTransaction(payload: TransactionPayload): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/transactions', payload)
  return data
}

export async function updateTransaction(id: string, payload: TransactionPayload): Promise<void> {
  await apiClient.put(`/transactions/${id}`, payload)
}

export async function deleteTransaction(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`)
}

export async function getDashboardStats(month: string): Promise<DashboardStatsResponse> {
  const { data } = await apiClient.get<DashboardStatsResponse>('/transactions/stats', { params: { month } })
  return data
}
