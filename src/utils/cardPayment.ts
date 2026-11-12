import type { AccountResponse } from '../api/types'
import type { TransactionFormValues } from '../components/TransactionFormModal'

/** Sub-category codes (seeded by the be LinkStatsRules migration). */
export const ACCOUNT_TRANSFER_CODE = 'account_transfer'
export const CARD_PAYMENT_CODE = 'card_payment'

/**
 * The transaction that pays a card statement: money out into the card ("Chuyển vào" = the card), so
 * the card owes less and the paying account moves, with nothing written back to the readings.
 * Filed under "Chuyển giữa tài khoản" (not spending) when the swipes were recorded one by one, or
 * "Trả thẻ tín dụng" (spending) when the statement holds spending never recorded.
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
    subCategoryCode: untracked ? CARD_PAYMENT_CODE : ACCOUNT_TRANSFER_CODE,
  }
}
