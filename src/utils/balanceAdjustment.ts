import type { AccountResponse, AccountType, CategoryResponse } from '../api/types'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { payWithFields } from './payWith'

/** Account types whose balance updates reconcile against the book (MoMo-style wallets, bank accounts). */
export const RECONCILED_TYPES: readonly AccountType[] = ['checking', 'ewallet']

/**
 * What a new balance reading means against the book: `spend` when the money dropped (an unrecorded
 * expense), `income` when it rose (unrecorded money in), `none` when it matches or cannot be compared.
 */
export type BalanceAdjustment = { kind: 'none' } | { kind: 'spend' | 'income'; amount: number }

/**
 * Compares a fresh reading with the account's current book balance (latest reading + linked
 * transactions since). Only for reconciled types with an earlier reading, and only when the new
 * reading is not dated before it (a back-dated reading would not replace the current balance).
 */
export function balanceAdjustment(account: AccountResponse, newBalance: number, date: string): BalanceAdjustment {
  const latest = account.latestSnapshot
  if (!RECONCILED_TYPES.includes(account.type) || !latest || !date || date < latest.date) return { kind: 'none' }
  const diff = account.currentBalance.amount - newBalance
  if (diff > 0) return { kind: 'spend', amount: diff }
  if (diff < 0) return { kind: 'income', amount: -diff }
  return { kind: 'none' }
}

/** The "Khác" category for the given direction: system code `other`, matching kind first. */
export function otherCategory(categories: CategoryResponse[], kind: 'expense' | 'income'): CategoryResponse | null {
  const others = categories.filter((c) => c.code === 'other')
  return others.find((c) => c.kind === kind) ?? others.find((c) => c.kind === 'both') ?? others[0] ?? null
}

/** A complete transaction for the reconciled difference, paid with (or received into) the account. */
export function adjustmentValues(
  account: AccountResponse,
  type: 'in' | 'out',
  amount: number,
  date: string,
  content: string,
  categoryId: string | null,
): TransactionFormValues {
  const pay = payWithFields(account)
  return {
    date,
    content,
    type,
    amount,
    categoryId,
    paymentMethod: pay.paymentMethod,
    cardType: pay.cardType,
    bank: pay.bank,
    isAdvance: false,
    advanceTransactionIds: [],
    isPrepaid: false,
    prepaidFrom: null,
    prepaidTo: null,
    prepaidTransactionId: null,
    subCategoryId: null,
    reimbursedByTransactionId: null,
    note: null,
    planId: null,
    beneficiaryId: null,
    goldTypeId: null,
    goldQuantity: null,
    purchasePlaceId: null,
    savingsBank: null,
    payWithAccountId: account.id,
    transferToAccountId: null,
    time: null,
  }
}
