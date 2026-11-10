import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nContext'
import { getAccounts } from '../api/accountApi'
import { getDashboardStats, getMonthlySummary } from '../api/transactionApi'
import type { AccountResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))
vi.mock('../api/accountApi', () => ({ getAccounts: vi.fn() }))
vi.mock('../api/transactionApi', () => ({
  getDashboardStats: vi.fn(),
  getMonthlySummary: vi.fn(),
}))
vi.mock('../plans/PlanContext', () => ({
  usePlans: () => ({ plans: [], selectedPlanId: 'p-1', selectPlan: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('../categories/useCategoryDisplay', () => ({
  useCategoryDisplay: () => ({
    label: (c: string) => c,
    visual: () => ({ hex: '#000' }),
  }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

const money = (amount: number) => ({ amount, currency: 'VND' })
const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')

const card = (id: string, name: string, dueDate: string, amount = 5_000_000): AccountResponse => ({
  id,
  name,
  type: 'credit_card',
  lastDigits: '1234',
  creditLimit: null,
  statementDay: null,
  dueDay: null,
  interestRatePercent: null,
  latestSnapshot: {
    id: `s-${id}`,
    accountId: id,
    date: '2026-11-01',
    balance: money(amount),
    statementAmount: money(amount),
    dueDate,
    installmentRemaining: null,
    statementPaid: false,
    note: null,
  },
})

function renderPage() {
  render(
    <MemoryRouter>
      <I18nProvider>
        <DashboardPage />
      </I18nProvider>
    </MemoryRouter>,
  )
}

describe('DashboardPage due banner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T08:00:00') })
    vi.mocked(getDashboardStats).mockResolvedValue({ monthly: [] } as never)
    vi.mocked(getMonthlySummary).mockResolvedValue({
      items: [],
      balance: money(0),
      totalCredit: money(0),
      totalDebit: money(0),
    } as never)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows a banner line per urgent due, linking to the accounts page', async () => {
    vi.mocked(getAccounts).mockResolvedValue([
      card('a', 'Techcombank Visa', '2026-11-12'),
      card('b', 'VPBank Mastercard', '2026-11-10', 2_000_000),
      card('c', 'Far Card', '2026-12-20'),
      card('d', 'Late Card', '2026-11-08', 1_000_000),
    ])
    renderPage()

    const a = await screen.findByTestId('due-banner-a')
    expect(norm(a.textContent)).toBe(`Techcombank Visa accounts.dueIn 2 accounts.days: ${norm(formatMoney(money(5_000_000)))}`)
    const b = screen.getByTestId('due-banner-b')
    expect(norm(b.textContent)).toBe(`VPBank Mastercard accounts.dueTodayFull: ${norm(formatMoney(money(2_000_000)))}`)
    expect(screen.queryByTestId('due-banner-c')).not.toBeInTheDocument()
    expect(norm(screen.getByTestId('due-banner-d').textContent)).toBe(`Late Card accounts.overdue 2 accounts.days: ${norm(formatMoney(money(1_000_000)))}`)
    expect(a.closest('a')).toHaveAttribute('href', '/app/accounts')
  })

  it('shows no banner when nothing is urgent', async () => {
    vi.mocked(getAccounts).mockResolvedValue([card('c', 'Far Card', '2026-12-20')])
    renderPage()

    await waitFor(() => expect(getAccounts).toHaveBeenCalled())
    await screen.findByText('dashboard.title')
    expect(screen.queryByTestId('due-banner')).not.toBeInTheDocument()
  })

  it('survives a getAccounts failure without toasting or a banner', async () => {
    const { toast } = await import('sonner')
    vi.mocked(getAccounts).mockRejectedValue(new Error('boom'))
    renderPage()

    await waitFor(() => expect(getAccounts).toHaveBeenCalled())
    expect(await screen.findByText('dashboard.title')).toBeInTheDocument()
    expect(screen.queryByTestId('due-banner')).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })
})
