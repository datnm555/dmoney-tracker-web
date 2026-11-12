import { describe, expect, it } from 'vitest'
import type { AccountResponse, AccountType } from '../api/types'
import {
  closeMonthNet,
  availableCredit,
  cashTotal,
  debtTotal,
  groupByBank,
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
    bankName: null,
    isDefault: false,
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
            statementUntracked: false,
          },
    currentBalance: money(balance ?? 0),
    transactionsSinceSnapshot: 0, statementPaidAmount: { amount: 0, currency: 'VND' },
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

  it('keeps unpaid positive cards, sorted, with daysLeft', () => {
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
  it('lists an overdue unpaid card as urgent with negative daysLeft', () => {
    const r = upcomingDues([card('2026-11-09', 100)], today)
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ daysLeft: -1, urgent: true })
  })
  it('excludes paid, zero amount, non-card, missing', () => {
    expect(
      upcomingDues(
        [
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

describe('groupByBank', () => {
  const bank = (type: AccountType, balance: number | null, bankName: string | null, name: string) =>
    acc(type, balance, { bankName, name })

  it('puts every account type under its bank, splitting money and debt', () => {
    const groups = groupByBank([
      bank('credit_card', 8_000_000, 'VPBank', 'Diamond'),
      bank('checking', 1_000_000, 'VPBank', 'Lương'),
      bank('overdraft', 144_000_000, 'VPBank', 'Thấu chi'),
      bank('checking', 3_000_000, 'Vietcombank', 'VCB'),
    ])
    expect(groups.map((g) => [g.bankName, g.money, g.debt])).toEqual([
      ['VPBank', 1_000_000, 152_000_000],
      ['Vietcombank', 3_000_000, 0],
    ])
    // Inside a bank: payment accounts, then overdraft, then cards.
    expect(groups[0].accounts.map((a) => a.name)).toEqual(['Lương', 'Thấu chi', 'Diamond'])
  })

  it('sorts banks by money + debt desc then name, with the null bank last even when largest', () => {
    const groups = groupByBank([
      bank('cash', 99_000_000, null, 'Cash'),
      bank('checking', 1_000_000, 'Zeta', 'Z'),
      bank('credit_card', 1_000_000, 'Alpha', 'A'),
      bank('checking', 5_000_000, 'Mid', 'M'),
    ])
    expect(groups.map((g) => g.bankName)).toEqual(['Mid', 'Alpha', 'Zeta', null])
  })

  it('lists accounts without a snapshot but counts them as 0', () => {
    const groups = groupByBank([bank('checking', null, 'VPBank', 'A'), bank('checking', 7, 'VPBank', 'B')])
    expect(groups).toHaveLength(1)
    expect(groups[0].money).toBe(7)
    expect(groups[0].accounts).toHaveLength(2)
  })

  it('returns nothing for no accounts', () => {
    expect(groupByBank([])).toEqual([])
  })
})

describe('closeMonthNet', () => {
  it('is opening + money added − closing', () => {
    expect(closeMonthNet(474_218, 2_000_000, 300_000)).toBe(2_174_218)
  })
  it('is negative when more came in than went out', () => {
    expect(closeMonthNet(1_000_000, 0, 1_500_000)).toBe(-500_000)
  })
  it('is zero when nothing changed', () => {
    expect(closeMonthNet(1_000_000, 0, 1_000_000)).toBe(0)
  })
})
