import type { TransactionResponse } from '../api/types'

export interface DayGroup {
  date: string
  net: number
  items: TransactionResponse[]
}

export function groupTransactionsByDay(items: TransactionResponse[]): DayGroup[] {
  const byDate = new Map<string, TransactionResponse[]>()
  for (const item of items) {
    const bucket = byDate.get(item.date) ?? []
    bucket.push(item)
    byDate.set(item.date, bucket)
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, dayItems]) => ({
      date,
      net: dayItems.reduce((sum, i) => sum + i.credit.amount - i.debit.amount, 0),
      items: dayItems,
    }))
}
