import { describe, expect, it } from 'vitest'
import type { AccountResponse } from '../api/types'
import { buildPayWithChips, groupPayWithChips, matchesPayWith, payWithFields, selectedPayWithKey } from './payWith'

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
    isDefault: false,
    currentBalance: { amount: 0, currency: 'VND' },
    transactionsSinceSnapshot: 0, statementPaidAmount: { amount: 0, currency: 'VND' }, untrackedDebt: null, untrackedDebtRemaining: null,
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
    expect(chips.map((c) => c.type)).toEqual(['checking', 'cash'])
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

  it('keeps the picked chip when another account shares its fields', () => {
    const chips = buildPayWithChips(
      [account({ id: 'a1', name: 'One' }), account({ id: 'a2', name: 'Two' })],
      'Tiền mặt',
    )
    const fields = { paymentMethod: 'transfer' as const, cardType: null, bank: 'Techcombank' }
    expect(selectedPayWithKey(chips, fields, 'a2')).toBe('a2')
    // Once the fields no longer match the picked chip, fall back to the first match.
    expect(selectedPayWithKey(chips, { ...fields, bank: 'ACB' }, 'a2')).toBeNull()
    expect(selectedPayWithKey(chips, fields, 'missing')).toBe('a1')
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

describe('selectedPayWithKey normalisation', () => {
  it('a cash state with a leftover bank still matches the cash chip', () => {
    const chips = buildPayWithChips([], 'Tiền mặt')
    expect(selectedPayWithKey(chips, { paymentMethod: 'cash', cardType: null, bank: 'Techcombank' })).toBe('__cash__')
  })

  it('a non-card state with a leftover cardType matches the transfer chip', () => {
    const chips = buildPayWithChips([account({ bankName: 'Techcombank' })], 'Tiền mặt')
    expect(selectedPayWithKey(chips, { paymentMethod: 'transfer', cardType: 'credit', bank: 'Techcombank' })).toBe('a1')
  })
})

describe('groupPayWithChips', () => {
  it('groups by bank A→Z keeping chip order, with cash and bankless accounts last', () => {
    const chips = buildPayWithChips(
      [
        account({ id: 'vp-1', name: 'VP lương', bankName: 'VPBank' }),
        account({ id: 'tcb', name: 'TCB Visa', type: 'credit_card', bankName: 'Techcombank' }),
        account({ id: 'none', name: 'Không rõ', bankName: null }),
        account({ id: 'vp-2', name: 'VP thấu chi', type: 'overdraft', bankName: ' VPBank ' }),
      ],
      'Tiền mặt',
    )
    expect(groupPayWithChips(chips).map((g) => [g.bank, g.chips.map((c) => c.key)])).toEqual([
      ['Techcombank', ['tcb']],
      ['VPBank', ['vp-1', 'vp-2']],
      [null, ['none', '__cash__']],
    ])
  })

  it('follows the bank display order, case-insensitively, before unranked banks', () => {
    const chips = buildPayWithChips(
      [
        account({ id: 'acb', bankName: 'ACB' }),
        account({ id: 'tcb', bankName: 'Techcombank' }),
        account({ id: 'vp', bankName: 'VPBank' }),
        account({ id: 'agr', bankName: 'Agribank' }),
      ],
      'Tiền mặt',
    )
    expect(groupPayWithChips(chips, ['vpbank', 'Techcombank']).map((g) => g.bank)).toEqual([
      'VPBank',
      'Techcombank',
      'ACB',
      'Agribank',
      null,
    ])
  })
})
