import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { dailySpending } from './dailySpending'

const vnd = (amount: number) => ({ amount, currency: 'VND' })
const row = (date: string, debit: number, credit = 0, excludedFromStats = false) => ({
  date,
  debit: vnd(debit),
  credit: vnd(credit),
  excludedFromStats,
})

describe('dailySpending', () => {
  it('covers every day of the range, zero days included', () => {
    const days = dailySpending([row('2026-11-02', 50_000)], '2026-11-01', '2026-11-04')
    expect(days).toEqual([
      { date: '2026-11-01', amount: 0 },
      { date: '2026-11-02', amount: 50_000 },
      { date: '2026-11-03', amount: 0 },
      { date: '2026-11-04', amount: 0 },
    ])
  })

  it('sums several debits on the same day', () => {
    const days = dailySpending([row('2026-11-01', 10), row('2026-11-01', 25)], '2026-11-01', '2026-11-01')
    expect(days).toEqual([{ date: '2026-11-01', amount: 35 }])
  })

  it('skips rows flagged excludedFromStats', () => {
    const days = dailySpending(
      [row('2026-11-01', 100, 0, true), row('2026-11-01', 7)],
      '2026-11-01',
      '2026-11-01',
    )
    expect(days).toEqual([{ date: '2026-11-01', amount: 7 }])
  })

  it('ignores credits (income never counts as spending)', () => {
    const days = dailySpending([row('2026-11-01', 0, 900), row('2026-11-02', 5, 900)], '2026-11-01', '2026-11-02')
    expect(days).toEqual([
      { date: '2026-11-01', amount: 0 },
      { date: '2026-11-02', amount: 5 },
    ])
  })

  it('includes both range boundaries and drops rows outside them', () => {
    const days = dailySpending(
      [row('2026-10-31', 1), row('2026-11-01', 2), row('2026-11-03', 3), row('2026-11-04', 4)],
      dayjs('2026-11-01'),
      dayjs('2026-11-03').endOf('day'),
    )
    expect(days).toEqual([
      { date: '2026-11-01', amount: 2 },
      { date: '2026-11-02', amount: 0 },
      { date: '2026-11-03', amount: 3 },
    ])
  })

  it('spans month boundaries for arbitrary ranges', () => {
    const days = dailySpending([row('2026-12-01', 9)], '2026-11-29', '2026-12-02')
    expect(days.map((d) => d.date)).toEqual(['2026-11-29', '2026-11-30', '2026-12-01', '2026-12-02'])
    expect(days[2].amount).toBe(9)
  })

  it('returns an empty list when the range is inverted', () => {
    expect(dailySpending([row('2026-11-01', 1)], '2026-11-05', '2026-11-01')).toEqual([])
  })
})
