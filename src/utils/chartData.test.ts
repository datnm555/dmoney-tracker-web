import { describe, expect, it } from 'vitest'
import type { CategoryStat, DailyStat, MonthlyStat } from '../api/types'
import { toBalanceLine, toCategoryPie, toDailyBars, toMonthlyBars } from './chartData'

const vnd = (amount: number) => ({ amount, currency: 'VND' })

const monthly: MonthlyStat[] = [
  { month: '2026-06', totalCredit: vnd(10), totalDebit: vnd(4), balance: vnd(6) },
  { month: '2026-07', totalCredit: vnd(0), totalDebit: vnd(5), balance: vnd(-5) },
]

describe('chartData', () => {
  it('toMonthlyBars interleaves credit/debit per month with given labels', () => {
    const bars = toMonthlyBars(monthly, 'Thu', 'Chi')
    expect(bars).toEqual([
      { month: '2026-06', type: 'Thu', amount: 10 },
      { month: '2026-06', type: 'Chi', amount: 4 },
      { month: '2026-07', type: 'Thu', amount: 0 },
      { month: '2026-07', type: 'Chi', amount: 5 },
    ])
  })

  it('toBalanceLine maps balances including negatives', () => {
    expect(toBalanceLine(monthly)).toEqual([
      { x: '2026-06', amount: 6 },
      { x: '2026-07', amount: -5 },
    ])
  })

  it('toDailyBars maps days to string x values', () => {
    const daily: DailyStat[] = [{ day: 5, debit: vnd(250000) }]
    expect(toDailyBars(daily)).toEqual([{ x: '5', amount: 250000 }])
  })

  it('toCategoryPie localizes labels via t', () => {
    const byCategory: CategoryStat[] = [{ category: 'food', debit: vnd(200000) }]
    const t = (key: string) => `vi:${key}`
    expect(toCategoryPie(byCategory, t)).toEqual([{ label: 'vi:category.food', amount: 200000 }])
  })
})
