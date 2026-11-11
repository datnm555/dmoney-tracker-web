import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { I18nProvider } from '../i18n/I18nContext'
import { getAccounts } from '../api/accountApi'
import { getSchedule } from '../api/recurringPaymentApi'
import { getDashboardStats, getMonthlySummary } from '../api/transactionApi'
import type { AccountResponse, RecurringScheduleItemResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { DashboardPage } from './DashboardPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))
vi.mock('../api/accountApi', () => ({ getAccounts: vi.fn() }))
vi.mock('../api/recurringPaymentApi', () => ({ getSchedule: vi.fn() }))
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
    visual: () => ({ hex: '#000', icon: () => null, chipClass: '', iconClass: '' }),
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
  bankName: null,
  isDefault: false,
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
    statementUntracked: false,
  },
})

// The banner needs both getAccounts and getSchedule plus a heavy dashboard render; under a busy
// full-suite run that can exceed findBy's 1 s default, so give banner lookups more room.
const BANNER_WAIT = { timeout: 5000 }

/** A due row shows the name, a "when" line and the amount in their own slots. */
function expectDue(testId: string, name: string, when: string, amount: string) {
  const row = screen.getByTestId(testId)
  expect(row).toHaveTextContent(name)
  expect(norm(screen.getByTestId(`${testId}-when`).textContent)).toBe(when)
  expect(norm(screen.getByTestId(`${testId}-amount`).textContent)).toBe(amount)
}

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
    vi.mocked(getSchedule).mockResolvedValue([])
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

    const a = await screen.findByTestId('due-banner-a', {}, BANNER_WAIT)
    expectDue('due-banner-a', 'Techcombank Visa', 'accounts.dueIn 2 accounts.days', norm(formatMoney(money(5_000_000))))
    expect(screen.getByTestId('due-banner-b')).toBeInTheDocument()
    expectDue('due-banner-b', 'VPBank Mastercard', 'accounts.dueTodayFull', norm(formatMoney(money(2_000_000))))
    expect(screen.queryByTestId('due-banner-c')).not.toBeInTheDocument()
    expectDue('due-banner-d', 'Late Card', 'accounts.overdue 2 accounts.days', norm(formatMoney(money(1_000_000))))
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

const row = (
  id: string,
  name: string,
  dueDate: string,
  o: { amount?: number; isVariable?: boolean; paid?: boolean } = {},
): RecurringScheduleItemResponse => ({
  item: {
    id,
    name,
    categoryId: null,
    subCategoryId: null,
    amount: money(o.amount ?? 100_000),
    isVariable: o.isVariable ?? false,
    dayOfMonth: 1,
    paymentMethod: null,
    bank: null,
    note: null,
    isActive: true,
    startPeriod: null,
    savingsBank: null,
  },
  dueDate,
  record: o.paid
    ? { id: `r-${id}`, recurringPaymentId: id, period: '2026-11', amount: money(1), paidDate: dueDate, transactionId: null }
    : null,
})

describe('DashboardPage recurring dues in banner', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T08:00:00') })
    vi.mocked(getAccounts).mockResolvedValue([])
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

  it('lists dueSoon and overdue recurring rows, sorted, linking to /app/recurring', async () => {
    vi.mocked(getSchedule).mockResolvedValue([
      row('z', 'Netflix', '2026-11-12'),
      row('y', 'Rent', '2026-11-10', { amount: 5_000_000 }),
      row('x', 'Internet', '2026-11-07', { amount: 300_000 }),
      row('w', 'Gym', '2026-11-25'),
      row('v', 'Paid', '2026-11-11', { paid: true }),
      row('u', 'Electric', '2026-11-11', { amount: 0, isVariable: true }),
      row('t', 'Water', '2026-11-13', { amount: 150_000, isVariable: true }),
    ])
    renderPage()

    const x = await screen.findByTestId('due-banner-recurring-x', {}, BANNER_WAIT)
    expect(getSchedule).toHaveBeenCalledWith('2026-11')
    expectDue('due-banner-recurring-x', 'Internet', 'accounts.overdue 3 accounts.days', norm(formatMoney(money(300_000))))
    expectDue('due-banner-recurring-y', 'Rent', 'accounts.dueTodayFull', norm(formatMoney(money(5_000_000))))
    expectDue('due-banner-recurring-u', 'Electric', 'recurring.dueIn 1 accounts.days', 'recurring.enterAmount')
    expectDue('due-banner-recurring-z', 'Netflix', 'recurring.dueIn 2 accounts.days', norm(formatMoney(money(100_000))))
    expectDue('due-banner-recurring-t', 'Water', 'recurring.dueIn 3 accounts.days', `≈ ${norm(formatMoney(money(150_000)))}`)
    expect(screen.queryByTestId('due-banner-recurring-w')).not.toBeInTheDocument()
    expect(screen.queryByTestId('due-banner-recurring-v')).not.toBeInTheDocument()
    expect(x.closest('a')).toHaveAttribute('href', '/app/recurring')
    const ids = screen.getAllByTestId(/^due-banner-recurring-[^-]+$/).map((e) => e.dataset.testid)
    expect(ids).toEqual(['due-banner-recurring-x', 'due-banner-recurring-y', 'due-banner-recurring-u', 'due-banner-recurring-z', 'due-banner-recurring-t'])
  })

  it('shows card lines (to /app/accounts) before recurring lines', async () => {
    vi.mocked(getAccounts).mockResolvedValue([card('a', 'Visa', '2026-11-12')])
    vi.mocked(getSchedule).mockResolvedValue([row('z', 'Netflix', '2026-11-11')])
    renderPage()

    const r = await screen.findByTestId('due-banner-recurring-z', {}, BANNER_WAIT)
    const a = await screen.findByTestId('due-banner-a', {}, BANNER_WAIT)
    expect(a.closest('a')).toHaveAttribute('href', '/app/accounts')
    expect(r.closest('a')).toHaveAttribute('href', '/app/recurring')
    expect(a.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('keeps card lines and does not toast when getSchedule fails', async () => {
    const { toast } = await import('sonner')
    vi.mocked(getAccounts).mockResolvedValue([card('a', 'Visa', '2026-11-12')])
    vi.mocked(getSchedule).mockRejectedValue(new Error('boom'))
    renderPage()

    expect(await screen.findByTestId('due-banner-a', {}, BANNER_WAIT)).toBeInTheDocument()
    await waitFor(() => expect(getSchedule).toHaveBeenCalled())
    await act(async () => {})
    expect(screen.queryByTestId(/^due-banner-recurring-/)).not.toBeInTheDocument()
    expect(toast.error).not.toHaveBeenCalled()
  })

  it('shows no banner when nothing recurring is due soon', async () => {
    vi.mocked(getSchedule).mockResolvedValue([row('w', 'Gym', '2026-11-25'), row('v', 'Paid', '2026-11-11', { paid: true })])
    renderPage()

    await waitFor(() => expect(getSchedule).toHaveBeenCalled())
    await act(async () => {})
    expect(screen.queryByTestId('due-banner')).not.toBeInTheDocument()
  })
})

describe('DashboardPage overview', () => {
  const tx = (id: string, over: Record<string, unknown>) => ({
    id,
    date: '2026-11-05',
    content: id,
    credit: money(0),
    debit: money(0),
    categoryId: null,
    subCategoryName: null,
    paymentMethod: 'cash',
    cardType: null,
    bank: null,
    ...over,
  })

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T08:00:00') })
    vi.mocked(getAccounts).mockResolvedValue([])
    vi.mocked(getSchedule).mockResolvedValue([])
    vi.mocked(getDashboardStats).mockResolvedValue({
      monthly: [
        { month: '2026-10', totalCredit: money(8_000_000), totalDebit: money(5_000_000), balance: money(3_000_000) },
        { month: '2026-11', totalCredit: money(10_000_000), totalDebit: money(4_000_000), balance: money(6_000_000) },
      ],
    } as never)
    vi.mocked(getMonthlySummary).mockResolvedValue({
      items: [
        tx('Lương', { credit: money(10_000_000) }),
        tx('Ăn trưa', { debit: money(3_000_000), categoryId: 'food' }),
        tx('Grab', { debit: money(1_000_000), categoryId: 'transport' }),
      ],
      balance: money(6_000_000),
      totalCredit: money(10_000_000),
      totalDebit: money(4_000_000),
    } as never)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows balance, income and expense in the hero', async () => {
    renderPage()
    // The hero renders '—' until the summary loads, so wait for the real figure.
    await waitFor(() =>
      expect(norm(screen.getByTestId('hero-balance').textContent)).toBe(norm(formatMoney(money(6_000_000)))),
    )
    expect(norm(screen.getByTestId('hero-income').textContent)).toBe(`+${norm(formatMoney(money(10_000_000)))}`)
    expect(norm(screen.getByTestId('hero-expense').textContent)).toBe(`−${norm(formatMoney(money(4_000_000)))}`)
  })

  it('lists recent transactions and ranks spending by category with the donut total', async () => {
    renderPage()
    await waitFor(() => expect(screen.getAllByTestId('recent-row')).toHaveLength(3))
    const rows = screen.getAllByTestId('category-row')
    expect(rows.map((r) => r.textContent?.match(/\d+\.\d%/)?.[0])).toEqual(['75.0%', '25.0%'])
    expect(screen.getByTestId('donut-total')).toBeInTheDocument()
  })

  it('totals the charted months above the cashflow chart', async () => {
    renderPage()
    await waitFor(() =>
      expect(norm(screen.getByTestId('cashflow-in').textContent)).toBe(`+${norm(formatMoney(money(18_000_000)))}`),
    )
    expect(norm(screen.getByTestId('cashflow-out').textContent)).toBe(`−${norm(formatMoney(money(9_000_000)))}`)
    expect(norm(screen.getByTestId('cashflow-net').textContent)).toBe(`+${norm(formatMoney(money(9_000_000)))}`)
  })
})
