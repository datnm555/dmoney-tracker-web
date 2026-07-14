import type { TransactionResponse } from '../api/types'

export interface SearchCriteria {
  content: string
  amountFrom: number | null
  amountTo: number | null
  note: string
}

/** Diacritic- and case-insensitive contains, so "tien dien" matches "Tiền điện". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')

export function matchesSearch(tx: TransactionResponse, criteria: SearchCriteria): boolean {
  if (criteria.content.trim() !== '' && !normalize(tx.content).includes(normalize(criteria.content.trim()))) {
    return false
  }

  const amount = Math.max(tx.credit.amount, tx.debit.amount)
  if (criteria.amountFrom !== null && amount < criteria.amountFrom) return false
  if (criteria.amountTo !== null && amount > criteria.amountTo) return false

  if (criteria.note.trim() !== '') {
    if (tx.note === null) return false
    if (!normalize(tx.note).includes(normalize(criteria.note.trim()))) return false
  }

  return true
}
