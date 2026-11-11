import dayjs from 'dayjs'
import type { TransactionResponse } from '../api/types'

export interface DailySpendingDatum {
  /** YYYY-MM-DD */
  date: string
  /** Total debit (spending) that day, 0 when nothing was spent. */
  amount: number
}

type SpendRow = Pick<TransactionResponse, 'date' | 'debit' | 'excludedFromStats'>

/**
 * Spending per day for every day in [from, to] (inclusive, zero days included).
 * Mirrors the totals card: rows flagged `excludedFromStats` are skipped and only
 * the debit side counts — credits never add to a day's spending.
 */
export function dailySpending(items: SpendRow[], from: dayjs.ConfigType, to: dayjs.ConfigType): DailySpendingDatum[] {
  const start = dayjs(from).startOf('day')
  const end = dayjs(to).startOf('day')
  if (!start.isValid() || !end.isValid() || start.isAfter(end)) return []

  const totals = new Map<string, number>()
  for (const tx of items) {
    if (tx.excludedFromStats || tx.debit.amount <= 0) continue
    totals.set(tx.date, (totals.get(tx.date) ?? 0) + tx.debit.amount)
  }

  const days: DailySpendingDatum[] = []
  for (let day = start; !day.isAfter(end); day = day.add(1, 'day')) {
    const date = day.format('YYYY-MM-DD')
    days.push({ date, amount: totals.get(date) ?? 0 })
  }
  return days
}
