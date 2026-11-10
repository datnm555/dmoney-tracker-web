import { describe, expect, it } from 'vitest'
import type { AccountResponse } from '../api/types'
import { buildPayWithChips, matchesPayWith, payWithFields, selectedPayWithKey } from './payWith'

function account(over: Partial<AccountResponse>): AccountResponse {
  return {
    id: 'a1',
    name: 'Acc',
    type: 'checking',
    lastDigits: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    latestSnapshot: null,
    bankName: 'Techcombank',
    ...over,
  }
}

describe('payWithFields', () => {
  it('maps credit_card to card/credit/bank', () => {
    expect(payWithFields(account({ type: 'credit_card', bankName: 'VPBank' }))).toEqual({
      paymentMethod: 'card',
      cardType: 'credit',
      bank: 'VPBank',
    })
  })

  it.each(['checking', 'overdraft', 'ewallet'] as const)('maps %s to transfer/null/bank', (type) => {
    expect(payWithFields(account({ type, bankName: 'MoMo' }))).toEqual({
      paymentMethod: 'transfer',
      cardType: null,
      bank: 'MoMo',
    })
  })

  it('maps cash to cash/null/null even if a bank name is set', () => {
    expect(payWithFields(account({ type: 'cash', bankName: 'X' }))).toEqual({
      paymentMethod: 'cash',
      cardType: null,
      bank: null,
    })
  })

  it('keeps a missing bank name as null', () => {
    expect(payWithFields(account({ bankName: null })).bank).toBeNull()
  })
})

describe('matchesPayWith', () => {
  const card = account({ type: 'credit_card', bankName: 'VPBank' })

  it('matches identical values', () => {
    expect(matchesPayWith(card, { paymentMethod: 'card', cardType: 'credit', bank: 'VPBank' })).toBe(true)
  })

  it('does not match a different bank, card type or method', () => {
    expect(matchesPayWith(card, { paymentMethod: 'card', cardType: 'credit', bank: 'Other' })).toBe(false)
    expect(matchesPayWith(card, { paymentMethod: 'card', cardType: 'debit', bank: 'VPBank' })).toBe(false)
    expect(matchesPayWith(card, { paymentMethod: 'transfer', cardType: null, bank: 'VPBank' })).toBe(false)
  })

  it('treats empty/blank bank as null', () => {
    const cash = account({ type: 'cash', bankName: null })
    expect(matchesPayWith(cash, { paymentMethod: 'cash', cardType: null, bank: '' })).toBe(true)
    expect(matchesPayWith(cash, { paymentMethod: 'cash', cardType: null, bank: null })).toBe(true)
  })
})

describe('buildPayWithChips / selectedPayWithKey', () => {
  it('adds a synthetic cash chip when no cash account exists', () => {
    const chips = buildPayWithChips([account({ id: 'a1', name: 'TCB' })], 'Tiền mặt')
    expect(chips.map((c) => c.label)).toEqual(['TCB', 'Tiền mặt'])
    expect(chips[1].fields).toEqual({ paymentMethod: 'cash', cardType: null, bank: null })
  })

  it('does not add the synthetic chip when a cash account exists', () => {
    const chips = buildPayWithChips([account({ id: 'c', name: 'Ví', type: 'cash', bankName: null })], 'Tiền mặt')
    expect(chips.map((c) => c.label)).toEqual(['Ví'])
  })

  it('shows last digits in the label', () => {
    const chips = buildPayWithChips([account({ name: 'Visa', lastDigits: '1234' })], 'Tiền mặt')
    expect(chips[0].label).toBe('Visa')
    expect(chips[0].lastDigits).toBe('1234')
  })

  it('first match wins', () => {
    const chips = buildPayWithChips(
      [account({ id: 'a1', name: 'One' }), account({ id: 'a2', name: 'Two' })],
      'Tiền mặt',
    )
    expect(selectedPayWithKey(chips, { paymentMethod: 'transfer', cardType: null, bank: 'Techcombank' })).toBe('a1')
  })

  it('returns null when nothing matches', () => {
    const chips = buildPayWithChips([account({})], 'Tiền mặt')
    expect(selectedPayWithKey(chips, { paymentMethod: 'transfer', cardType: null, bank: 'Zzz' })).toBeNull()
  })
})
