import { describe, expect, it } from 'vitest'
import type { TransactionResponse } from '../api/types'
import { paymentLabel } from './paymentLabel'

const t = (key: string) => key

const tx = (paymentMethod: string, cardType: string | null = null, bank: string | null = null): TransactionResponse => ({
  id: '1',
  date: '2026-07-08',
  content: 'x',
  credit: { amount: 0, currency: 'VND' },
  debit: { amount: 1000, currency: 'VND' },
  note: null,
  category: null,
  paymentMethod,
  cardType,
  bank,
  isAdvance: false,
})

describe('paymentLabel', () => {
  it('returns the method label for non-card payments', () => {
    expect(paymentLabel(tx('transfer'), t)).toBe('payment.transfer')
    expect(paymentLabel(tx('cash'), t)).toBe('payment.cash')
  })

  it('appends card type and bank when present', () => {
    expect(paymentLabel(tx('card', 'visa', 'Techcombank'), t)).toBe('payment.card payment.cardType.visa Techcombank')
    expect(paymentLabel(tx('card', 'credit', 'VPBank'), t)).toBe('payment.card payment.cardType.credit VPBank')
  })

  it('omits missing card details gracefully', () => {
    expect(paymentLabel(tx('card', 'visa'), t)).toBe('payment.card payment.cardType.visa')
    expect(paymentLabel(tx('card'), t)).toBe('payment.card')
  })
})
