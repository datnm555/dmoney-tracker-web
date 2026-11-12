import type { TransactionResponse } from '../api/types'

/** What a row adds to income / expense totals (excluded rows and repaid advances add nothing). */
export function countedAmounts(tx: TransactionResponse): { credit: number; debit: number } {
  if (tx.excludedFromStats) return { credit: 0, debit: 0 }
  return {
    credit: tx.countedCredit?.amount ?? tx.credit.amount,
    debit: tx.countedDebit?.amount ?? tx.debit.amount,
  }
}

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
      const credit = dayItems.reduce((sum, i) => sum + countedAmounts(i).credit, 0)
      const debit = dayItems.reduce((sum, i) => sum + countedAmounts(i).debit, 0)
      return { date, credit, debit, net: credit - debit, items: dayItems }
    })
}
