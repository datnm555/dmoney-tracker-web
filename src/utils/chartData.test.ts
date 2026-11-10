import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import type { DailyStat, GoldTransactionResponse, MonthlyStat, SavingsTransactionResponse } from '../api/types'
import {
  goldMonthly,
  savingsMonthly,
  toBalanceLine,
  toCategorySpending,
  toDailyBars,
  toIncomeExpenseBars,
  toMonthlyBars,
} from './chartData'

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

describe('savingsMonthly', () => {
  const tx = (date: string, debit: number, credit: number): SavingsTransactionResponse => ({
    transactionId: `${date}-${debit}-${credit}`,
    date,
    content: 'x',
    savingsBank: null,
    bank: null,
    credit: vnd(credit),
    debit: vnd(debit),
    planId: 'p-1',
    subCategoryName: null,
    note: null,
  })
  const today = dayjs('2026-10-11')

  it('returns 12 zeroed months oldest→newest ending at the current month when empty', () => {
    const months = savingsMonthly([], today)
    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ month: '11/2025', deposited: 0, withdrawn: 0 })
    expect(months[11]).toEqual({ month: '10/2026', deposited: 0, withdrawn: 0 })
    expect(months.map((m) => m.month)).toContain('01/2026')
  })

  it('sums deposits (debit) and withdrawals (credit) per month', () => {
    const months = savingsMonthly(
      [
        tx('2026-10-05', 20_000_000, 0),
        tx('2026-10-01', 1_000_000, 0),
        tx('2026-10-04', 0, 5_000_000),
        tx('2026-03-31', 0, 2_000_000),
        tx('2025-11-01', 7_000_000, 0),
      ],
      today,
    )
    const byMonth = Object.fromEntries(months.map((m) => [m.month, m]))
    expect(byMonth['10/2026']).toEqual({ month: '10/2026', deposited: 21_000_000, withdrawn: 5_000_000 })
    expect(byMonth['03/2026']).toEqual({ month: '03/2026', deposited: 0, withdrawn: 2_000_000 })
    expect(byMonth['11/2025']).toEqual({ month: '11/2025', deposited: 7_000_000, withdrawn: 0 })
    expect(byMonth['09/2026']).toEqual({ month: '09/2026', deposited: 0, withdrawn: 0 })
  })

  it('ignores rows older than 12 months and rows after the current month', () => {
    const months = savingsMonthly(
      [tx('2025-10-31', 9_000_000, 0), tx('2024-10-05', 1, 1), tx('2026-11-01', 3, 3)],
      today,
    )
    expect(months.every((m) => m.deposited === 0 && m.withdrawn === 0)).toBe(true)
  })
})

describe('goldMonthly', () => {
  const tx = (date: string, quantity: number, debit: number, credit: number): GoldTransactionResponse => ({
    transactionId: `${date}-${quantity}-${debit}-${credit}`,
    date,
    content: 'x',
    goldTypeId: 'g-1',
    goldTypeName: 'SJC',
    goldQuantity: quantity,
    credit: vnd(credit),
    debit: vnd(debit),
    pricePerChi: vnd(0),
    purchasePlaceId: null,
    purchasePlaceName: null,
  })
  const today = dayjs('2026-10-11')

  it('returns 12 zeroed months oldest→newest ending at the current month', () => {
    const months = goldMonthly([], today)
    expect(months).toHaveLength(12)
    expect(months[0]).toEqual({ month: '11/2025', bought: 0, sold: 0, spent: 0, received: 0 })
    expect(months[11].month).toBe('10/2026')
  })

  it('sums chỉ and money per month: debit = buy, credit = sell', () => {
    const months = goldMonthly(
      [
        tx('2026-10-01', 1, 8_000_000, 0),
        tx('2026-10-20', 0.5, 4_100_000, 0),
        tx('2026-10-05', 0.3, 0, 2_500_000),
        tx('2026-08-02', 2, 15_000_000, 0),
      ],
      today,
    )
    expect(months[11]).toEqual({ month: '10/2026', bought: 1.5, sold: 0.3, spent: 12_100_000, received: 2_500_000 })
    expect(months[9]).toEqual({ month: '08/2026', bought: 2, sold: 0, spent: 15_000_000, received: 0 })
  })

  it('ignores rows older than 12 months or after the current month', () => {
    const months = goldMonthly([tx('2025-10-31', 1, 1, 0), tx('2026-11-01', 1, 1, 0)], today)
    expect(months.every((m) => m.bought === 0 && m.sold === 0)).toBe(true)
  })

  it('does not accumulate float noise on decimal quantities', () => {
    const months = goldMonthly([tx('2026-10-01', 0.1, 1, 0), tx('2026-10-02', 0.2, 1, 0)], today)
    expect(months[11].bought).toBe(0.3)
  })
})
