import { describe, expect, it } from 'vitest'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { toTransactionPayloads, toTransactionPayload } from './transactionPayload'

const values: TransactionFormValues = {
  date: '2026-11-10',
  content: 'Netflix',
  type: 'out',
  amount: 260000,
  categoryId: 'cat',
  paymentMethod: 'card',
  cardType: 'debit',
  bank: 'Techcombank',
  isAdvance: false,
  advanceTransactionIds: ['a1'],
  isPrepaid: true,
  prepaidFrom: '2026-11-01',
  prepaidTo: '2026-11-30',
  prepaidTransactionId: 'pt',
  subCategoryId: 'sub',
  reimbursedByTransactionId: 'rb',
  note: 'n',
  planId: null,
  beneficiaryId: 'ben',
  goldTypeId: 'g',
  goldQuantity: 1.5,
  purchasePlaceId: 'pp',
  savingsBank: 'sb',
}

describe('toTransactionPayload', () => {
  it('maps out to debitAmount and falls back to the given plan', () => {
    expect(toTransactionPayload(values, 'plan-1')).toEqual({
      date: '2026-11-10',
      content: 'Netflix',
      creditAmount: 0,
      debitAmount: 260000,
      note: 'n',
      categoryId: 'cat',
      paymentMethod: 'card',
      cardType: 'debit',
      bank: 'Techcombank',
      isAdvance: false,
      advanceTransactionIds: ['a1'],
      isPrepaid: true,
      prepaidFrom: '2026-11-01',
      prepaidTo: '2026-11-30',
      prepaidTransactionId: 'pt',
      subCategoryId: 'sub',
      planId: 'plan-1',
      reimbursedByTransactionId: 'rb',
      beneficiaryId: 'ben',
      goldTypeId: 'g',
      goldQuantity: 1.5,
      purchasePlaceId: 'pp',
      savingsBank: 'sb',
      accountId: null,
      toAccountId: null,
    })
  })
  it('maps in to creditAmount and prefers the form plan', () => {
    const p = toTransactionPayload({ ...values, type: 'in', planId: 'form-plan' }, 'plan-1')
    expect(p.creditAmount).toBe(260000)
    expect(p.debitAmount).toBe(0)
    expect(p.planId).toBe('form-plan')
  })
  it('saves the picked "Trả bằng" account as accountId', () => {
    expect(toTransactionPayload({ ...values, payWithAccountId: 'a-od' }, 'plan-1').accountId).toBe('a-od')
  })

  it('saves the "Chuyển vào / Trả cho" account as toAccountId', () => {
    expect(toTransactionPayload({ ...values, transferToAccountId: 'a-card' }, 'plan-1').toAccountId).toBe('a-card')
  })
})

describe('toTransactionPayloads', () => {
  it('saves one row without an old-debt part', () => {
    expect(toTransactionPayloads(values, 'plan-1')).toEqual([toTransactionPayload(values, 'plan-1')])
  })

  it('saves the old-debt part first, as its own counted row into the same card', () => {
    const split = {
      ...values,
      amount: 132000,
      transferToAccountId: 'card',
      oldDebtPart: { amount: 8_489_419, content: 'Netflix (nợ cũ)', categoryId: 'no', subCategoryId: 'tra-the' },
    }
    const [part, rest] = toTransactionPayloads(split, 'plan-1')
    expect(part).toMatchObject({
      content: 'Netflix (nợ cũ)', debitAmount: 8_489_419, categoryId: 'no', subCategoryId: 'tra-the', toAccountId: 'card',
    })
    expect(rest).toMatchObject({ content: 'Netflix', debitAmount: 132000, categoryId: 'cat', subCategoryId: 'sub', toAccountId: 'card' })
  })
})
