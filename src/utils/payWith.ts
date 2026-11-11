import type { AccountResponse, AccountType } from '../api/types'
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
  type: AccountType
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
    type: a.type,
    fields: payWithFields(a),
  }))
  if (!accounts.some((a) => a.type === 'cash')) {
    chips.push({
      key: SYNTHETIC_CASH_KEY,
      label: cashLabel,
      lastDigits: null,
      type: 'cash',
      fields: { paymentMethod: 'cash', cardType: null, bank: null },
    })
  }
  return chips
}

/**
 * Key of the chip matching the current values, or null. Several accounts can share the same
 * payment fields (a salary account and an overdraft at one bank), so the chip the owner actually
 * picked wins while its fields still match; otherwise the first match.
 */
export function selectedPayWithKey(
  chips: PayWithChip[],
  current: PayWithFields,
  pickedKey: string | null = null,
): string | null {
  const picked = pickedKey !== null ? chips.find((c) => c.key === pickedKey) : undefined
  if (picked && sameFields(picked.fields, current)) return picked.key
  return chips.find((c) => sameFields(c.fields, current))?.key ?? null
}

export interface PayWithGroup {
  /** Bank the chips pay through; null = cash and accounts without a bank. */
  bank: string | null
  chips: PayWithChip[]
}

/** Chips grouped under their bank (A→Z, keeping chip order inside), no-bank group last. */
export function groupPayWithChips(chips: PayWithChip[]): PayWithGroup[] {
  const map = new Map<string | null, PayWithChip[]>()
  for (const chip of chips) {
    const bank = chip.fields.bank?.trim() || null
    map.set(bank, [...(map.get(bank) ?? []), chip])
  }
  return [...map.entries()]
    .map(([bank, grouped]) => ({ bank, chips: grouped }))
    .sort((x, y) => {
      if (x.bank === null) return y.bank === null ? 0 : 1
      if (y.bank === null) return -1
      return x.bank.localeCompare(y.bank, 'vi')
    })
}
