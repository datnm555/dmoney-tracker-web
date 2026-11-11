import { describe, expect, it } from 'vitest'
import type { AccountResponse, AccountType, RecurringScheduleItemResponse } from '../api/types'
import { cardDuesInMonth, scheduleStatus, scheduleTotals } from './recurring'

const money = (amount: number) => ({ amount, currency: 'VND' })

function row(
  dueDate: string,
  opts: { amount?: number; isVariable?: boolean; paid?: number | null } = {},
): RecurringScheduleItemResponse {
  return {
    item: {
      id: 'r1',
      name: 'Netflix',
      categoryId: null,
      subCategoryId: null,
      amount: money(opts.amount ?? 0),
      isVariable: opts.isVariable ?? false,
      dayOfMonth: 15,
      paymentMethod: null,
      bank: null,
      note: null,
      isActive: true,
      startPeriod: null,
      savingsBank: null,
    },
    dueDate,
    record:
      opts.paid == null
        ? null
        : { id: 'rec', recurringPaymentId: 'r1', period: '2026-11', amount: money(opts.paid), paidDate: dueDate, transactionId: null },
  }
}

function card(
  type: AccountType,
  snap: { dueDate?: string | null; amount?: number | null; paid?: boolean } | null,
): AccountResponse {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'c',
    type,
    lastDigits: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    bankName: null,
    latestSnapshot:
      snap === null
        ? null
        : {
            id: 's',
            accountId: 'a',
            date: '2026-11-01',
            balance: money(0),
            statementAmount: snap.amount == null ? null : money(snap.amount),
            dueDate: snap.dueDate ?? null,
            installmentRemaining: null,
            statementPaid: snap.paid ?? false,
            note: null,
          },
  } as AccountResponse
}

describe('scheduleStatus', () => {
  it('is paid when a record exists', () => {
    expect(scheduleStatus(row('2026-11-05', { paid: 100 }), '2026-11-10').status).toBe('paid')
  })
  it('computes daysLeft and dueSoon/upcoming/overdue boundaries', () => {
    expect(scheduleStatus(row('2026-11-10'), '2026-11-10')).toEqual({ status: 'dueSoon', daysLeft: 0 })
    expect(scheduleStatus(row('2026-11-13'), '2026-11-10')).toEqual({ status: 'dueSoon', daysLeft: 3 })
    expect(scheduleStatus(row('2026-11-14'), '2026-11-10')).toEqual({ status: 'upcoming', daysLeft: 4 })
    expect(scheduleStatus(row('2026-11-09'), '2026-11-10')).toEqual({ status: 'overdue', daysLeft: -1 })
  })
})

describe('cardDuesInMonth', () => {
  it('includes paid and unpaid cards due in the month with amount > 0', () => {
    const a = card('credit_card', { dueDate: '2026-11-20', amount: 500 })
    const b = card('credit_card', { dueDate: '2026-11-05', amount: 300, paid: true })
    const result = cardDuesInMonth([a, b], '2026-11')
    expect(result).toEqual([
      { account: b, amount: 300, dueDate: '2026-11-05', paid: true },
      { account: a, amount: 500, dueDate: '2026-11-20', paid: false },
    ])
  })
  it('excludes other months, no snapshot, zero amount and non-card', () => {
    const list = [
      card('credit_card', { dueDate: '2026-12-01', amount: 500 }),
      card('credit_card', null),
      card('credit_card', { dueDate: '2026-11-20', amount: 0 }),
      card('credit_card', { dueDate: null, amount: 500 }),
      card('overdraft', { dueDate: '2026-11-20', amount: 500 }),
    ]
    expect(cardDuesInMonth(list, '2026-11')).toEqual([])
  })
})

describe('scheduleTotals', () => {
  it('sums rows and cards', () => {
    const rows = [
      row('2026-11-05', { amount: 100, paid: 120 }), // paid -> record amount
      row('2026-11-15', { amount: 200 }), // unpaid fixed
      row('2026-11-16', { amount: 0, isVariable: true }), // unpaid variable 0
    ]
    const cards = cardDuesInMonth(
      [
        card('credit_card', { dueDate: '2026-11-20', amount: 500 }),
        card('credit_card', { dueDate: '2026-11-05', amount: 300, paid: true }),
      ],
      '2026-11',
    )
    expect(scheduleTotals(rows, cards)).toEqual({ total: 1120, paid: 420, remaining: 700 })
  })
})
