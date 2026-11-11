import dayjs from 'dayjs'
import type { AccountResponse, RecurringScheduleItemResponse } from '../api/types'

export type ScheduleStatus = 'paid' | 'overdue' | 'dueSoon' | 'upcoming'

export function scheduleStatus(
  row: RecurringScheduleItemResponse,
  today: string,
): { status: ScheduleStatus; daysLeft: number } {
  const daysLeft = dayjs(row.dueDate).diff(dayjs(today), 'day')
  if (row.record) return { status: 'paid', daysLeft }
  if (daysLeft < 0) return { status: 'overdue', daysLeft }
  return { status: daysLeft <= 3 ? 'dueSoon' : 'upcoming', daysLeft }
}

export type CardDue = { account: AccountResponse; amount: number; dueDate: string; paid: boolean; untracked: boolean }

/** Credit-card statements (paid or not) whose latest-snapshot due date falls in `month` (YYYY-MM). */
export function cardDuesInMonth(accounts: AccountResponse[], month: string): CardDue[] {
  const result: CardDue[] = []
  for (const account of accounts) {
    const snap = account.latestSnapshot
    if (account.type !== 'credit_card' || !snap || !snap.dueDate) continue
    if (!snap.dueDate.startsWith(month)) continue
    const amount = snap.statementAmount?.amount ?? 0
    if (amount <= 0) continue
    result.push({ account, amount, dueDate: snap.dueDate, paid: snap.statementPaid, untracked: snap.statementUntracked })
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
    if (c.paid) paid += c.amount
  }
  return { total, paid, remaining: total - paid }
}
