import { describe, expect, it } from 'vitest'
import type { AccountResponse, AccountSnapshotResponse, CategoryResponse } from '../api/types'
import { adjustmentValues, balanceAdjustment, otherCategory } from './balanceAdjustment'
import { toTransactionPayload } from './transactionPayload'

function snapshot(date: string): AccountSnapshotResponse {
  return { date } as AccountSnapshotResponse
}

function account(over: Partial<AccountResponse>): AccountResponse {
  return {
    id: 'momo',
    name: 'Ví Momo',
    type: 'ewallet',
    lastDigits: '0555',
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    latestSnapshot: snapshot('2026-11-01'),
    bankName: 'MoMo',
    isDefault: false,
    currentBalance: { amount: 400_000, currency: 'VND' },
    transactionsSinceSnapshot: 0,
    statementPaidAmount: { amount: 0, currency: 'VND' },
    untrackedDebt: null,
    untrackedDebtRemaining: null,
    ...over,
  }
}

function category(id: string, code: string | null, kind: string): CategoryResponse {
  return { id, name: id, icon: '', code, kind, excludeFromStats: false }
}

describe('balanceAdjustment', () => {
  it('reads a lower balance as spending of the difference', () => {
    expect(balanceAdjustment(account({}), 80_000, '2026-11-26')).toEqual({ kind: 'spend', amount: 320_000 })
  })

  it('reads a higher balance as unrecorded income', () => {
    expect(balanceAdjustment(account({}), 500_000, '2026-11-26')).toEqual({ kind: 'income', amount: 100_000 })
  })

  it('compares with the current book balance, not the latest reading', () => {
    // Latest reading 400k, then 50k of recorded spending: the book says 350k.
    const a = account({ currentBalance: { amount: 350_000, currency: 'VND' } })
    expect(balanceAdjustment(a, 100_000, '2026-11-26')).toEqual({ kind: 'spend', amount: 250_000 })
  })

  it('is none when the balance matches the book', () => {
    expect(balanceAdjustment(account({}), 400_000, '2026-11-26')).toEqual({ kind: 'none' })
  })

  it('applies to bank accounts too', () => {
    expect(balanceAdjustment(account({ type: 'checking' }), 100_000, '2026-11-26').kind).toBe('spend')
  })

  it('skips cash, cards and overdrafts', () => {
    for (const type of ['cash', 'credit_card', 'overdraft'] as const) {
      expect(balanceAdjustment(account({ type }), 100_000, '2026-11-26')).toEqual({ kind: 'none' })
    }
  })

  it('skips the first reading (nothing to compare with)', () => {
    expect(balanceAdjustment(account({ latestSnapshot: null }), 100_000, '2026-11-26')).toEqual({ kind: 'none' })
  })

  it('skips a reading dated before the latest one', () => {
    expect(balanceAdjustment(account({}), 100_000, '2026-10-31')).toEqual({ kind: 'none' })
  })

  it('compares a reading on the same day as the latest one', () => {
    expect(balanceAdjustment(account({}), 100_000, '2026-11-01').kind).toBe('spend')
  })
})

describe('otherCategory', () => {
  const cats = [
    category('food', 'food', 'expense'),
    category('other-in', 'other', 'income'),
    category('other-out', 'other', 'expense'),
    category('mine', null, 'expense'),
  ]

  it('picks the "Khác" category matching the direction', () => {
    expect(otherCategory(cats, 'expense')?.id).toBe('other-out')
    expect(otherCategory(cats, 'income')?.id).toBe('other-in')
  })

  it('falls back to a "both" Khác, then any Khác, then null', () => {
    expect(otherCategory([category('o', 'other', 'both')], 'expense')?.id).toBe('o')
    expect(otherCategory([category('o', 'other', 'income')], 'expense')?.id).toBe('o')
    expect(otherCategory([category('food', 'food', 'expense')], 'expense')).toBeNull()
  })
})

describe('adjustmentValues', () => {
  it('builds a spending row paid with the wallet', () => {
    const v = adjustmentValues(account({}), 'out', 320_000, '2026-11-26', 'Chênh lệch số dư Ví Momo', 'other-out')
    const p = toTransactionPayload(v, 'plan-1')
    expect(p).toMatchObject({
      date: '2026-11-26',
      content: 'Chênh lệch số dư Ví Momo',
      debitAmount: 320_000,
      creditAmount: 0,
      categoryId: 'other-out',
      paymentMethod: 'transfer',
      bank: 'MoMo',
      accountId: 'momo',
      planId: 'plan-1',
    })
  })
})
