import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteGoldAcquisition, getGoldSummary } from '../api/goldApi'
import { GoldAcquisitionDialog } from '../gold/GoldAcquisitionDialog'
import { formatMoney } from '../utils/money'
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
        purchasePlaceId: 'p-sjc',
        purchasePlaceName: 'SJC',
      },
      {
        transactionId: 'tx-2',
        date: '2026-08-01',
        content: 'Mua 2 chỉ',
        goldTypeId: 'g-1',
        goldTypeName: 'Nhẫn trơn',
        goldQuantity: 2,
        credit: { amount: 0, currency: 'VND' },
        debit: { amount: 20_000_000, currency: 'VND' },
        pricePerChi: { amount: 10_000_000, currency: 'VND' },
        purchasePlaceId: null,
        purchasePlaceName: null,
      },
    ],
    acquisitions: [
      {
        id: 'acq-1',
        date: '2024-05-10',
        goldTypeId: 'g-1',
        goldTypeName: 'Nhẫn trơn',
        quantity: 3,
        unitPrice: { amount: 5_500_000, currency: 'VND' },
        value: { amount: 16_500_000, currency: 'VND' },
        note: 'mua 2024',
        purchasePlaceId: 'p-sjc',
        purchasePlaceName: 'SJC',
      },
    ],
  }),
  deleteGoldAcquisition: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../gold/GoldAcquisitionDialog', () => ({
  GoldAcquisitionDialog: vi.fn(() => null),
}))

vi.mock('../i18n/I18nContext', () => {
  // Keep `t` a stable reference across renders, matching the real I18nContext
  // (t is useCallback-memoized there). GoldPage's `load` is useCallback([t]),
  // so an unstable mock t here would make the mount effect refire on every
  // unrelated state update (e.g. opening the delete confirm), inflating
  // getGoldSummary call counts independent of this file's own assertions.
  const t = (key: string) => key
  return { useI18n: () => ({ t, lang: 'vi' }) }
})

describe('GoldPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders a type card with the name and held quantity', async () => {
    render(<GoldPage />)
    // The same gold-type name also appears in the history table's type column,
    // so scope to the card's name element to avoid an ambiguous match.
    expect(await screen.findByText('Nhẫn trơn', { selector: 'div.font-semibold' })).toBeInTheDocument()
    // The buy row added below also has a gold quantity of 2, so scope to the
    // card's held-quantity element to avoid an ambiguous match.
    expect(screen.getByText('2 gold.unit', { selector: 'div.text-2xl' })).toBeInTheDocument()
  })

  it('renders a history row with the sell badge', async () => {
    render(<GoldPage />)
    expect(await screen.findByText('Bán 1 chỉ')).toBeInTheDocument()
    expect(screen.getByText('gold.sell')).toBeInTheDocument()
  })

  it('renders a buy row with the buy badge and keeps the sell row on gold.sell', async () => {
    render(<GoldPage />)
    expect(await screen.findByText('Mua 2 chỉ')).toBeInTheDocument()
    expect(screen.getByText('gold.buy')).toBeInTheDocument()
    expect(screen.getByText('Bán 1 chỉ')).toBeInTheDocument()
    expect(screen.getByText('gold.sell')).toBeInTheDocument()
  })

  it('renders the acquisition row with the pre-owned badge, note and value', async () => {
    render(<GoldPage />)
    expect(await screen.findByText('goldAcq.badge')).toBeInTheDocument()
    expect(screen.getByText('mua 2024')).toBeInTheDocument()
    // Intl.NumberFormat renders a non-breaking space between the amount and the
    // currency symbol; RTL's getByText normalizer collapses that in the DOM
    // text but not in a raw string matcher, so compare textContent directly.
    const valueCell = document.querySelector('td.text-right.text-muted-foreground')
    expect(valueCell?.textContent).toBe(formatMoney({ amount: 16_500_000, currency: 'VND' }))
  })

  it('shows the purchase place in its own column on both row kinds', async () => {
    render(<GoldPage />)
    await screen.findByText('Bán 1 chỉ')
    await screen.findByText('goldAcq.badge')

    expect(screen.getByRole('columnheader', { name: 'form.purchasePlace' })).toBeInTheDocument()
    // tx-1 (sell) and acq-1 (acquisition) each carry the place in a dedicated cell.
    expect(screen.getAllByText('SJC', { selector: 'td' })).toHaveLength(2)
    // The gold-type cells stay plain — no inline " · SJC" remnant anywhere.
    const typeCells = screen.getAllByText('Nhẫn trơn', { selector: 'td' })
    expect(typeCells).toHaveLength(3)
    for (const cell of typeCells) {
      expect(cell.textContent).toBe('Nhẫn trơn')
    }
  })

  it('deletes an acquisition after confirm and reloads the summary', async () => {
    const user = userEvent.setup()
    render(<GoldPage />)
    await screen.findByText('goldAcq.badge')

    await user.click(screen.getByRole('button', { name: 'goldAcq.deleteConfirm' }))
    await user.click(await screen.findByText('summary.delete'))

    expect(deleteGoldAcquisition).toHaveBeenCalledWith('acq-1')
    await waitFor(() => expect(getGoldSummary).toHaveBeenCalledTimes(2))
  })

  it('opens the dialog for a new acquisition from the header button', async () => {
    const user = userEvent.setup()
    render(<GoldPage />)
    await screen.findByText('goldAcq.badge')

    await user.click(screen.getByRole('button', { name: 'goldAcq.add' }))

    await waitFor(() => {
      const lastCall = vi.mocked(GoldAcquisitionDialog).mock.calls.at(-1)
      expect(lastCall?.[0]).toMatchObject({ open: true, editing: null })
    })
  })

  it('shows the empty state when there are no types or transactions', async () => {
    vi.mocked(getGoldSummary).mockResolvedValueOnce({ types: [], transactions: [], acquisitions: [] })
    render(<GoldPage />)
    expect(await screen.findByText('gold.empty')).toBeInTheDocument()
  })
})
