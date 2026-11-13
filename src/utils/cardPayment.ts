import type { AccountResponse, SubCategoryResponse } from '../api/types'
import type { TransactionFormValues } from '../components/TransactionFormModal'

/** Sub-category codes (seeded by the be LinkStatsRules migration). */
export const ACCOUNT_TRANSFER_CODE = 'account_transfer'
export const CARD_PAYMENT_CODE = 'card_payment'

/**
 * The transaction that pays a card statement: money out into the card ("Chuyển vào" = the card), so
 * the card owes less and the paying account moves, with nothing written back to the readings.
 * Filed under "Chuyển giữa tài khoản" (not spending) when the swipes were recorded one by one, or
 * "Trả thẻ tín dụng" (spending) when it pays debt never recorded: the card's old debt while any is
 * left, else a statement flagged untracked.
 */
export function cardPaymentPrefill(
  card: AccountResponse,
  amount: number,
  untracked: boolean,
  content: string,
  date: string,
): Partial<TransactionFormValues> {
  return {
    content: `${content} ${card.name}`,
    type: 'out',
    amount: amount > 0 ? amount : undefined,
    date,
    transferToAccountId: card.id,
    subCategoryCode: paysUntrackedDebt(card, untracked) ? CARD_PAYMENT_CODE : ACCOUNT_TRANSFER_CODE,
  }
}

/** Card old debt not yet paid off ("Nợ cũ chưa ghi sổ" còn lại); 0 when none. */
export function untrackedDebtLeft(card: AccountResponse | undefined): number {
  return card?.type === 'credit_card' ? (card.untrackedDebtRemaining?.amount ?? 0) : 0
}

// A card whose old debt is stated follows it; otherwise the statement's own flag decides.
function paysUntrackedDebt(card: AccountResponse, untracked: boolean): boolean {
  return card.untrackedDebt ? untrackedDebtLeft(card) > 0 : untracked
}

/**
 * A new payment into a card with old debt left pays that debt off first. Filed under one of the two
 * card-payment codes (a category the user picked by hand stays as is), it becomes:
 * - all "Trả thẻ tín dụng" when the old debt covers the whole amount;
 * - otherwise the old debt as a separate "Trả thẻ tín dụng" part (`oldDebtPart`) and the rest
 *   under "Chuyển giữa tài khoản".
 */
export function splitOldDebt(
  values: TransactionFormValues,
  card: AccountResponse | undefined,
  subCategories: SubCategoryResponse[],
  partLabel: string,
): TransactionFormValues {
  const left = untrackedDebtLeft(card)
  const counted = subCategories.find((s) => s.code === CARD_PAYMENT_CODE)
  const transfer = subCategories.find((s) => s.code === ACCOUNT_TRANSFER_CODE)
  const picked = subCategories.find((s) => s.id === values.subCategoryId)
  const isCardPaymentCode = picked?.code === CARD_PAYMENT_CODE || picked?.code === ACCOUNT_TRANSFER_CODE
  if (values.type !== 'out' || left <= 0 || !counted || !transfer || !isCardPaymentCode) {
    return { ...values, oldDebtPart: null }
  }
  if (values.amount <= left) {
    return { ...values, categoryId: counted.categoryId, subCategoryId: counted.id, oldDebtPart: null }
  }
  return {
    ...values,
    amount: values.amount - left,
    categoryId: transfer.categoryId,
    subCategoryId: transfer.id,
    oldDebtPart: {
      amount: left,
      content: `${values.content} (${partLabel})`,
      categoryId: counted.categoryId,
      subCategoryId: counted.id,
    },
  }
}
