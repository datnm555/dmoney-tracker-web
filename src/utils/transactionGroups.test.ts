import { describe, expect, it } from 'vitest'
import type { TransactionResponse } from '../api/types'
import { groupTransactionsByDay } from './transactionGroups'

const tx = (id: string, date: string, credit: number, debit: number): TransactionResponse => ({
  id,
  date,
  content: id,
  credit: { amount: credit, currency: 'VND' },
  debit: { amount: debit, currency: 'VND' },
  note: null,
  category: null,
  paymentMethod: 'transfer',
  cardType: null,
  bank: null,
})

describe('groupTransactionsByDay', () => {
  it('groups by date desc with net per day', () => {
    const groups = groupTransactionsByDay([
      tx('a', '2026-07-07', 0, 1_200_000),
      tx('b', '2026-07-05', 28_000_000, 0),
      tx('c', '2026-07-07', 0, 65_000),
    ])

    expect(groups.map((g) => g.date)).toEqual(['2026-07-07', '2026-07-05'])
    expect(groups[0].net).toBe(-1_265_000)
    expect(groups[0].items.map((i) => i.id)).toEqual(['a', 'c'])
    expect(groups[1].net).toBe(28_000_000)
  })

  it('returns empty for no items', () => {
    expect(groupTransactionsByDay([])).toEqual([])
  })
})
