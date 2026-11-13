import { createTransaction, deleteTransaction } from '../api/transactionApi'
import type { TransactionPayload } from '../api/transactionApi'
import type { TransactionFormValues } from '../components/TransactionFormModal'

export function toTransactionPayload(values: TransactionFormValues, planId: string): TransactionPayload {
  return {
    date: values.date,
    content: values.content,
    creditAmount: values.type === 'in' ? values.amount : 0,
    debitAmount: values.type === 'out' ? values.amount : 0,
    note: values.note,
    categoryId: values.categoryId,
    paymentMethod: values.paymentMethod,
    cardType: values.cardType,
    bank: values.bank,
    isAdvance: values.isAdvance,
    advanceTransactionIds: values.advanceTransactionIds,
    isPrepaid: values.isPrepaid,
    prepaidFrom: values.prepaidFrom,
    prepaidTo: values.prepaidTo,
    prepaidTransactionId: values.prepaidTransactionId,
    subCategoryId: values.subCategoryId,
    // Create mode never sets a plan on the form, so it always falls back
    // to the selected plan; edit mode carries the picked plan (a move).
    planId: values.planId ?? planId,
    reimbursedByTransactionId: values.reimbursedByTransactionId,
    beneficiaryId: values.beneficiaryId,
    goldTypeId: values.goldTypeId,
    goldQuantity: values.goldQuantity,
    purchasePlaceId: values.purchasePlaceId,
    savingsBank: values.savingsBank,
    accountId: values.payWithAccountId ?? null,
    toAccountId: values.transferToAccountId ?? null,
  }
}

/** One payload per row to save: the old-debt part of a card payment (if any) first, then the rest. */
export function toTransactionPayloads(values: TransactionFormValues, planId: string): TransactionPayload[] {
  const main = toTransactionPayload(values, planId)
  const part = values.oldDebtPart
  if (!part) return [main]
  return [
    {
      ...main,
      content: part.content,
      debitAmount: part.amount,
      categoryId: part.categoryId,
      subCategoryId: part.subCategoryId,
    },
    main,
  ]
}

/** Creates every row of a new transaction; all or nothing (a failed row deletes the ones before it). */
export async function createTransactions(values: TransactionFormValues, planId: string): Promise<string[]> {
  const ids: string[] = []
  try {
    for (const payload of toTransactionPayloads(values, planId)) {
      ids.push((await createTransaction(payload)).id)
    }
  } catch (error) {
    await Promise.allSettled(ids.map((id) => deleteTransaction(id)))
    throw error
  }
  return ids
}
