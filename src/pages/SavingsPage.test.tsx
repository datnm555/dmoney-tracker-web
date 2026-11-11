import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../i18n/I18nContext'
import { deleteSavingsGoal, getSavingsSummary, setSavingsGoal } from '../api/savingsApi'
import type { SavingsSummaryResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { SavingsPage } from './SavingsPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn().mockResolvedValue([
    { id: 'sub-sb', categoryId: 'cat-savings', name: 'Sổ tiết kiệm', isDefault: false, icon: null, code: 'savings_book', excludeFromStats: false },
  ]),
}))
vi.mock('../api/transactionApi', () => ({ createTransaction: vi.fn() }))
vi.mock('../api/savingsApi', () => ({
  getSavingsSummary: vi.fn(),
  setSavingsGoal: vi.fn().mockResolvedValue({ id: 'g-new' }),
  deleteSavingsGoal: vi.fn().mockResolvedValue(undefined),
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
      goal: null,
    },
    {
      savingsBank: 'MoMo',
      balance: vnd(-3_000_000),
      totalDeposited: vnd(1_000_000),
      totalWithdrawn: vnd(4_000_000),
      transactionCount: 2,
      goal: null,
    },
    {
      savingsBank: null,
      balance: vnd(1_000_000),
      totalDeposited: vnd(1_000_000),
      totalWithdrawn: vnd(0),
      transactionCount: 1,
      goal: null,
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

// Wait on `savings-plan`, not static labels like 'savings.total': it only renders once the summary loaded.
const accountCard = (name: string) => screen.getByRole('button', { name: new RegExp(`^${name}`) })

describe('SavingsPage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // Fake only Date so Testing Library's timers keep working.
  const setToday = (iso: string) => vi.useFakeTimers({ toFake: ['Date'], now: new Date(iso) })

  it('shows the default plan name under the title', async () => {
    renderPage()

    expect(await screen.findByText('savings.plan:')).toBeInTheDocument()
    expect(screen.getByTestId('savings-plan')).toHaveTextContent('Sổ chính')
  })

  it('renders stat tiles computed from the transactions', async () => {
    setToday('2026-10-11T09:00:00')
    renderPage()

    await screen.findByTestId('savings-plan')
    expect(norm(screen.getByTestId('savings-stat-deposited').textContent)).toContain(fmt(22_000_000))
    expect(screen.getByTestId('savings-stat-deposited')).toHaveTextContent('savings.totalDeposited')
    expect(norm(screen.getByTestId('savings-stat-withdrawn').textContent)).toContain(fmt(9_000_000))
    expect(screen.getByTestId('savings-stat-withdrawn')).toHaveTextContent('savings.totalWithdrawn')
    expect(norm(screen.getByTestId('savings-stat-this-month').textContent)).toContain(fmt(22_000_000))
    expect(screen.getByTestId('savings-stat-this-month')).toHaveTextContent('savings.thisMonth')
    expect(screen.getByTestId('savings-stat-count')).toHaveTextContent('5')
  })

  it('this-month tile only counts deposits dated in the current local month', async () => {
    setToday('2026-11-03T09:00:00')
    renderPage({
      ...summary,
      transactions: [
        ...summary.transactions,
        { ...summary.transactions[0], transactionId: 'tx-nov', date: '2026-11-01', debit: vnd(3_000_000) },
        { ...summary.transactions[1], transactionId: 'tx-nov-out', date: '2026-11-02', credit: vnd(500_000) },
      ],
    })

    await screen.findByTestId('savings-plan')
    expect(norm(screen.getByTestId('savings-stat-this-month').textContent)).toContain(fmt(3_000_000))
    expect(norm(screen.getByTestId('savings-stat-deposited').textContent)).toContain(fmt(25_000_000))
  })

  it('renders the monthly deposit/withdrawal chart card', async () => {
    renderPage()

    expect(await screen.findByText('savings.monthlyChart')).toBeInTheDocument()
  })

  it('renders the total savings', async () => {
    renderPage()

    await screen.findByTestId('savings-plan')
    expect(screen.getByText('savings.total')).toBeInTheDocument()
    expect(norm(screen.getByTestId('savings-total').textContent)).toBe(fmt(13_000_000))
    expect(screen.getByText('savings.hint')).toBeInTheDocument()
  })

  it('renders one card per account with the unassigned label for null', async () => {
    renderPage()

    await screen.findByTestId('savings-plan')
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

    await screen.findByTestId('savings-plan')
    const balance = within(accountCard('MoMo')).getByTestId('savings-balance')
    expect(norm(balance.textContent)).toBe(`−${fmt(3_000_000)}`)
    expect(balance.textContent).not.toContain('+')
    expect(balance.className).toContain('text-expense')
  })

  it('history shows deposits as + and withdrawals as −, with sub-category and note', async () => {
    renderPage()

    await screen.findByTestId('savings-plan')
    const deposit = screen.getByTestId('savings-row-tx-1')
    expect(norm(deposit.textContent)).toContain(`+${fmt(20_000_000)}`)
    expect(deposit).toHaveTextContent('05/10/2026')
    expect(deposit).toHaveTextContent('Kỳ hạn · 6 tháng')
    const withdrawal = screen.getByTestId('savings-row-tx-2')
    expect(norm(withdrawal.textContent)).toContain(`−${fmt(5_000_000)}`)
  })

  it('clicking an account card filters the history and the select follows; filterAll resets', async () => {
    renderPage()

    await screen.findByTestId('savings-plan')
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

  it('offers the deposit button once the savings-book sub-category is known', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'savings.deposit' })).toBeInTheDocument()
  })

  it('a goal with only a saved-before amount still shows its place, not the empty state', async () => {
    renderPage({
      ...summary,
      totalBalance: vnd(4_000_000),
      transactions: [],
      accounts: [
        {
          savingsBank: 'Sam & Bắp',
          balance: vnd(4_000_000),
          totalDeposited: vnd(0),
          totalWithdrawn: vnd(0),
          transactionCount: 0,
          goal: { id: 'g1', targetAmount: vnd(60_000_000), startPeriod: '2026-11', months: 15, initialAmount: vnd(4_000_000) },
        },
      ],
    })

    await screen.findByTestId('savings-plan')
    expect(accountCard('Sam & Bắp')).toBeInTheDocument()
    expect(screen.getByTestId('savings-goal')).toBeInTheDocument()
    expect(screen.getByText('savings.noHistory')).toBeInTheDocument()
    expect(screen.queryByText('savings.empty')).not.toBeInTheDocument()
    expect(screen.queryByTestId('savings-stat-deposited')).not.toBeInTheDocument()
  })

  it('shows the empty state when there are no savings transactions', async () => {
    renderPage({ ...summary, totalBalance: vnd(0), accounts: [], transactions: [] })

    expect(await screen.findByText('savings.empty')).toBeInTheDocument()
  })

  describe('goals', () => {
    const withGoal: SavingsSummaryResponse = {
      ...summary,
      accounts: [
        {
          ...summary.accounts[0],
          savingsBank: 'Sam & Bắp',
          balance: vnd(4_000_000),
          goal: { id: 'g1', targetAmount: vnd(60_000_000), startPeriod: '2026-11', months: 15, initialAmount: vnd(4_000_000) },
        },
        ...summary.accounts.slice(1),
      ],
    }

    it('shows progress, period and what is needed per month', async () => {
      setToday('2026-11-11T09:00:00')
      renderPage(withGoal)
      const goal = within(await screen.findByTestId('savings-account-Sam & Bắp')).getByTestId('savings-goal')
      expect(norm(goal.textContent)).toContain(`savings.goal ${fmt(60_000_000)}`)
      expect(goal).toHaveTextContent('7%')
      expect(goal).toHaveTextContent('savings.period 1/15 · 01/2028')
      expect(goal).toHaveTextContent('accounts.left 14 savings.monthUnit')
      expect(norm(within(goal).getByTestId('savings-goal-per-month').textContent)).toBe(fmt(4_000_000))
      expect(norm(within(goal).getByTestId('savings-goal-initial').textContent)).toContain(
        `savings.initialAmount${fmt(4_000_000)}`,
      )
    })

    it('offers to set a goal on named places only, and saves it', async () => {
      const user = userEvent.setup()
      setToday('2026-11-11T09:00:00')
      renderPage()
      await screen.findByTestId('savings-plan')
      expect(within(screen.getByTestId('savings-account-__unassigned__')).queryByText('savings.setGoal')).toBeNull()
      await user.click(within(screen.getByTestId('savings-account-MoMo')).getByText('savings.setGoal'))
      expect(screen.getByLabelText('savings.startMonth')).toHaveValue('2026-11')
      await user.type(screen.getByLabelText('savings.target'), '30000000')
      await user.type(screen.getByLabelText('savings.months'), '12')
      await user.type(screen.getByLabelText('savings.initialAmount'), '2000000')
      // Preview: 30tr target − (−3tr balance + 2tr saved before) over the 11 months left.
      const preview = screen.getByTestId('savings-goal-preview')
      expect(preview).toHaveTextContent('accounts.left 11 savings.monthUnit')
      expect(norm(preview.textContent)).toContain(fmt(2_818_182))
      await user.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(setSavingsGoal).toHaveBeenCalledWith({
        savingsBank: 'MoMo',
        targetAmount: 30_000_000,
        startPeriod: '2026-11',
        months: 12,
        initialAmount: 2_000_000,
      })
    })

    it('deletes an existing goal', async () => {
      const user = userEvent.setup()
      renderPage(withGoal)
      await user.click(await screen.findByRole('button', { name: 'savings.goal Sam & Bắp' }))
      expect(screen.getByLabelText('savings.target')).toHaveValue('60.000.000')
      await user.click(screen.getByRole('button', { name: 'savings.deleteGoal' }))
      expect(deleteSavingsGoal).toHaveBeenCalledWith('g1')
    })
  })
})
