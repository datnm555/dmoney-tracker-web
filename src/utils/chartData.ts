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
