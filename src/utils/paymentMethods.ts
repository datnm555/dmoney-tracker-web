// Must stay in sync with Domain/Transactions/PaymentMethods.cs + CardTypes.cs on the backend.
export const PAYMENT_METHOD_CODES = ['transfer', 'cash', 'card'] as const
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number]

export const CARD_TYPE_CODES = ['visa', 'credit'] as const
export type CardTypeCode = (typeof CARD_TYPE_CODES)[number]

// UI convenience only; the backend stores bank as free text.
export const BANK_PRESETS = ['Techcombank', 'VPBank'] as const
