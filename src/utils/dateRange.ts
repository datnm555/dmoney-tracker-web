import dayjs, { type Dayjs } from 'dayjs'
import type { DayRange } from '../api/types'

export type { DayRange }

/** Backend limit for ?from=&to= (Transactions.DateRangeTooLong beyond it). */
export const MAX_RANGE_DAYS = 366

const DAY = 'YYYY-MM-DD'

export function monthRange(month: Dayjs): DayRange {
  return { from: month.startOf('month').format(DAY), to: month.endOf('month').format(DAY) }
}

export const currentMonthRange = (today: Dayjs = dayjs()): DayRange => monthRange(today)
export const lastMonthRange = (today: Dayjs = dayjs()): DayRange => monthRange(today.subtract(1, 'month'))
export const currentYearRange = (today: Dayjs = dayjs()): DayRange => ({
  from: today.startOf('year').format(DAY),
  to: today.endOf('year').format(DAY),
})

/**
 * Period sent to GET /transactions: a whole calendar month/year keeps the original
 * `month` param ('YYYY-MM' / 'YYYY'); any other range goes out as `{ from, to }`.
 */
export function rangeToPeriod(range: DayRange): string | DayRange {
  const from = dayjs(range.from)
  const to = dayjs(range.to)
  if (from.date() === 1 && from.isSame(to, 'month') && to.isSame(to.endOf('month'), 'day')) {
    return from.format('YYYY-MM')
  }
  if (from.isSame(from.startOf('year'), 'day') && from.isSame(to, 'year') && to.isSame(to.endOf('year'), 'day')) {
    return from.format('YYYY')
  }
  return range
}

/** File/sheet-safe label for the Excel export: '2026-11', '2026' or '2026-11-05_2026-11-20'. */
export function rangeLabel(range: DayRange): string {
  const period = rangeToPeriod(range)
  return typeof period === 'string' ? period : `${period.from}_${period.to}`
}

/**
 * Header end date. A whole month/year that runs past today reads "→ today" (data so far), as the
 * month view did; a hand-picked day range always shows its own end.
 */
export function rangeDisplayEnd(range: DayRange, today: Dayjs = dayjs()): Dayjs {
  const from = dayjs(range.from)
  const to = dayjs(range.to)
  const wholePeriod = typeof rangeToPeriod(range) === 'string'
  return wholePeriod && !from.isAfter(today, 'day') && to.isAfter(today, 'day') ? today : to
}

/** New records default to today when it falls inside the range, else the range's first day. */
export function defaultDateForRange(range: DayRange, today: Dayjs = dayjs()): string {
  const day = today.format(DAY)
  return day >= range.from && day <= range.to ? day : range.from
}
