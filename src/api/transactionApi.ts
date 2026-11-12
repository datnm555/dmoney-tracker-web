import { apiClient } from './client'
import type { AdvanceResponse, DayRange, CreditResponse, DashboardStatsResponse, MonthlySummaryResponse, PrepaidCreditResponse, TransactionSuggestionResponse } from './types'

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
  savingsBank: string | null
  accountId: string | null
  toAccountId: string | null
}

/**
 * Transactions + totals for a period: 'YYYY-MM' (month), 'YYYY' (whole year) or an inclusive
 * `{ from, to }` day range ('YYYY-MM-DD', at most MAX_RANGE_DAYS days — sent as ?from=&to=).
 */
export async function getMonthlySummary(period: string | DayRange, planId: string): Promise<MonthlySummaryResponse> {
  const params = typeof period === 'string' ? { month: period, planId } : { from: period.from, to: period.to, planId }
  const { data } = await apiClient.get<MonthlySummaryResponse>('/transactions', { params })
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

/** With accountId (the account the statement belongs to) every row is paid with that account. */
export async function importTransactions(
  rows: ImportRowPayload[],
  planId: string,
  accountId: string | null = null,
): Promise<{ imported: number }> {
  const { data } = await apiClient.post<{ imported: number }>('/transactions/import', { rows, planId, accountId })
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

export async function getTransactionSuggestions(q: string, limit?: number): Promise<TransactionSuggestionResponse[]> {
  const { data } = await apiClient.get<TransactionSuggestionResponse[]>('/transactions/suggestions', {
    params: { q, limit },
  })
  return data
}
