import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nProvider } from '../i18n/I18nContext'
import { createAccount, createSnapshot, deleteSnapshot, getAccounts, getSnapshots, updateAccount, updateSnapshot } from '../api/accountApi'
import type { AccountResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { AccountsPage } from './AccountsPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../banks/BanksContext', () => ({
  useBanks: () => ({
    banks: [
      { id: 'b1', name: 'Techcombank', isDefault: false },
      { id: 'b2', name: 'VPBank', isDefault: false },
    ],
    refresh: async () => {},
  }),
}))

vi.mock('../api/accountApi', () => ({
  getAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  deleteAccount: vi.fn(),
  getSnapshots: vi.fn().mockResolvedValue([]),
  createSnapshot: vi.fn().mockResolvedValue({ id: 's-new' }),
  updateSnapshot: vi.fn().mockResolvedValue(undefined),
  deleteSnapshot: vi.fn(),
}))

const vnd = (amount: number) => ({ amount, currency: 'VND' })
const fmt = (amount: number) => formatMoney(vnd(amount)).replace(/\s/g, ' ')
const norm = (text: string | null) => (text ?? '').replace(/\s/g, ' ')

const base = {
  lastDigits: null,
  creditLimit: null,
  statementDay: null,
  dueDay: null,
  interestRatePercent: null,
  latestSnapshot: null,
  bankName: null,
}

const snap = (over: Partial<NonNullable<AccountResponse['latestSnapshot']>>) => ({
  id: 'snap-1',
  accountId: 'a',
  date: '2026-11-09',
  balance: vnd(0),
  statementAmount: null,
  dueDate: null,
  installmentRemaining: null,
  statementPaid: false,
  note: null,
  statementUntracked: false,
  ...over,
})

const accounts: AccountResponse[] = [
  { ...base, id: 'a-check', name: 'Techcombank', type: 'checking', lastDigits: '1234', latestSnapshot: snap({ id: 's1', accountId: 'a-check', balance: vnd(10_000_000) }) },
  { ...base, id: 'a-empty', name: 'Tiền mặt ví', type: 'cash' },
  {
    ...base,
    id: 'a-od',
    name: 'Thấu chi VPB',
    type: 'overdraft',
    creditLimit: vnd(250_000_000),
    interestRatePercent: 12,
    latestSnapshot: snap({ id: 's2', accountId: 'a-od', balance: vnd(100_000_000) }),
  },
  {
    ...base,
    id: 'a-cc',
    name: 'Visa',
    type: 'credit_card',
    lastDigits: '5678',
    creditLimit: vnd(50_000_000),
    latestSnapshot: snap({
      id: 'snap-cc',
      accountId: 'a-cc',
      balance: vnd(20_000_000),
      statementAmount: vnd(5_000_000),
      dueDate: '2026-11-12',
      note: 'n',
    }),
  },
]

function renderPage(data: AccountResponse[] = accounts) {
  vi.mocked(getAccounts).mockResolvedValue(data)
  render(
    <I18nProvider>
      <AccountsPage />
    </I18nProvider>,
  )
}

describe('AccountsPage', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T09:00:00') })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows the three totals', async () => {
    renderPage()
    expect(await screen.findByText('accounts.cashTotal')).toBeInTheDocument()
    expect(norm(screen.getByTestId('tile-cash').textContent)).toContain(fmt(10_000_000))
    expect(norm(screen.getByTestId('tile-debt').textContent)).toContain(fmt(120_000_000))
    expect(norm(screen.getByTestId('tile-available').textContent)).toContain(fmt(180_000_000))
  })

  it('shows noSnapshot for an account without a snapshot', async () => {
    renderPage()
    await screen.findByText('Tiền mặt ví')
    expect(screen.getByText('accounts.noSnapshot')).toBeInTheDocument()
    expect(screen.getByText('•••1234')).toBeInTheDocument()
  })

  it('lists the urgent due card and marks it paid', async () => {
    const user = userEvent.setup()
    renderPage()
    const due = await screen.findByTestId('due-a-cc')
    expect(norm(due.textContent)).toContain('accounts.left 2 accounts.days')
    expect(due).toHaveTextContent('•••5678')
    await user.click(within(due).getByRole('button', { name: 'accounts.markPaid' }))
    expect(updateSnapshot).toHaveBeenCalledWith('snap-cc', {
      date: '2026-11-09',
      balance: 20_000_000,
      statementAmount: 5_000_000,
      dueDate: '2026-11-12',
      installmentRemaining: null,
      note: 'n',
      statementPaid: true,
      statementUntracked: false,
    })
    expect(getAccounts).toHaveBeenCalledTimes(2)
  })

  it('hides debt fields for checking and shows them for credit_card', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    await user.click(screen.getByRole('button', { name: 'accounts.edit Techcombank' }))
    expect(await screen.findByLabelText('accounts.name')).toBeInTheDocument()
    expect(screen.queryByLabelText('accounts.creditLimit')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'summary.cancel' }))

    await user.click(screen.getByRole('button', { name: 'accounts.edit Visa' }))
    expect(await screen.findByLabelText('accounts.creditLimit')).toBeInTheDocument()
    expect(screen.getByLabelText('accounts.statementDay')).toBeInTheDocument()
    expect(screen.getByLabelText('accounts.dueDay')).toBeInTheDocument()
    expect(screen.getByLabelText('accounts.interestRate')).toBeInTheDocument()
  })

  it('does not show the previous account rows while another history loads', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    vi.mocked(getSnapshots).mockResolvedValueOnce([snap({ id: 'h1', accountId: 'a-check', balance: vnd(77_000_000) })])
    await user.click(screen.getByRole('button', { name: 'accounts.history Techcombank' }))
    expect(await screen.findByText(fmt(77_000_000))).toBeInTheDocument()
    await user.keyboard('{Escape}')
    vi.mocked(getSnapshots).mockReturnValueOnce(new Promise(() => {}))
    await user.click(screen.getByRole('button', { name: 'accounts.history Visa' }))
    expect(await screen.findByText(/accounts.history · Visa/)).toBeInTheDocument()
    expect(screen.queryByText(fmt(77_000_000))).not.toBeInTheDocument()
  })

  it('derives owed from available when typing available', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Thấu chi VPB')
    await user.click(screen.getByRole('button', { name: 'accounts.updateBalance Thấu chi VPB' }))
    await user.type(await screen.findByLabelText('accounts.available'), '121507335')
    expect(screen.getByLabelText('accounts.owed')).toHaveValue('128.492.665')
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createSnapshot).toHaveBeenCalledWith(
      'a-od',
      expect.objectContaining({ date: '2026-11-10', balance: 128_492_665 }),
    )
  })
  it('sends the untracked-statement flag and clears it when the due date changes', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    await user.click(screen.getByRole('button', { name: 'accounts.updateBalance Visa' }))
    await user.type(await screen.findByLabelText('accounts.owed'), '21000000')
    await user.click(screen.getByLabelText('accounts.statementUntracked'))
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createSnapshot).toHaveBeenLastCalledWith('a-cc', expect.objectContaining({ statementUntracked: true }))

    await user.click(screen.getByRole('button', { name: 'accounts.updateBalance Visa' }))
    await user.type(await screen.findByLabelText('accounts.owed'), '1')
    await user.click(screen.getByLabelText('accounts.statementUntracked'))
    fireEvent.change(screen.getByLabelText('accounts.dueDate'), { target: { value: '2026-12-12' } })
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createSnapshot).toHaveBeenLastCalledWith(
      'a-cc',
      expect.objectContaining({ dueDate: '2026-12-12', statementUntracked: false }),
    )
  })

  it('carries the card due reminder into a new reading', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    await user.click(screen.getByRole('button', { name: 'accounts.updateBalance Visa' }))
    expect(await screen.findByLabelText('accounts.owed')).toHaveValue('')
    await user.type(screen.getByLabelText('accounts.owed'), '21000000')
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createSnapshot).toHaveBeenCalledWith('a-cc', {
      date: '2026-11-10',
      balance: 21_000_000,
      statementAmount: 5_000_000,
      dueDate: '2026-11-12',
      installmentRemaining: null,
      statementPaid: false,
      note: null,
      statementUntracked: false,
    })
  })

  it('keeps an overdue unpaid statement listed with an overdue label', async () => {
    renderPage([
      {
        ...accounts[3],
        latestSnapshot: snap({ id: 'sx', accountId: 'a-cc', balance: vnd(1), statementAmount: vnd(5_000_000), dueDate: '2026-11-08' }),
      },
    ])
    const due = await screen.findByTestId('due-a-cc')
    expect(norm(due.textContent)).toContain('accounts.overdue 2 accounts.days')
  })

  it('shows neither tiles nor the empty state when loading accounts fails', async () => {
    vi.mocked(getAccounts).mockRejectedValue(new Error('boom'))
    render(
      <I18nProvider>
        <AccountsPage />
      </I18nProvider>,
    )
    expect(await screen.findByText('error.network')).toBeInTheDocument()
    expect(screen.queryByTestId('tile-debt')).not.toBeInTheDocument()
    expect(screen.queryByText('accounts.empty')).not.toBeInTheDocument()
  })

  it('accepts at most one dot and two decimals in the interest rate', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    await user.click(screen.getByRole('button', { name: 'accounts.edit Visa' }))
    const rate = await screen.findByLabelText('accounts.interestRate')
    await user.type(rate, '1.2.345')
    expect(rate).toHaveValue('1.23')
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateAccount).toHaveBeenCalledWith('a-cc', expect.objectContaining({ interestRatePercent: 1.23 }))
  })

  it('never sends NaN for a lone dot interest rate', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    await user.click(screen.getByRole('button', { name: 'accounts.edit Visa' }))
    await user.type(await screen.findByLabelText('accounts.interestRate'), '.')
    await user.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateAccount).toHaveBeenCalledWith('a-cc', expect.objectContaining({ interestRatePercent: null }))
  })

  it('asks for confirmation before deleting a snapshot', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('Techcombank')
    vi.mocked(getSnapshots).mockResolvedValue([snap({ id: 'h1', accountId: 'a-check', balance: vnd(77_000_000) })])
    vi.mocked(deleteSnapshot).mockResolvedValue(undefined)
    await user.click(screen.getByRole('button', { name: 'accounts.history Techcombank' }))
    await user.click(await screen.findByRole('button', { name: 'summary.delete 2026-11-09' }))
    expect(await screen.findByText('accounts.deleteSnapshotConfirm')).toBeInTheDocument()
    expect(deleteSnapshot).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'summary.delete' }))
    expect(deleteSnapshot).toHaveBeenCalledWith('h1')
  })

  describe('bank grouping', () => {
    const grouped: AccountResponse[] = [
      { ...base, id: 'm1', name: 'Lương', type: 'checking', bankName: 'Techcombank', latestSnapshot: snap({ id: 'x1', accountId: 'm1', balance: vnd(3_000_000) }) },
      { ...base, id: 'm2', name: 'Tiết kiệm', type: 'ewallet', bankName: 'Techcombank', latestSnapshot: snap({ id: 'x2', accountId: 'm2', balance: vnd(2_000_000) }) },
      { ...base, id: 'm3', name: 'Chi tiêu', type: 'checking', bankName: 'VPBank', latestSnapshot: snap({ id: 'x3', accountId: 'm3', balance: vnd(9_000_000) }) },
      { ...base, id: 'm4', name: 'Ví mặt', type: 'cash', latestSnapshot: snap({ id: 'x4', accountId: 'm4', balance: vnd(50_000_000) }) },
      { ...base, id: 'c1', name: 'Thẻ A', type: 'credit_card', bankName: 'Techcombank', latestSnapshot: snap({ id: 'y1', accountId: 'c1', balance: vnd(1_000_000) }) },
      { ...base, id: 'c2', name: 'Thẻ B', type: 'credit_card', bankName: 'VPBank', latestSnapshot: snap({ id: 'y2', accountId: 'c2', balance: vnd(4_000_000) }) },
      { ...base, id: 'c3', name: 'Thẻ C', type: 'credit_card', bankName: 'VPBank', latestSnapshot: snap({ id: 'y3', accountId: 'c3', balance: vnd(2_000_000) }) },
      { ...base, id: 'o1', name: 'Thấu chi', type: 'overdraft', bankName: 'VPBank', latestSnapshot: snap({ id: 'z1', accountId: 'o1', balance: vnd(7_000_000) }) },
    ]

    const sections = (group: string) =>
      Array.from(document.querySelectorAll(`[data-testid^="bank-section-${group}-"]`)).map((el) => ({
        id: el.getAttribute('data-testid'),
        header: norm(within(el as HTMLElement).getByTestId('bank-header').textContent),
        names: within(el as HTMLElement).getAllByTestId(/^account-/).map((c) => c.textContent),
      }))

    it('splits the money group into per-bank sections ordered by subtotal, no-bank last', async () => {
      renderPage(grouped)
      await screen.findByText('Lương')
      const money = sections('money')
      expect(money.map((s) => s.id)).toEqual([
        'bank-section-money-VPBank',
        'bank-section-money-Techcombank',
        'bank-section-money-none',
      ])
      expect(money[0].header).toContain('VPBank')
      expect(money[0].header).toContain(fmt(9_000_000))
      expect(money[1].header).toContain(fmt(5_000_000))
      expect(money[1].names).toHaveLength(2)
      expect(money[2].header).toContain('accounts.noBank')
      expect(money[2].header).toContain(fmt(50_000_000))
    })

    it('splits the credit-card group per bank with debt-styled subtotals; overdraft stays flat', async () => {
      renderPage(grouped)
      await screen.findByText('Thẻ A')
      const cards = sections('credit')
      expect(cards.map((s) => s.id)).toEqual(['bank-section-credit-VPBank', 'bank-section-credit-Techcombank'])
      expect(cards[0].header).toContain(fmt(6_000_000))
      expect(cards[1].header).toContain(fmt(1_000_000))
      expect(within(screen.getByTestId('bank-section-credit-VPBank')).getByTestId('bank-total')).toHaveClass('text-expense')
      expect(within(screen.getByTestId('bank-section-money-VPBank')).getByTestId('bank-total')).not.toHaveClass('text-expense')
      expect(sections('overdraft')).toHaveLength(0)
      expect(screen.getByText('Thấu chi')).toBeInTheDocument()
    })

    it('sends bankName when a bank chip is picked in the account dialog', async () => {
      const user = userEvent.setup()
      renderPage(grouped)
      await screen.findByText('Lương')
      await user.click(screen.getByRole('button', { name: 'accounts.edit Lương' }))
      await user.click(await screen.findByRole('button', { name: 'VPBank' }))
      await user.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(updateAccount).toHaveBeenCalledWith('m1', expect.objectContaining({ bankName: 'VPBank' }))
    })

    it('pre-fills the bank on edit and sends null when none is chosen', async () => {
      const user = userEvent.setup()
      renderPage(grouped)
      await screen.findByText('Lương')
      await user.click(screen.getByRole('button', { name: 'accounts.edit Lương' }))
      await user.click(await screen.findByRole('button', { name: 'accounts.noBank' }))
      await user.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(updateAccount).toHaveBeenCalledWith('m1', expect.objectContaining({ bankName: null }))
    })

    it('creates an account with a custom free-text bank', async () => {
      const user = userEvent.setup()
      renderPage([])
      await user.click(await screen.findByRole('button', { name: /accounts.add/ }))
      await user.type(await screen.findByLabelText('accounts.name'), 'Mới')
      await user.click(screen.getByRole('button', { name: /payment.bank.other/ }))
      await user.type(screen.getByRole('textbox', { name: 'accounts.bank' }), 'ACB')
      await user.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(createAccount).toHaveBeenCalledWith(expect.objectContaining({ name: 'Mới', bankName: 'ACB' }))
    })
  })
})
