import { describe, expect, it } from 'vitest'
import type { AccountResponse, AccountType } from '../api/types'
import {
  availableCredit,
  cashTotal,
  debtTotal,
  isDebtType,
  monthlyInterest,
  upcomingDues,
} from './accounts'

const money = (amount: number) => ({ amount, currency: 'VND' })

function acc(
  type: AccountType,
  balance: number | null,
  extra: Partial<AccountResponse> = {},
  snap: { statementAmount?: number | null; dueDate?: string | null; statementPaid?: boolean } = {},
): AccountResponse {
  return {
    id: Math.random().toString(36).slice(2),
    name: type,
    type,
    lastDigits: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    latestSnapshot:
      balance === null
        ? null
        : {
            id: 's',
            accountId: 'a',
            date: '2026-11-01',
            balance: money(balance),
            statementAmount: snap.statementAmount == null ? null : money(snap.statementAmount),
            dueDate: snap.dueDate ?? null,
            installmentRemaining: null,
            statementPaid: snap.statementPaid ?? false,
            note: null,
          },
    ...extra,
  }
}

describe('isDebtType', () => {
  it('is true for overdraft and credit_card only', () => {
    expect(isDebtType('overdraft')).toBe(true)
    expect(isDebtType('credit_card')).toBe(true)
    expect(isDebtType('checking')).toBe(false)
    expect(isDebtType('ewallet')).toBe(false)
    expect(isDebtType('cash')).toBe(false)
  })
})

describe('cashTotal', () => {
  it('sums checking/ewallet/cash, skips debt and no-snapshot', () => {
    expect(
      cashTotal([
        acc('checking', 100),
        acc('ewallet', 50),
        acc('cash', 25),
        acc('checking', null),
        acc('credit_card', 999),
        acc('overdraft', 999),
      ]),
    ).toBe(175)
  })
})

describe('debtTotal', () => {
  it('sums overdraft + credit_card', () => {
    expect(debtTotal([acc('overdraft', 200), acc('credit_card', 30), acc('checking', 5), acc('credit_card', null)])).toBe(230)
  })
})

describe('availableCredit', () => {
  it('sums max(0, limit - owed), skipping no-limit and no-snapshot', () => {
    expect(
      availableCredit([
        acc('credit_card', 30, { creditLimit: money(100) }),
        acc('overdraft', 50, { creditLimit: money(80) }),
        acc('credit_card', 10),
        acc('credit_card', null, { creditLimit: money(100) }),
      ]),
    ).toBe(100)
  })
  it('clamps over-limit to 0', () => {
    expect(availableCredit([acc('credit_card', 150, { creditLimit: money(100) })])).toBe(0)
  })
})

describe('monthlyInterest', () => {
  it('rounds owed * rate / 100 / 12 for overdraft', () => {
    expect(monthlyInterest(acc('overdraft', 210_300_000, { interestRatePercent: 15 }))).toBe(2_628_750)
  })
  it('is 0 for other types or missing rate', () => {
    expect(monthlyInterest(acc('credit_card', 1000, { interestRatePercent: 15 }))).toBe(0)
    expect(monthlyInterest(acc('overdraft', 1000))).toBe(0)
    expect(monthlyInterest(acc('overdraft', null, { interestRatePercent: 15 }))).toBe(0)
  })
  it('uses Math.round', () => {
    expect(monthlyInterest(acc('overdraft', 1000, { interestRatePercent: 15 }))).toBe(13)
  })
})

describe('upcomingDues', () => {
  const today = '2026-11-10'
  const card = (due: string | null, amount: number | null, paid = false) =>
    acc('credit_card', 500, {}, { statementAmount: amount, dueDate: due, statementPaid: paid })

  it('keeps unpaid positive cards due >= today, sorted, with daysLeft', () => {
    const b = card('2026-11-20', 200)
    const a = card('2026-11-10', 100)
    const res = upcomingDues([b, a], today)
    expect(res.map((r) => r.account)).toEqual([a, b])
    expect(res[0]).toMatchObject({ amount: 100, dueDate: '2026-11-10', daysLeft: 0 })
    expect(res[1]).toMatchObject({ amount: 200, dueDate: '2026-11-20', daysLeft: 10 })
  })
  it('urgent true at 0..3, false at 4', () => {
    const r = upcomingDues(
      [card('2026-11-10', 1), card('2026-11-13', 1), card('2026-11-14', 1)],
      today,
    )
    expect(r.map((x) => x.urgent)).toEqual([true, true, false])
  })
  it('excludes past, paid, zero amount, non-card, missing', () => {
    expect(
      upcomingDues(
        [
          card('2026-11-09', 100),
          card('2026-11-15', 100, true),
          card('2026-11-15', 0),
          card('2026-11-15', null),
          card(null, 100),
          acc('overdraft', 5, {}, { statementAmount: 100, dueDate: '2026-11-15' }),
          acc('credit_card', null),
        ],
        today,
      ),
    ).toEqual([])
  })
})
