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
