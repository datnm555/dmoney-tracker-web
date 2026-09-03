import { apiClient } from './client'
import type { AdvanceResponse, CreditResponse, DashboardStatsResponse, MonthlySummaryResponse, PrepaidCreditResponse } from './types'

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
  planId: string
  reimbursedByTransactionId?: string | null
  beneficiaryId: string | null
  goldTypeId: string | null
  goldQuantity: number | null
  purchasePlaceId: string | null
}

export async function getMonthlySummary(month: string, planId: string): Promise<MonthlySummaryResponse> {
  const { data } = await apiClient.get<MonthlySummaryResponse>('/transactions', { params: { month, planId } })
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

export async function getDashboardStats(month: string, planId: string): Promise<DashboardStatsResponse> {
  const { data } = await apiClient.get<DashboardStatsResponse>('/transactions/stats', { params: { month, planId } })
  return data
}

export interface ImportRowPayload {
  date: string // YYYY-MM-DD
  content: string
  amount: number // signed: negative = debit, positive = credit
  note: string | null
}

export async function importTransactions(rows: ImportRowPayload[], planId: string): Promise<{ imported: number }> {
  const { data } = await apiClient.post<{ imported: number }>('/transactions/import', { rows, planId })
  return data
}

export async function getOpenAdvances(planId: string, forTransaction?: string): Promise<AdvanceResponse[]> {
  const { data } = await apiClient.get<AdvanceResponse[]>('/transactions/advances/open', {
    params: forTransaction ? { planId, forTransaction } : { planId },
  })
  return data
}

export async function getCredits(planId: string): Promise<CreditResponse[]> {
  const { data } = await apiClient.get<CreditResponse[]>('/transactions/credits', { params: { planId } })
  return data
}

export async function getPrepaidCredits(planId: string): Promise<PrepaidCreditResponse[]> {
  const { data } = await apiClient.get<PrepaidCreditResponse[]>('/transactions/prepaid', { params: { planId } })
  return data
}
