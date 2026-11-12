import type { TransactionResponse } from '../api/types'
import { currentMonthRange, type DayRange } from './dateRange'
import { matchesSearch } from './transactionSearch'

export type TypeFilter = 'all' | 'in' | 'out' | 'advance'

/** Everything the Transactions filter card controls. `range` drives the API call; the rest filter client-side. */
export interface TransactionFilterState {
  range: DayRange
  type: TypeFilter
  content: string
  amountFromDigits: string
  amountToDigits: string
  note: string
  /** 'all' or a category id. */
  category: string
  /** 'all' or a sub-category id (only applies with a category). */
  subCategory: string
  /** 'all', 'none' (no beneficiary) or a beneficiary id. */
  beneficiary: string
  /** 'all' or an account id: rows paid with it or into it. */
  account: string
}

export function defaultTransactionFilters(): TransactionFilterState {
  return {
    range: currentMonthRange(),
    type: 'all',
    content: '',
    amountFromDigits: '',
    amountToDigits: '',
    note: '',
    category: 'all',
    subCategory: 'all',
    beneficiary: 'all',
    account: 'all',
  }
}

/** Narrowing filters in use (the date range is not counted: it always has a value). */
export function countActiveFilters(f: TransactionFilterState): number {
  return [
    f.type !== 'all',
    f.content.trim() !== '',
    f.amountFromDigits !== '',
    f.amountToDigits !== '',
    f.note.trim() !== '',
    f.category !== 'all',
    f.subCategory !== 'all',
    f.beneficiary !== 'all',
    f.account !== 'all',
  ].filter(Boolean).length
}

/** Client-side filters over the rows the API returned for the active range (the API applies the range). */
export function applyTransactionFilters(
  items: TransactionResponse[],
  f: TransactionFilterState,
): TransactionResponse[] {
  const criteria = {
    content: f.content,
    amountFrom: f.amountFromDigits ? Number(f.amountFromDigits) : null,
    amountTo: f.amountToDigits ? Number(f.amountToDigits) : null,
    note: f.note,
  }
  return items.filter((tx) => {
    if (f.type === 'advance' && !tx.isAdvance) return false
    if (f.type === 'in' && tx.credit.amount <= 0) return false
    if (f.type === 'out' && tx.debit.amount <= 0) return false
    if (f.category !== 'all' && tx.categoryId !== f.category) return false
    if (f.category !== 'all' && f.subCategory !== 'all' && tx.subCategoryId !== f.subCategory) return false
    if (f.beneficiary === 'none' && tx.beneficiaryId !== null) return false
    if (f.beneficiary !== 'all' && f.beneficiary !== 'none' && tx.beneficiaryId !== f.beneficiary) return false
    if (f.account !== 'all' && tx.accountId !== f.account && tx.toAccountId !== f.account) return false
    return matchesSearch(tx, criteria)
  })
}
