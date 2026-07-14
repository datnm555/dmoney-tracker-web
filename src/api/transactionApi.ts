import { apiClient } from './client'
import type { AdvanceResponse, DashboardStatsResponse, MonthlySummaryResponse, PrepaidCreditResponse } from './types'

export interface TransactionPayload {
  date: string // YYYY-MM-DD
  content: string
  creditAmount: number
  debitAmount: number
  note: string | null
  categoryId: string | null
  paymentMethod: string
  cardType: string | null
  bank: string | null
  isAdvance: boolean
  advanceTransactionIds: string[]
  isPrepaid: boolean
  prepaidFrom: string | null
  prepaidTo: string | null
  prepaidTransactionId: string | null
  subCategoryId: string | null
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

export interface ImportRowPayload {
  date: string // YYYY-MM-DD
  content: string
  amount: number // signed: negative = debit, positive = credit
  note: string | null
}

export async function importTransactions(rows: ImportRowPayload[]): Promise<{ imported: number }> {
  const { data } = await apiClient.post<{ imported: number }>('/transactions/import', { rows })
  return data
}

export async function getOpenAdvances(forTransaction?: string): Promise<AdvanceResponse[]> {
  const { data } = await apiClient.get<AdvanceResponse[]>('/transactions/advances/open', {
    params: forTransaction ? { forTransaction } : undefined,
  })
  return data
}

export async function getPrepaidCredits(): Promise<PrepaidCreditResponse[]> {
  const { data } = await apiClient.get<PrepaidCreditResponse[]>('/transactions/prepaid')
  return data
}
