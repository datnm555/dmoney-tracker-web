import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import {
  createRecord,
  createRecurringPayment,
  deleteRecord,
  getRecords,
  getRecurringPayments,
  getSchedule,
} from '../api/recurringPaymentApi'
import { getAccounts } from '../api/accountApi'
import { getSubCategories } from '../api/subCategoryApi'
import { createTransaction, deleteTransaction } from '../api/transactionApi'
import type { AccountResponse, RecurringPaymentResponse, RecurringScheduleItemResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { RecurringPage } from './RecurringPage'

vi.mock('../api/resourceApi', () => ({ getResources: vi.fn().mockResolvedValue({}) }))
vi.mock('../plans/PlanContext', () => ({
  usePlans: () => ({ plans: [], selectedPlanId: 'p-default', selectPlan: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('../categories/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({
    customCategories: [{ id: 'c1', name: 'Hóa đơn', icon: null, code: null, kind: 'expense' }],
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))
vi.mock('../banks/BanksContext', () => ({
  useBanks: () => ({ banks: [{ id: 'b1', name: 'Techcombank', isDefault: false }], refresh: async () => {} }),
}))
vi.mock('../api/subCategoryApi', () => ({ getSubCategories: vi.fn().mockResolvedValue([]) }))
vi.mock('../api/recurringPaymentApi', () => ({
  getRecurringPayments: vi.fn(),
  createRecurringPayment: vi.fn(),
  updateRecurringPayment: vi.fn(),
  deleteRecurringPayment: vi.fn(),
  getSchedule: vi.fn(),
  getRecords: vi.fn().mockResolvedValue([]),
  createRecord: vi.fn(),
  deleteRecord: vi.fn(),
}))
vi.mock('../api/accountApi', () => ({ getAccounts: vi.fn() }))
vi.mock('../api/transactionApi', () => ({ createTransaction: vi.fn(), deleteTransaction: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// Stub the form: expose the prefill and let the test submit it with an edited amount.
vi.mock('../components/TransactionFormModal', () => ({
  TransactionFormModal: ({
    open,
    prefill,
    onSubmit,
  }: {
    open: boolean
    prefill?: Record<string, unknown>
    onSubmit: (v: Record<string, unknown>) => void
  }) =>
    open ? (
      <div data-testid="tx-form">
        <span data-testid="tx-prefill">{JSON.stringify(prefill)}</span>
        <button onClick={() => onSubmit({ ...prefill, amount: 2_500_000, planId: null, payWithAccountId: 'a-od' })}>tx-submit</button>
      </div>
    ) : null,
}))

const vnd = (amount: number) => ({ amount, currency: 'VND' })
const norm = (s: string | null) => (s ?? '').replace(/\s/g, ' ')
const fmt = (n: number) => norm(formatMoney(vnd(n)))

const item = (over: Partial<RecurringPaymentResponse>): RecurringPaymentResponse => ({
  id: 'i',
  name: 'x',
  categoryId: 'c1',
  subCategoryId: null,
  amount: vnd(0),
  isVariable: false,
  dayOfMonth: 1,
  paymentMethod: null,
  bank: null,
  note: null,
  isActive: true,
  startPeriod: null,
  savingsBank: null,
  accountId: null,
  ...over,
})

const paidRecord = { id: 'rec1', recurringPaymentId: 'i-paid', period: '2026-11', amount: vnd(1_600_000), paidDate: '2026-11-02', transactionId: null }

const schedule: RecurringScheduleItemResponse[] = [
  { item: item({ id: 'i-paid', name: 'Gửi xe', amount: vnd(1_600_000) }), dueDate: '2026-11-02', record: paidRecord },
  { item: item({ id: 'i-over', name: 'Tiền điện', isVariable: true, paymentMethod: 'transfer', bank: 'Techcombank' }), dueDate: '2026-11-05', record: null },
  { item: item({ id: 'i-soon', name: 'YouTube', amount: vnd(165_556) }), dueDate: '2026-11-12', record: null },
  { item: item({ id: 'i-up', name: 'Nước', isVariable: true, amount: vnd(500_000) }), dueDate: '2026-11-25', record: null },
]

const card: AccountResponse = {
  id: 'a-cc',
  name: 'Visa',
  type: 'credit_card',
  lastDigits: '5678',
  creditLimit: null,
  statementDay: null,
  dueDay: null,
  interestRatePercent: null,
  bankName: null,
  isDefault: false,
  currentBalance: vnd(3_000_000),
  transactionsSinceSnapshot: 0, statementPaidAmount: { amount: 0, currency: 'VND' }, untrackedDebt: null, untrackedDebtRemaining: null,
  latestSnapshot: {
    id: 'snap-1',
    accountId: 'a-cc',
    date: '2026-11-01',
    balance: vnd(3_000_000),
    statementAmount: vnd(3_000_000),
    dueDate: '2026-11-15',
    installmentRemaining: null,
    statementPaid: false,
    note: null,
    statementUntracked: false,
  },
}

function renderPage() {
  return render(
    <I18nProvider>
      <RecurringPage />
    </I18nProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-10T09:00:00'))
  vi.mocked(getSchedule).mockResolvedValue(schedule)
  vi.mocked(getAccounts).mockResolvedValue([card])
  vi.mocked(getRecurringPayments).mockResolvedValue([])
  vi.mocked(createRecord).mockResolvedValue({ id: 'r-new' })
  vi.mocked(createTransaction).mockResolvedValue({ id: 'tx-new' })
  vi.mocked(deleteTransaction).mockResolvedValue(undefined)
  vi.mocked(deleteRecord).mockResolvedValue(undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('RecurringPage', () => {
  it('shows totals and per-row statuses for the month', async () => {
    renderPage()
    const total = await screen.findByTestId('tile-total')
    await screen.findByTestId('row-i-paid')
    expect(norm(total.textContent)).toContain(fmt(5_265_556))
    expect(norm(screen.getByTestId('tile-paid').textContent)).toContain(fmt(1_600_000))
    expect(norm(screen.getByTestId('tile-remaining').textContent)).toContain(fmt(3_665_556))
    expect(getSchedule).toHaveBeenCalledWith('2026-11')

    const paid = screen.getByTestId('row-i-paid')
    expect(within(paid).getByText('recurring.paid', { exact: false })).toBeInTheDocument()
    expect(norm(paid.textContent)).toContain(fmt(1_600_000))
    expect(paid.textContent).toContain('recurring.paidOn')
    expect(within(paid).getByText('recurring.undo')).toBeInTheDocument()

    const over = screen.getByTestId('row-i-over')
    expect(over.textContent).toContain('accounts.overdue 5 accounts.days')
    expect(over.textContent).toContain('recurring.enterAmount')
    // Due date sits in the row's date tile: day number over month/year.
    const overDate = over.querySelector('time')!
    expect(overDate.getAttribute('datetime')).toBe('2026-11-05')
    expect(overDate.textContent).toBe('0511/2026')

    expect(screen.getByTestId('row-i-soon').textContent).toContain('accounts.left 2 accounts.days')
    const up = screen.getByTestId('row-i-up')
    expect(up.textContent).toContain('accounts.left 15 accounts.days')
    expect(up.textContent).not.toContain('recurring.statusUpcoming')
    expect(up.querySelector('.text-expense')).toBeNull()
    expect(norm(up.textContent)).toContain(`≈ ${fmt(500_000)}`)

    const cardRow = screen.getByTestId('card-row-a-cc')
    expect(cardRow.textContent).toContain('•••5678')
    expect(cardRow.textContent).toContain('recurring.cardRow')
    expect(norm(cardRow.textContent)).toContain(fmt(3_000_000))
  })

  it('Ghi nhận creates the transaction then the record with the edited amount', async () => {
    const user = userEvent.setup()
    renderPage()
    const row = await screen.findByTestId('row-i-over')
    await user.click(within(row).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({
      content: 'Tiền điện',
      type: 'out',
      categoryId: 'c1',
      paymentMethod: 'transfer',
      bank: 'Techcombank',
      date: '2026-11-10',
    })
    expect(prefill.amount).toBeUndefined()

    vi.mocked(getSchedule).mockClear()
    await user.click(screen.getByText('tx-submit'))
    await waitFor(() => expect(createRecord).toHaveBeenCalled())
    expect(createTransaction).toHaveBeenCalledWith(expect.objectContaining({ debitAmount: 2_500_000, planId: 'p-default' }))
    expect(createRecord).toHaveBeenCalledWith('i-over', {
      period: '2026-11',
      amount: 2_500_000,
      paidDate: '2026-11-10',
      transactionId: 'tx-new',
    })
    await waitFor(() => expect(getSchedule).toHaveBeenCalled())
  })

  it('does not create a record when createTransaction fails', async () => {
    vi.mocked(createTransaction).mockRejectedValue(new Error('boom'))
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-soon')).getByText('recurring.record'))
    await user.click(await screen.findByText('tx-submit'))
    await waitFor(() => expect(createTransaction).toHaveBeenCalled())
    expect(createRecord).not.toHaveBeenCalled()
  })

  it('toasts and reloads when createRecord conflicts', async () => {
    const { toast } = await import('sonner')
    vi.mocked(createRecord).mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { description: 'AlreadyPaid' } } })
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-soon')).getByText('recurring.record'))
    vi.mocked(getSchedule).mockClear()
    await user.click(await screen.findByText('tx-submit'))
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('AlreadyPaid'))
    expect(screen.queryByTestId('tx-form')).not.toBeInTheDocument()
    expect(createTransaction).toHaveBeenCalledTimes(1)
    expect(deleteTransaction).toHaveBeenCalledWith('tx-new')
    await waitFor(() => expect(getSchedule).toHaveBeenCalled())
  })

  it('still reloads when createRecord fails and the compensating delete also fails', async () => {
    vi.mocked(createRecord).mockRejectedValue(new Error('conflict'))
    vi.mocked(deleteTransaction).mockRejectedValue(new Error('delete failed'))
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-soon')).getByText('recurring.record'))
    vi.mocked(getSchedule).mockClear()
    await user.click(await screen.findByText('tx-submit'))
    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith('tx-new'))
    await waitFor(() => expect(getSchedule).toHaveBeenCalled())
    expect(screen.queryByTestId('tx-form')).not.toBeInTheDocument()
  })

  it('undo ignores double clicks while the request is in flight', async () => {
    let resolve!: () => void
    vi.mocked(deleteRecord).mockImplementation(() => new Promise<void>((r) => (resolve = r)))
    const user = userEvent.setup()
    renderPage()
    const btn = within(await screen.findByTestId('row-i-paid')).getByText('recurring.undo')
    await user.dblClick(btn)
    expect(deleteRecord).toHaveBeenCalledTimes(1)
    expect(btn.closest('button')).toBeDisabled()
    resolve()
    await waitFor(() => expect(btn.closest('button')).not.toBeDisabled())
  })

  it('ignores a late response from a previously selected month', async () => {
    let resolveFirst!: (v: RecurringScheduleItemResponse[]) => void
    vi.mocked(getSchedule)
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce([{ item: item({ id: 'i-dec', name: 'Tháng sau' }), dueDate: '2026-12-03', record: null }])
    renderPage()
    const input = await screen.findByLabelText('recurring.title')
    fireEvent.change(input, { target: { value: '2026-12' } })
    await screen.findByTestId('row-i-dec')
    resolveFirst(schedule)
    await new Promise((r) => setTimeout(r, 20))
    expect(screen.getByTestId('row-i-dec')).toBeInTheDocument()
    expect(screen.queryByTestId('row-i-paid')).not.toBeInTheDocument()
  })

  it('marks paid without a transaction', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-soon')).getByText('recurring.markPaid'))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByText('summary.submit'))
    await waitFor(() => expect(createRecord).toHaveBeenCalled())
    expect(createRecord).toHaveBeenCalledWith('i-soon', {
      period: '2026-11',
      amount: 165_556,
      paidDate: '2026-11-10',
      transactionId: null,
    })
  })

  it('undo deletes the record', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-paid')).getByText('recurring.undo'))
    await waitFor(() => expect(deleteRecord).toHaveBeenCalledWith('rec1'))
  })

  it('card row Ghi nhận pays a tracked statement as a transfer into the card, nothing else', async () => {
    const user = userEvent.setup()
    renderPage()
    const cardRow = await screen.findByTestId('card-row-a-cc')
    expect(within(cardRow).queryByText('accounts.markPaid')).toBeNull()
    await user.click(within(cardRow).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({
      content: 'recurring.cardRow Visa',
      type: 'out',
      amount: 3_000_000,
      date: '2026-11-10',
      transferToAccountId: 'a-cc',
      // Swipes were recorded one by one: paying the card is not spending.
      subCategoryCode: 'account_transfer',
    })

    await user.click(screen.getByText('tx-submit'))
    await waitFor(() => expect(createTransaction).toHaveBeenCalled())
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ debitAmount: 2_500_000, planId: 'p-default', accountId: 'a-od', toAccountId: 'a-cc' }),
    )
    expect(createRecord).not.toHaveBeenCalled()
    expect(deleteTransaction).not.toHaveBeenCalled()
  })

  it('card row Ghi nhận files an untracked statement as card payment spending', async () => {
    vi.mocked(getAccounts).mockResolvedValue([
      { ...card, latestSnapshot: { ...card.latestSnapshot!, statementUntracked: true } },
    ])
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('card-row-a-cc')).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({ transferToAccountId: 'a-cc', subCategoryCode: 'card_payment' })
  })

  it('card row shows what is left after partial payments and prefills it', async () => {
    vi.mocked(getAccounts).mockResolvedValue([{ ...card, statementPaidAmount: vnd(1_000_000) }])
    const user = userEvent.setup()
    renderPage()
    const cardRow = await screen.findByTestId('card-row-a-cc')
    expect(cardRow).toHaveTextContent('accounts.statementRemaining')
    await user.click(within(cardRow).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({ amount: 2_000_000 })
  })

  it('card row is paid once transfers into the card cover the statement', async () => {
    vi.mocked(getAccounts).mockResolvedValue([{ ...card, statementPaidAmount: vnd(3_000_000) }])
    renderPage()
    const cardRow = await screen.findByTestId('card-row-a-cc')
    expect(within(cardRow).getByText('recurring.paid')).toBeInTheDocument()
    expect(within(cardRow).queryByText('recurring.record')).toBeNull()
  })

  it('Ghi nhận pays with the item\'s account', async () => {
    vi.mocked(getSchedule).mockResolvedValue([
      { item: item({ id: 'i-rent', name: 'Tiền nhà', amount: vnd(5_000_000), accountId: 'a-od' }), dueDate: '2026-11-15', record: null },
    ])
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-rent')).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({ amount: 5_000_000, payWithAccountId: 'a-od' })
  })

  it('Ghi nhận prefills Nơi gửi for a savings item', async () => {
    vi.mocked(getSchedule).mockResolvedValue([
      {
        item: item({ id: 'i-sav', name: 'Tiết kiệm Sam & Bắp', amount: vnd(4_000_000), savingsBank: 'Sam & Bắp' }),
        dueDate: '2026-11-15',
        record: null,
      },
    ])
    const user = userEvent.setup()
    renderPage()
    await user.click(within(await screen.findByTestId('row-i-sav')).getByText('recurring.record'))
    const prefill = JSON.parse((await screen.findByTestId('tx-prefill')).textContent!)
    expect(prefill).toMatchObject({ amount: 4_000_000, savingsBank: 'Sam & Bắp' })
  })

  it('manage dialog asks for Nơi gửi only for the savings-book sub-category', async () => {
    vi.mocked(getSubCategories).mockResolvedValue([
      { id: 's-book', categoryId: 'c1', name: 'Sổ tiết kiệm', isDefault: false, icon: null, code: 'savings_book', excludeFromStats: false },
      { id: 's-other', categoryId: 'c1', name: 'Khác', isDefault: false, icon: null, code: null, excludeFromStats: false },
    ] as never)
    vi.mocked(createRecurringPayment).mockResolvedValue({ id: 'new' })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('recurring.manage'))
    await user.click(await screen.findByText('recurring.add'))
    await user.type(await screen.findByLabelText('recurring.name'), 'Tiết kiệm Sam & Bắp')
    await user.type(screen.getByLabelText('recurring.dayOfMonth'), '1')
    await user.click(within(screen.getByLabelText('form.category')).getByRole('radio', { name: 'Hóa đơn' }))
    await user.click(await within(await screen.findByLabelText('form.subCategory')).findByRole('radio', { name: 'Khác' }))
    expect(screen.queryByLabelText('form.savingsBank')).toBeNull()
    await user.click(within(screen.getByLabelText('form.subCategory')).getByRole('radio', { name: 'Sổ tiết kiệm' }))
    await user.type(screen.getByLabelText('form.savingsBank'), 'Sam & Bắp')
    await user.click(screen.getByText('summary.submit'))
    await waitFor(() => expect(createRecurringPayment).toHaveBeenCalled())
    expect(vi.mocked(createRecurringPayment).mock.calls[0][0]).toMatchObject({
      subCategoryId: 's-book',
      savingsBank: 'Sam & Bắp',
    })
  })

  it('manage dialog sends the start month when set', async () => {
    vi.mocked(createRecurringPayment).mockResolvedValue({ id: 'new' })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('recurring.manage'))
    await user.click(await screen.findByText('recurring.add'))
    await user.type(await screen.findByLabelText('recurring.name'), 'Gửi xe')
    await user.type(screen.getByLabelText('recurring.dayOfMonth'), '5')
    fireEvent.change(screen.getByLabelText('recurring.startPeriod'), { target: { value: '2026-12' } })
    await user.click(screen.getByText('summary.submit'))
    await waitFor(() => expect(createRecurringPayment).toHaveBeenCalled())
    expect(vi.mocked(createRecurringPayment).mock.calls[0][0].startPeriod).toBe('2026-12')
  })

  it('manage dialog creates an item with the full input', async () => {
    vi.mocked(createRecurringPayment).mockResolvedValue({ id: 'new' })
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('recurring.manage'))
    await user.click(await screen.findByText('recurring.add'))
    await user.type(await screen.findByLabelText('recurring.name'), 'Internet')
    await user.type(screen.getByLabelText('recurring.amount'), '250000')
    await user.type(screen.getByLabelText('recurring.dayOfMonth'), '7')
    await user.click(within(screen.getByLabelText('form.category')).getByRole('radio', { name: 'Hóa đơn' }))
    await user.click(screen.getByLabelText('recurring.isVariable'))
    await user.click(screen.getByText('Techcombank'))
    await user.click(screen.getByText('summary.submit'))
    await waitFor(() => expect(createRecurringPayment).toHaveBeenCalled())
    expect(createRecurringPayment).toHaveBeenCalledWith({
      name: 'Internet',
      categoryId: 'c1',
      subCategoryId: null,
      amount: 250_000,
      isVariable: true,
      dayOfMonth: 7,
      paymentMethod: null,
      bank: 'Techcombank',
      note: null,
      isActive: true,
      startPeriod: null,
      savingsBank: null,
      accountId: null,
    })
  })

  it('hero tracker shows one block per recurring item (no card statements), coloured by status in due-date order', async () => {
    renderPage()
    await screen.findByTestId('row-i-paid')
    const tracker = screen.getByTestId('hero-tracker')
    const blocks = Array.from(tracker.children)
    // paid 02/11, overdue 05/11, due soon 12/11, upcoming 25/11 — the 15/11 card statement is left out.
    expect(blocks).toHaveLength(4)
    const colours = blocks.map((b) => (b.firstElementChild as HTMLElement).className)
    expect(colours[0]).toContain('bg-emerald-500')
    expect(colours[1]).toContain('bg-rose-500')
    expect(colours[2]).toContain('bg-amber-400')
    expect(colours[3]).toContain('bg-slate-500')
  })

  it('hides the hero tracker when nothing is due this month', async () => {
    vi.mocked(getSchedule).mockResolvedValue([])
    vi.mocked(getAccounts).mockResolvedValue([])
    renderPage()
    await screen.findByText('recurring.empty')
    expect(screen.queryByTestId('hero-tracker')).toBeNull()
  })

  it('manage dialog badges inactive items as paused', async () => {
    vi.mocked(getRecurringPayments).mockResolvedValue([
      item({ id: 'on', name: 'Netflix' }),
      item({ id: 'off', name: 'Gym', isActive: false }),
    ])
    const user = userEvent.setup()
    renderPage()
    await user.click(await screen.findByText('recurring.manage'))
    const off = await screen.findByTestId('manage-off')
    expect(within(off).getByTestId('paused-off')).toHaveTextContent('recurring.paused')
    expect(within(screen.getByTestId('manage-on')).queryByText('recurring.paused')).toBeNull()
  })

  it('history dialog shows an empty state when there are no records', async () => {
    const user = userEvent.setup()
    renderPage()
    const row = await screen.findByTestId('row-i-over')
    await user.click(within(row).getByText('recurring.history'))
    expect(await screen.findByTestId('records-empty')).toHaveTextContent('recurring.noRecords')
  })

  it('history dialog lists records without the empty state', async () => {
    vi.mocked(getRecords).mockResolvedValueOnce([paidRecord])
    const user = userEvent.setup()
    renderPage()
    const row = await screen.findByTestId('row-i-paid')
    await user.click(within(row).getByText('recurring.history'))
    const dialog = await screen.findByRole('dialog')
    expect(await within(dialog).findByText('recurring.paidOn 02/11/2026')).toBeInTheDocument()
    expect(within(dialog).queryByTestId('records-empty')).toBeNull()
  })
})
