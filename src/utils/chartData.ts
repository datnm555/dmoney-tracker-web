import type { CategoryStat, DailyStat, MonthlyStat } from '../api/types'

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

export interface PieDatum {
  label: string
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

export function toCategoryPie(
  byCategory: CategoryStat[],
  t: (key: string) => string,
): PieDatum[] {
  return byCategory.map((c) => ({ label: t(`category.${c.category}`), amount: c.debit.amount }))
}

export interface CategorySpendingDatum {
  category: string
  amount: number
}

/** Aggregates debit totals per category (uncategorised rows land in "other"), largest first. */
export function toCategorySpending(
  items: { category: string | null; debit: { amount: number } }[],
): CategorySpendingDatum[] {
  const byCategory = new Map<string, number>()
  for (const item of items) {
    if (item.debit.amount <= 0) continue
    const key = item.category ?? 'other'
    byCategory.set(key, (byCategory.get(key) ?? 0) + item.debit.amount)
  }
  return [...byCategory.entries()]
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)
}
