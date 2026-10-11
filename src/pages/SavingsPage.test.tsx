import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../i18n/I18nContext'
import { getSavingsSummary } from '../api/savingsApi'
import type { SavingsSummaryResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { SavingsPage } from './SavingsPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../api/savingsApi', () => ({
  getSavingsSummary: vi.fn(),
}))

const vnd = (amount: number) => ({ amount, currency: 'VND' })
// Intl uses non-breaking spaces (U+00A0); normalize before asserting.
const fmt = (amount: number) => formatMoney(vnd(amount)).replace(/\s/g, ' ')
const norm = (text: string | null) => (text ?? '').replace(/\s/g, ' ')

const summary: SavingsSummaryResponse = {
  planId: 'p-1',
  planName: 'Sổ chính',
  totalBalance: vnd(13_000_000),
  accounts: [
    {
      savingsBank: 'Vietinbank',
      balance: vnd(15_000_000),
      totalDeposited: vnd(20_000_000),
      totalWithdrawn: vnd(5_000_000),
      transactionCount: 2,
    },
    {
      savingsBank: 'MoMo',
      balance: vnd(-3_000_000),
      totalDeposited: vnd(1_000_000),
      totalWithdrawn: vnd(4_000_000),
      transactionCount: 2,
    },
    {
      savingsBank: null,
      balance: vnd(1_000_000),
      totalDeposited: vnd(1_000_000),
      totalWithdrawn: vnd(0),
      transactionCount: 1,
    },
  ],
  transactions: [
    {
      transactionId: 'tx-1',
      date: '2026-10-05',
      content: 'Gửi Vietinbank',
      savingsBank: 'Vietinbank',
      bank: 'VPBank',
      credit: vnd(0),
      debit: vnd(20_000_000),
      planId: 'p-1',
      subCategoryName: 'Kỳ hạn',
      note: '6 tháng',
    },
    {
      transactionId: 'tx-2',
      date: '2026-10-04',
      content: 'Rút Vietinbank',
      savingsBank: 'Vietinbank',
      bank: null,
      credit: vnd(5_000_000),
      debit: vnd(0),
      planId: 'p-1',
      subCategoryName: null,
      note: null,
    },
    {
      transactionId: 'tx-3',
      date: '2026-10-03',
      content: 'Nạp MoMo',
      savingsBank: 'MoMo',
      bank: null,
      credit: vnd(0),
      debit: vnd(1_000_000),
      planId: 'p-1',
      subCategoryName: null,
      note: null,
    },
    {
      transactionId: 'tx-4',
      date: '2026-10-02',
      content: 'Rút MoMo',
      savingsBank: 'MoMo',
      bank: null,
      credit: vnd(4_000_000),
      debit: vnd(0),
      planId: 'p-1',
      subCategoryName: null,
      note: null,
    },
    {
      transactionId: 'tx-5',
      date: '2026-10-01',
      content: 'Tích luỹ cũ',
      savingsBank: null,
      bank: null,
      credit: vnd(0),
      debit: vnd(1_000_000),
      planId: 'p-1',
      subCategoryName: null,
      note: null,
    },
  ],
}

function renderPage(data: SavingsSummaryResponse = summary) {
  vi.mocked(getSavingsSummary).mockResolvedValue(data)
  render(
    <I18nProvider>
      <SavingsPage />
    </I18nProvider>,
  )
}

const accountCard = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

describe('SavingsPage', () => {
  it('renders the total savings', async () => {
    renderPage()

    expect(await screen.findByText('savings.total')).toBeInTheDocument()
    expect(norm(screen.getByTestId('savings-total').textContent)).toBe(fmt(13_000_000))
    expect(screen.getByText('savings.hint')).toBeInTheDocument()
  })

  it('renders one card per account with the unassigned label for null', async () => {
    renderPage()

    await screen.findByText('savings.total')
    const vietin = accountCard('Vietinbank')
    expect(norm(vietin.textContent)).toContain(fmt(15_000_000))
    expect(norm(vietin.textContent)).toContain(fmt(20_000_000))
    expect(norm(vietin.textContent)).toContain(fmt(5_000_000))
    expect(vietin).toHaveTextContent('2 savings.count')
    expect(accountCard('MoMo')).toBeInTheDocument()
    expect(accountCard('savings.unassigned')).toHaveTextContent('1 savings.count')
  })

  it('renders a negative balance with − and the absolute amount', async () => {
    renderPage()

    await screen.findByText('savings.total')
    const balance = within(accountCard('MoMo')).getByTestId('savings-balance')
    expect(norm(balance.textContent)).toBe(`−${fmt(3_000_000)}`)
    expect(balance.textContent).not.toContain('+')
    expect(balance.className).toContain('text-expense')
  })

  it('history shows deposits as + and withdrawals as −, with sub-category and note', async () => {
    renderPage()

    await screen.findByText('savings.total')
    const deposit = screen.getByTestId('savings-row-tx-1')
    expect(norm(deposit.textContent)).toContain(`+${fmt(20_000_000)}`)
    expect(deposit).toHaveTextContent('05/10/2026')
    expect(deposit).toHaveTextContent('Kỳ hạn · 6 tháng')
    const withdrawal = screen.getByTestId('savings-row-tx-2')
    expect(norm(withdrawal.textContent)).toContain(`−${fmt(5_000_000)}`)
  })

  it('clicking an account card filters the history and the select follows; filterAll resets', async () => {
    renderPage()

    await screen.findByText('savings.total')
    expect(screen.getAllByTestId(/^savings-row-/)).toHaveLength(5)

    await userEvent.click(accountCard('MoMo'))
    expect(screen.getAllByTestId(/^savings-row-/).map((r) => r.dataset.testid)).toEqual([
      'savings-row-tx-3',
      'savings-row-tx-4',
    ])
    expect(screen.getByRole('combobox', { name: 'savings.history' })).toHaveTextContent('MoMo')

    await userEvent.click(accountCard('savings.unassigned'))
    expect(screen.getAllByTestId(/^savings-row-/).map((r) => r.dataset.testid)).toEqual(['savings-row-tx-5'])

    await userEvent.click(screen.getByRole('combobox', { name: 'savings.history' }))
    await userEvent.click(await screen.findByRole('option', { name: 'savings.filterAll' }))
    expect(screen.getAllByTestId(/^savings-row-/)).toHaveLength(5)
  })

  it('shows the empty state when there are no savings transactions', async () => {
    renderPage({ ...summary, totalBalance: vnd(0), accounts: [], transactions: [] })

    expect(await screen.findByText('savings.empty')).toBeInTheDocument()
  })
})
