import type { Dayjs } from 'dayjs'
import type { DailyStat, MonthlyStat, SavingsTransactionResponse } from '../api/types'

export interface MonthlyBarDatum {
  month: string
  type: string
  amount: number
}

export interface IncomeExpenseDatum {
  month: string
  income: number
  expense: number
}

export function toIncomeExpenseBars(monthly: MonthlyStat[]): IncomeExpenseDatum[] {
  return monthly.map((m) => ({
    month: `T${Number(m.month.slice(5))}`,
    income: m.totalCredit.amount,
    expense: m.totalDebit.amount,
  }))
}

export interface PointDatum {
  x: string
  amount: number
}

export function toMonthlyBars(
  monthly: MonthlyStat[],
  creditLabel: string,
  debitLabel: string,
): MonthlyBarDatum[] {
  return monthly.flatMap((m) => [
    { month: m.month, type: creditLabel, amount: m.totalCredit.amount },
    { month: m.month, type: debitLabel, amount: m.totalDebit.amount },
  ])
}

export function toBalanceLine(monthly: MonthlyStat[]): PointDatum[] {
  return monthly.map((m) => ({ x: m.month, amount: m.balance.amount }))
}

export function toDailyBars(daily: DailyStat[]): PointDatum[] {
  return daily.map((d) => ({ x: String(d.day), amount: d.debit.amount }))
}

export interface SubCategorySpendingDatum {
  name: string | null
  amount: number
}

export interface CategorySpendingDatum {
  category: string
  amount: number
  subs: SubCategorySpendingDatum[]
}

/**
 * Aggregates debit totals per category (uncategorised rows get their own bucket), largest
 * first, with a per-sub-category breakdown inside each (rows without a sub-category
 * grouped under name null, listed last).
 */
export function toCategorySpending(
  items: { categoryId: string | null; debit: { amount: number }; subCategoryName?: string | null }[],
): CategorySpendingDatum[] {
  const byCategory = new Map<string, Map<string | null, number>>()
  for (const item of items) {
    if (item.debit.amount <= 0) continue
    const key = item.categoryId ?? 'uncategorized'
    const subs = byCategory.get(key) ?? new Map<string | null, number>()
    const subKey = item.subCategoryName ?? null
    subs.set(subKey, (subs.get(subKey) ?? 0) + item.debit.amount)
    byCategory.set(key, subs)
  }
  return [...byCategory.entries()]
    .map(([category, subMap]) => {
      const subs = [...subMap.entries()]
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => {
          if ((a.name === null) !== (b.name === null)) return a.name === null ? 1 : -1
          return b.amount - a.amount
        })
      const amount = subs.reduce((total, s) => total + s.amount, 0)
      return { category, amount, subs }
    })
    .sort((a, b) => b.amount - a.amount)
}

export interface SavingsMonthDatum {
  /** 'MM/YYYY' — the 12-month window spans two years, so the year is kept. */
  month: string
  deposited: number
  withdrawn: number
}

/**
 * Deposits (debit) and withdrawals (credit) per month over the 12 months ending at
 * `today`'s month, oldest first; empty months are 0, rows outside the window ignored.
 */
export function savingsMonthly(transactions: SavingsTransactionResponse[], today: Dayjs): SavingsMonthDatum[] {
  const months: SavingsMonthDatum[] = []
  const index = new Map<string, SavingsMonthDatum>()
  for (let offset = 11; offset >= 0; offset--) {
    const m = today.subtract(offset, 'month')
    const datum = { month: m.format('MM/YYYY'), deposited: 0, withdrawn: 0 }
    months.push(datum)
    index.set(m.format('YYYY-MM'), datum)
  }
  for (const tx of transactions) {
    const datum = index.get(tx.date.slice(0, 7))
    if (!datum) continue
    datum.deposited += tx.debit.amount
    datum.withdrawn += tx.credit.amount
  }
  return months
}
