import { describe, expect, it } from 'vitest'
import type { AccountResponse, SubCategoryResponse } from '../api/types'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { cardPaymentPrefill, splitOldDebt, untrackedDebtLeft } from './cardPayment'

const vnd = (amount: number) => ({ amount, currency: 'VND' })

const card = (untrackedDebt: number | null, remaining: number | null): AccountResponse => ({
  id: 'card', name: 'Thẻ tín dụng Diamond', type: 'credit_card', lastDigits: null, creditLimit: vnd(50_000_000),
  statementDay: null, dueDay: 11, interestRatePercent: null, latestSnapshot: null, bankName: 'VPBank', isDefault: false,
  currentBalance: vnd(8_489_419), transactionsSinceSnapshot: 0, statementPaidAmount: vnd(0),
  untrackedDebt: untrackedDebt === null ? null : vnd(untrackedDebt),
  untrackedDebtRemaining: remaining === null ? null : vnd(remaining),
})

const sub = (id: string, categoryId: string, code: string | null): SubCategoryResponse => ({
  id, categoryId, name: id, isDefault: false, icon: null, code, excludeFromStats: code === 'account_transfer',
})

const subs = [sub('tra-the', 'no', 'card_payment'), sub('chuyen', 'noi-bo', 'account_transfer'), sub('an', 'an-uong', null)]

const payment = (amount: number, subCategoryId = 'chuyen'): TransactionFormValues => ({
  date: '2026-12-11', content: 'Trả thẻ Thẻ tín dụng Diamond', type: 'out', amount, categoryId: 'noi-bo',
  paymentMethod: 'transfer', cardType: null, bank: 'VPBank', isAdvance: false, advanceTransactionIds: [],
  isPrepaid: false, prepaidFrom: null, prepaidTo: null, prepaidTransactionId: null, subCategoryId,
  reimbursedByTransactionId: null, note: null, planId: null, beneficiaryId: null, goldTypeId: null,
  goldQuantity: null, purchasePlaceId: null, savingsBank: null, payWithAccountId: 'od', transferToAccountId: 'card',
})

describe('splitOldDebt', () => {
  it('files a payment the old debt covers as card payment (counted)', () => {
    const out = splitOldDebt(payment(5_000_000), card(8_489_419, 8_489_419), subs, 'nợ cũ')
    expect(out).toMatchObject({ amount: 5_000_000, categoryId: 'no', subCategoryId: 'tra-the', oldDebtPart: null })
  })

  it('splits a larger payment: old debt counted, the rest a transfer', () => {
    const out = splitOldDebt(payment(8_621_419, 'tra-the'), card(8_489_419, 8_489_419), subs, 'nợ cũ')
    expect(out).toMatchObject({ amount: 132_000, categoryId: 'noi-bo', subCategoryId: 'chuyen' })
    expect(out.oldDebtPart).toEqual({
      amount: 8_489_419, content: 'Trả thẻ Thẻ tín dụng Diamond (nợ cũ)', categoryId: 'no', subCategoryId: 'tra-the',
    })
  })

  it('leaves the payment alone once the old debt is paid off, or without one', () => {
    expect(splitOldDebt(payment(1_000), card(8_489_419, 0), subs, 'x')).toMatchObject({ subCategoryId: 'chuyen', oldDebtPart: null })
    expect(splitOldDebt(payment(1_000), card(null, null), subs, 'x')).toMatchObject({ subCategoryId: 'chuyen', oldDebtPart: null })
  })

  it('keeps a category the user picked by hand', () => {
    const own = { ...payment(1_000, 'an'), categoryId: 'an-uong' }
    expect(splitOldDebt(own, card(5_000, 5_000), subs, 'x')).toMatchObject({ amount: 1_000, subCategoryId: 'an', oldDebtPart: null })
  })

  it('only applies to money paid into a card', () => {
    expect(untrackedDebtLeft(undefined)).toBe(0)
    expect(untrackedDebtLeft({ ...card(5_000, 5_000), type: 'overdraft' })).toBe(0)
    expect(splitOldDebt(payment(1_000), undefined, subs, 'x').oldDebtPart).toBeNull()
  })
})

describe('cardPaymentPrefill', () => {
  it('follows the old debt when one is stated, else the statement flag', () => {
    const code = (c: AccountResponse, untracked: boolean) => cardPaymentPrefill(c, 1, untracked, 'Trả thẻ', '2026-12-11').subCategoryCode
    expect(code(card(8_000, 8_000), false)).toBe('card_payment')
    expect(code(card(8_000, 0), true)).toBe('account_transfer')
    expect(code(card(null, null), true)).toBe('card_payment')
    expect(code(card(null, null), false)).toBe('account_transfer')
  })
})
