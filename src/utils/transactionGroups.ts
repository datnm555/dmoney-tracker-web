import type { TransactionResponse } from '../api/types'

export interface DayGroup {
  date: string
  credit: number
  debit: number
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
    .map(([date, dayItems]) => {
      // Excluded-from-stats rows stay listed but don't count, same as the month card.
      const counted = dayItems.filter((i) => !i.excludedFromStats)
      const credit = counted.reduce((sum, i) => sum + i.credit.amount, 0)
      const debit = counted.reduce((sum, i) => sum + i.debit.amount, 0)
      return { date, credit, debit, net: credit - debit, items: dayItems }
    })
}
