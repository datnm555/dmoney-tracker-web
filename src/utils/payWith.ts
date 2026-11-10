import type { AccountResponse } from '../api/types'
import type { CardTypeCode, PaymentMethodCode } from './paymentMethods'

export interface PayWithFields {
  paymentMethod: PaymentMethodCode
  cardType: CardTypeCode | null
  bank: string | null
}

export interface PayWithChip {
  key: string
  label: string
  lastDigits: string | null
  fields: PayWithFields
}

const SYNTHETIC_CASH_KEY = '__cash__'

/** The transaction payment fields an account stands for. */
export function payWithFields(account: AccountResponse): PayWithFields {
  const bank = account.bankName?.trim() || null
  switch (account.type) {
    case 'credit_card':
      return { paymentMethod: 'card', cardType: 'credit', bank }
    case 'cash':
      return { paymentMethod: 'cash', cardType: null, bank: null }
    default:
      return { paymentMethod: 'transfer', cardType: null, bank }
  }
}

/** What validateAndBuild would save: no bank for cash, no card type unless paying by card. */
function normalise(f: PayWithFields): PayWithFields {
  return {
    paymentMethod: f.paymentMethod,
    cardType: f.paymentMethod === 'card' ? (f.cardType ?? null) : null,
    bank: f.paymentMethod === 'cash' ? null : f.bank?.trim() || null,
  }
}

function sameFields(a: PayWithFields, b: PayWithFields): boolean {
  const x = normalise(a)
  const y = normalise(b)
  return x.paymentMethod === y.paymentMethod && x.cardType === y.cardType && x.bank === y.bank
}

/** Selected-state of an account chip for the form's current payment fields. */
export function matchesPayWith(account: AccountResponse, current: PayWithFields): boolean {
  return sameFields(payWithFields(account), current)
}

/** One chip per account, plus a synthetic cash chip when no cash account exists. */
export function buildPayWithChips(accounts: AccountResponse[], cashLabel: string): PayWithChip[] {
  const chips: PayWithChip[] = accounts.map((a) => ({
    key: a.id,
    label: a.name,
    lastDigits: a.lastDigits,
    fields: payWithFields(a),
  }))
  if (!accounts.some((a) => a.type === 'cash')) {
    chips.push({
      key: SYNTHETIC_CASH_KEY,
      label: cashLabel,
      lastDigits: null,
      fields: { paymentMethod: 'cash', cardType: null, bank: null },
    })
  }
  return chips
}

/** Key of the first chip matching the current values, or null. */
export function selectedPayWithKey(chips: PayWithChip[], current: PayWithFields): string | null {
  return chips.find((c) => sameFields(c.fields, current))?.key ?? null
}
