import { describe, expect, it } from 'vitest'
import type { TransactionResponse } from '../api/types'
import { matchesSearch } from './transactionSearch'

const tx = (content: string, debit: number, note: string | null = null): TransactionResponse => ({
  id: '1',
  date: '2026-07-14',
  content,
  credit: { amount: 0, currency: 'VND' },
  debit: { amount: debit, currency: 'VND' },
  note,
  category: null,
  paymentMethod: 'transfer',
  cardType: null,
  bank: null,
  isAdvance: false,
  advanceTransactionIds: [],
  isPrepaid: false,
  prepaidFrom: null,
  prepaidTo: null,
  prepaidTransactionId: null,
  subCategoryId: null,
  subCategoryName: null,
  reimbursedByTransactionId: null,
  links: null,
})

const none = { content: '', amountFrom: null, amountTo: null, note: '' }

describe('matchesSearch', () => {
  it('matches content ignoring case and diacritics', () => {
    const t = tx('Thanh toán tiền điện', 1_200_000)
    expect(matchesSearch(t, { ...none, content: 'tien dien' })).toBe(true)
    expect(matchesSearch(t, { ...none, content: 'TIỀN ĐIỆN' })).toBe(true)
    expect(matchesSearch(t, { ...none, content: 'nuoc' })).toBe(false)
  })

  it('filters by amount range using the transaction amount', () => {
    const t = tx('Ăn trưa', 50_000)
    expect(matchesSearch(t, { ...none, amountFrom: 10_000, amountTo: 100_000 })).toBe(true)
    expect(matchesSearch(t, { ...none, amountFrom: 60_000, amountTo: null })).toBe(false)
    expect(matchesSearch(t, { ...none, amountFrom: null, amountTo: 40_000 })).toBe(false)
  })

  it('matches note like, treating missing notes as no match', () => {
    expect(matchesSearch(tx('x', 1, 'kỳ 07/2026'), { ...none, note: 'ky 07' })).toBe(true)
    expect(matchesSearch(tx('x', 1, null), { ...none, note: 'ky' })).toBe(false)
  })
})
