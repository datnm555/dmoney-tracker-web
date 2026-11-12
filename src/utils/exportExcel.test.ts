import { describe, expect, it, vi } from 'vitest'
import { utils } from 'xlsx'
import type { TransactionResponse } from '../api/types'
import { exportTransactionsToExcel } from './exportExcel'

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}))

const tx: TransactionResponse = {
  id: 't1',
  date: '2026-10-01',
  content: 'Gửi tiết kiệm',
  credit: { amount: 0, currency: 'VND' },
  debit: { amount: 10_000_000, currency: 'VND' },
  note: null,
  categoryId: null,
  paymentMethod: 'transfer',
  cardType: null,
  bank: 'VPBank',
  isAdvance: false,
  advanceTransactionIds: [],
  isPrepaid: false,
  prepaidFrom: null,
  prepaidTo: null,
  prepaidTransactionId: null,
  subCategoryId: null,
  subCategoryName: null,
  planId: 'p-default',
  reimbursedByTransactionId: null,
  links: null,
  beneficiaryId: null,
  beneficiaryName: null,
  goldTypeId: null,
  goldTypeName: null,
  goldQuantity: null,
  purchasePlaceId: null,
  purchasePlaceName: null,
  savingsBank: 'Vietinbank',
  excludedFromStats: false,
  accountId: null,
  toAccountId: null,
}

describe('exportTransactionsToExcel', () => {
  it('includes the savings account column', () => {
    exportTransactionsToExcel([tx], (key) => key, '2026-10')

    const rows = vi.mocked(utils.json_to_sheet).mock.calls[0][0] as Record<string, unknown>[]
    expect(rows[0]['export.colSavingsBank']).toBe('Vietinbank')
    // Totals row keeps the same column set.
    expect(rows[1]['export.colSavingsBank']).toBe('')
  })

  it('names the paying and receiving accounts, and totals only what counts', () => {
    vi.mocked(utils.json_to_sheet).mockClear()
    const transfer = { ...tx, id: 't2', accountId: 'a-od', toAccountId: 'a-cc', excludedFromStats: true }
    const lunch = { ...tx, id: 't3', debit: { amount: 50_000, currency: 'VND' }, accountId: 'a-od' }
    exportTransactionsToExcel([transfer, lunch], (key) => key, '2026-10', undefined, { 'a-od': 'Thấu chi', 'a-cc': 'Visa' })

    const rows = vi.mocked(utils.json_to_sheet).mock.calls[0][0] as Record<string, unknown>[]
    expect(rows[0]['export.colAccount']).toBe('Thấu chi')
    expect(rows[0]['export.colToAccount']).toBe('Visa')
    expect(rows[1]['export.colToAccount']).toBe('')
    expect(rows[2]['summary.colDebit']).toBe(50_000)
  })
})
