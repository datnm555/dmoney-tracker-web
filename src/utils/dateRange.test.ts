import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import {
  currentMonthRange,
  currentYearRange,
  defaultDateForRange,
  lastMonthRange,
  rangeDisplayEnd,
  rangeLabel,
  rangeToPeriod,
} from './dateRange'

const today = dayjs('2026-11-12')

describe('dateRange', () => {
  it('builds month / last month / year presets', () => {
    expect(currentMonthRange(today)).toEqual({ from: '2026-11-01', to: '2026-11-30' })
    expect(lastMonthRange(today)).toEqual({ from: '2026-10-01', to: '2026-10-31' })
    expect(lastMonthRange(dayjs('2026-01-15'))).toEqual({ from: '2025-12-01', to: '2025-12-31' })
    expect(currentYearRange(today)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('keeps the month param for whole months/years and sends from/to otherwise', () => {
    expect(rangeToPeriod({ from: '2026-11-01', to: '2026-11-30' })).toBe('2026-11')
    expect(rangeToPeriod({ from: '2024-02-01', to: '2024-02-29' })).toBe('2024-02')
    expect(rangeToPeriod({ from: '2026-01-01', to: '2026-12-31' })).toBe('2026')
    expect(rangeToPeriod({ from: '2026-11-05', to: '2026-11-20' })).toEqual({ from: '2026-11-05', to: '2026-11-20' })
    // Not a whole month: stops a day early, or crosses months.
    expect(rangeToPeriod({ from: '2026-11-01', to: '2026-11-29' })).toEqual({ from: '2026-11-01', to: '2026-11-29' })
    expect(rangeToPeriod({ from: '2026-10-01', to: '2026-11-30' })).toEqual({ from: '2026-10-01', to: '2026-11-30' })
  })

  it('labels exports by period', () => {
    expect(rangeLabel({ from: '2026-11-01', to: '2026-11-30' })).toBe('2026-11')
    expect(rangeLabel({ from: '2026-11-05', to: '2026-11-20' })).toBe('2026-11-05_2026-11-20')
  })

  it('caps a whole current month/year at today, but shows a picked range as is', () => {
    expect(rangeDisplayEnd(currentMonthRange(today), today).format('YYYY-MM-DD')).toBe('2026-11-12')
    expect(rangeDisplayEnd(currentYearRange(today), today).format('YYYY-MM-DD')).toBe('2026-11-12')
    expect(rangeDisplayEnd(lastMonthRange(today), today).format('YYYY-MM-DD')).toBe('2026-10-31')
    expect(rangeDisplayEnd({ from: '2026-11-05', to: '2026-11-20' }, today).format('YYYY-MM-DD')).toBe('2026-11-20')
  })

  it('defaults new records to today inside the range, else its first day', () => {
    expect(defaultDateForRange(currentMonthRange(today), today)).toBe('2026-11-12')
    expect(defaultDateForRange({ from: '2026-11-05', to: '2026-11-10' }, today)).toBe('2026-11-05')
    expect(defaultDateForRange(lastMonthRange(today), today)).toBe('2026-10-01')
  })
})
