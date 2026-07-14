import { describe, expect, it } from 'vitest'
import type { DailyStat, MonthlyStat } from '../api/types'
import { toBalanceLine, toCategorySpending, toDailyBars, toIncomeExpenseBars, toMonthlyBars } from './chartData'

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

  it('toIncomeExpenseBars maps monthly stats to T-labelled income/expense rows', () => {
    expect(toIncomeExpenseBars(monthly)).toEqual([
      { month: 'T6', income: 10, expense: 4 },
      { month: 'T7', income: 0, expense: 5 },
    ])
  })

  it('toCategorySpending sums debits per category, null in its own bucket, sorted desc', () => {
    const items = [
      { categoryId: 'cat-bills', debit: { amount: 1_200_000 } },
      { categoryId: 'cat-bills', debit: { amount: 300_000 } },
      { categoryId: null, debit: { amount: 50_000 } },
      { categoryId: 'cat-food', debit: { amount: 2_000_000 } },
      { categoryId: 'cat-salary', debit: { amount: 0 } },
    ]
    expect(toCategorySpending(items)).toEqual([
      { category: 'cat-food', amount: 2_000_000, subs: [{ name: null, amount: 2_000_000 }] },
      { category: 'cat-bills', amount: 1_500_000, subs: [{ name: null, amount: 1_500_000 }] },
      { category: 'uncategorized', amount: 50_000, subs: [{ name: null, amount: 50_000 }] },
    ])
  })

  it('toCategorySpending breaks each category down by sub-category, unnamed rows last', () => {
    const items = [
      { categoryId: 'cat-bills', debit: { amount: 400_000 }, subCategoryName: 'Điện' },
      { categoryId: 'cat-bills', debit: { amount: 900_000 }, subCategoryName: 'Nước' },
      { categoryId: 'cat-bills', debit: { amount: 100_000 }, subCategoryName: 'Điện' },
      { categoryId: 'cat-bills', debit: { amount: 250_000 }, subCategoryName: null },
    ]
    expect(toCategorySpending(items)).toEqual([
      {
        category: 'cat-bills',
        amount: 1_650_000,
        subs: [
          { name: 'Nước', amount: 900_000 },
          { name: 'Điện', amount: 500_000 },
          { name: null, amount: 250_000 },
        ],
      },
    ])
  })
})
