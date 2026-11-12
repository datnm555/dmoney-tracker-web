import dayjs from 'dayjs'
import type { AccountResponse, RecurringScheduleItemResponse } from '../api/types'
import { statementRemaining, statementSettled } from './accounts'

export type ScheduleStatus = 'paid' | 'overdue' | 'dueSoon' | 'upcoming'

/** Status of anything due on `dueDate` (YYYY-MM-DD) as of `today`: paid, overdue, due within 3 days, or later. */
export function dueStatus(paid: boolean, dueDate: string, today: string): { status: ScheduleStatus; daysLeft: number } {
  const daysLeft = dayjs(dueDate).diff(dayjs(today), 'day')
  if (paid) return { status: 'paid', daysLeft }
  if (daysLeft < 0) return { status: 'overdue', daysLeft }
  return { status: daysLeft <= 3 ? 'dueSoon' : 'upcoming', daysLeft }
}

export function scheduleStatus(
  row: RecurringScheduleItemResponse,
  today: string,
): { status: ScheduleStatus; daysLeft: number } {
  return dueStatus(!!row.record, row.dueDate, today)
}

export type CardDue = {
  account: AccountResponse
  /** The statement amount. */
  amount: number
  /** Still to pay: the statement minus transfers into the card since its reading. */
  remaining: number
  dueDate: string
  paid: boolean
  untracked: boolean
}

/** Credit-card statements (paid or not) whose latest-snapshot due date falls in `month` (YYYY-MM). */
export function cardDuesInMonth(accounts: AccountResponse[], month: string): CardDue[] {
  const result: CardDue[] = []
  for (const account of accounts) {
    const snap = account.latestSnapshot
    if (account.type !== 'credit_card' || !snap || !snap.dueDate) continue
    if (!snap.dueDate.startsWith(month)) continue
    const amount = snap.statementAmount?.amount ?? 0
    if (amount <= 0) continue
    const paid = statementSettled(account)
    result.push({
      account,
      amount,
      remaining: paid ? 0 : statementRemaining(account),
      dueDate: snap.dueDate,
      paid,
      untracked: snap.statementUntracked,
    })
  }
  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export function scheduleTotals(
  rows: RecurringScheduleItemResponse[],
  cards: CardDue[],
): { total: number; paid: number; remaining: number } {
  let total = 0
  let paid = 0
  for (const r of rows) {
    if (r.record) {
      total += r.record.amount.amount
      paid += r.record.amount.amount
    } else {
      total += r.item.amount.amount
    }
  }
  for (const c of cards) {
    total += c.amount
    paid += c.amount - c.remaining
  }
  return { total, paid, remaining: total - paid }
}
