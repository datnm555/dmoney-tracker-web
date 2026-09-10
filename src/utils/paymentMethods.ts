// Must stay in sync with Domain/Transactions/PaymentMethods.cs + CardTypes.cs on the backend.
export const PAYMENT_METHOD_CODES = ['transfer', 'cash', 'card'] as const
export type PaymentMethodCode = (typeof PAYMENT_METHOD_CODES)[number]

export const CARD_TYPE_CODES = ['debit', 'credit'] as const
export type CardTypeCode = (typeof CARD_TYPE_CODES)[number]

// Bank chips come from the per-user catalog (src/banks/BanksContext);
// the backend stores bank as free text.
