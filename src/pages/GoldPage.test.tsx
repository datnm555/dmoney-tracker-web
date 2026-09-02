import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { getGoldSummary } from '../api/goldApi'
import { GoldPage } from './GoldPage'

vi.mock('../api/goldApi', () => ({
  getGoldSummary: vi.fn().mockResolvedValue({
    types: [
      {
        goldTypeId: 'g-1',
        name: 'Nhẫn trơn',
        heldQuantity: 2,
        boughtQuantity: 3,
        soldQuantity: 1,
        totalSpent: { amount: 31_000_000, currency: 'VND' },
        totalReceived: { amount: 12_000_000, currency: 'VND' },
        averageCostPerChi: { amount: 10_333_333.33, currency: 'VND' },
      },
    ],
    transactions: [
      {
        transactionId: 'tx-1',
        date: '2026-08-03',
        content: 'Bán 1 chỉ',
        goldTypeId: 'g-1',
        goldTypeName: 'Nhẫn trơn',
        goldQuantity: 1,
        credit: { amount: 12_000_000, currency: 'VND' },
        debit: { amount: 0, currency: 'VND' },
        pricePerChi: { amount: 12_000_000, currency: 'VND' },
      },
    ],
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('GoldPage', () => {
  it('renders a type card with the name and held quantity', async () => {
    render(<GoldPage />)
    // The same gold-type name also appears in the history table's type column,
    // so scope to the card's name element to avoid an ambiguous match.
    expect(await screen.findByText('Nhẫn trơn', { selector: 'div.font-semibold' })).toBeInTheDocument()
    expect(screen.getByText('2 gold.unit')).toBeInTheDocument()
  })

  it('renders a history row with the sell badge', async () => {
    render(<GoldPage />)
    expect(await screen.findByText('Bán 1 chỉ')).toBeInTheDocument()
    expect(screen.getByText('gold.sell')).toBeInTheDocument()
  })

  it('shows the empty state when there are no types or transactions', async () => {
    vi.mocked(getGoldSummary).mockResolvedValueOnce({ types: [], transactions: [] })
    render(<GoldPage />)
    expect(await screen.findByText('gold.empty')).toBeInTheDocument()
  })
})
