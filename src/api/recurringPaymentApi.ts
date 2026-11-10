import { apiClient } from './client'
import type {
  RecurringPaymentInput,
  RecurringPaymentRecordResponse,
  RecurringPaymentResponse,
  RecurringScheduleItemResponse,
} from './types'

export async function getRecurringPayments(): Promise<RecurringPaymentResponse[]> {
  const { data } = await apiClient.get<RecurringPaymentResponse[]>('/recurring-payments')
  return data
}

export async function createRecurringPayment(input: RecurringPaymentInput): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>('/recurring-payments', input)
  return data
}

export async function updateRecurringPayment(id: string, input: RecurringPaymentInput): Promise<void> {
  await apiClient.put(`/recurring-payments/${id}`, input)
}

export async function deleteRecurringPayment(id: string): Promise<void> {
  await apiClient.delete(`/recurring-payments/${id}`)
}

export async function getSchedule(month: string): Promise<RecurringScheduleItemResponse[]> {
  const { data } = await apiClient.get<RecurringScheduleItemResponse[]>('/recurring-payments/schedule', {
    params: { month },
  })
  return data
}

export async function getRecords(id: string): Promise<RecurringPaymentRecordResponse[]> {
  const { data } = await apiClient.get<RecurringPaymentRecordResponse[]>(`/recurring-payments/${id}/records`)
  return data
}

export async function createRecord(
  id: string,
  input: { period: string; amount: number; paidDate: string; transactionId: string | null },
): Promise<{ id: string }> {
  const { data } = await apiClient.post<{ id: string }>(`/recurring-payments/${id}/records`, input)
  return data
}

export async function deleteRecord(recordId: string): Promise<void> {
  await apiClient.delete(`/recurring-payments/records/${recordId}`)
}
