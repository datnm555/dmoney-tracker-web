import { describe, expect, it } from 'vitest'
import type { TransactionResponse } from '../api/types'
import { applyTransactionFilters, countActiveFilters, defaultTransactionFilters } from './transactionFilters'

const tx = (overrides: Partial<TransactionResponse>) =>
  ({
    id: 'tx',
    date: '2026-11-05',
    content: '',
    credit: { amount: 0, currency: 'VND' },
    debit: { amount: 0, currency: 'VND' },
    note: null,
    categoryId: null,
    subCategoryId: null,
    beneficiaryId: null,
    isAdvance: false,
    ...overrides,
  }) as TransactionResponse

describe('transactionFilters', () => {
  it('account filter keeps rows paid with the account or into it', () => {
    const items = [
      tx({ id: 'paid', accountId: 'a1', toAccountId: null }),
      tx({ id: 'into', accountId: 'a2', toAccountId: 'a1' }),
      tx({ id: 'other', accountId: 'a2', toAccountId: null }),
    ]
    const f = { ...defaultTransactionFilters(), account: 'a1' }
    expect(applyTransactionFilters(items, f).map((t) => t.id)).toEqual(['paid', 'into'])
    expect(countActiveFilters(f)).toBe(1)
  })

  it('defaults to the current month with nothing narrowing', () => {
    const f = defaultTransactionFilters()
    expect(countActiveFilters(f)).toBe(0)
    expect(f.range.from.endsWith('-01')).toBe(true)
  })

  it('counts narrowing filters but never the date range', () => {
    const f = { ...defaultTransactionFilters(), range: { from: '2026-11-05', to: '2026-11-20' } }
    expect(countActiveFilters(f)).toBe(0)
    expect(countActiveFilters({ ...f, type: 'out', content: 'x', beneficiary: 'none' })).toBe(3)
  })

  it('applies type, category/sub, beneficiary and search', () => {
    const rows = [
      tx({ id: 'in', credit: { amount: 100, currency: 'VND' }, categoryId: 'c1' }),
      tx({ id: 'out', debit: { amount: 50, currency: 'VND' }, categoryId: 'c1', subCategoryId: 's1', beneficiaryId: 'b1' }),
      tx({ id: 'other', debit: { amount: 70, currency: 'VND' }, content: 'Tiền điện' }),
    ]
    const base = defaultTransactionFilters()
    const ids = (f: typeof base) => applyTransactionFilters(rows, f).map((r) => r.id)

    expect(ids(base)).toEqual(['in', 'out', 'other'])
    expect(ids({ ...base, type: 'out' })).toEqual(['out', 'other'])
    expect(ids({ ...base, category: 'c1', subCategory: 's1' })).toEqual(['out'])
    expect(ids({ ...base, beneficiary: 'none' })).toEqual(['in', 'other'])
    expect(ids({ ...base, content: 'tien dien' })).toEqual(['other'])
    expect(ids({ ...base, amountFromDigits: '60' })).toEqual(['in', 'other'])
  })
})
