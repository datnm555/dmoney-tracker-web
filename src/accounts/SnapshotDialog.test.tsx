import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { I18nProvider } from '../i18n/I18nContext'
import { createSnapshot, updateSnapshot } from '../api/accountApi'
import { getCategories } from '../api/categoryApi'
import { createTransaction, deleteTransaction } from '../api/transactionApi'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { SnapshotDialog } from './SnapshotDialog'

vi.mock('../api/resourceApi', () => ({ getResources: vi.fn().mockResolvedValue({}) }))
vi.mock('../api/accountApi', () => ({ createSnapshot: vi.fn(), updateSnapshot: vi.fn() }))
vi.mock('../api/categoryApi', () => ({ getCategories: vi.fn() }))
vi.mock('../api/transactionApi', () => ({ createTransaction: vi.fn(), deleteTransaction: vi.fn() }))

// Same clock as the dialog's default date (local time), so the test holds around midnight too.
const TODAY = dayjs().format('YYYY-MM-DD')

function account(over: Partial<AccountResponse> = {}): AccountResponse {
  return {
    id: 'momo',
    name: 'Ví Momo',
    type: 'ewallet',
    lastDigits: '0555',
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    latestSnapshot: { id: 's0', date: '2026-01-01', balance: { amount: 400_000, currency: 'VND' } } as AccountSnapshotResponse,
    bankName: 'MoMo',
    isDefault: false,
    currentBalance: { amount: 400_000, currency: 'VND' },
    transactionsSinceSnapshot: 0,
    statementPaidAmount: { amount: 0, currency: 'VND' },
    untrackedDebt: null,
    untrackedDebtRemaining: null,
    ...over,
  }
}

function renderDialog(acc: AccountResponse, editing: AccountSnapshotResponse | null = null) {
  const onSaved = vi.fn()
  const onClose = vi.fn()
  const onIncome = vi.fn()
  render(
    <I18nProvider>
      <SnapshotDialog
        account={acc}
        editing={editing}
        planId="plan-1"
        onClose={onClose}
        onSaved={onSaved}
        onIncome={onIncome}
      />
    </I18nProvider>,
  )
  return { onSaved, onClose, onIncome }
}

async function typeBalance(value: string) {
  const input = await waitFor(() => {
    const el = document.querySelector<HTMLInputElement>('#snap-balance')
    if (!el) throw new Error('balance input not rendered')
    return el
  })
  await userEvent.clear(input)
  await userEvent.type(input, value)
}

beforeEach(() => {
  vi.mocked(createSnapshot).mockReset().mockResolvedValue({ id: 's1' } as never)
  vi.mocked(updateSnapshot).mockReset().mockResolvedValue(undefined as never)
  vi.mocked(createTransaction).mockReset().mockResolvedValue({ id: 'tx1' })
  vi.mocked(deleteTransaction).mockReset().mockResolvedValue(undefined)
  vi.mocked(getCategories).mockReset().mockResolvedValue([
    { id: 'food', name: 'Ăn uống', icon: '', code: 'food', kind: 'expense', excludeFromStats: false },
    { id: 'other-out', name: 'Khác', icon: '', code: 'other', kind: 'expense', excludeFromStats: false },
  ])
})

describe('SnapshotDialog balance difference', () => {
  it('records a lower balance as "Khác" spending before the reading', async () => {
    const { onSaved } = renderDialog(account())
    await typeBalance('80000')
    expect(await screen.findByRole('checkbox', { checked: true })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(createSnapshot).toHaveBeenCalled())
    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        debitAmount: 320_000,
        creditAmount: 0,
        categoryId: 'other-out',
        accountId: 'momo',
        planId: 'plan-1',
        date: TODAY,
        content: 'accounts.diffContent Ví Momo',
      }),
    )
    expect(vi.mocked(createTransaction).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(createSnapshot).mock.invocationCallOrder[0],
    )
    expect(createSnapshot).toHaveBeenCalledWith('momo', expect.objectContaining({ balance: 80_000, date: TODAY }))
    expect(onSaved).toHaveBeenCalled()
  })

  it('saves only the reading when the tick is cleared', async () => {
    renderDialog(account())
    await typeBalance('80000')
    await userEvent.click(await screen.findByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(createSnapshot).toHaveBeenCalled())
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('removes the difference transaction when the reading fails', async () => {
    vi.mocked(createSnapshot).mockRejectedValue(new Error('boom'))
    const { onSaved } = renderDialog(account())
    await typeBalance('80000')
    await userEvent.click(await screen.findByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(deleteTransaction).toHaveBeenCalledWith('tx1'))
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('sends a higher balance to the transaction form instead of saving it', async () => {
    const { onIncome } = renderDialog(account())
    await typeBalance('500000')
    expect(await screen.findByRole('alert')).toHaveTextContent('accounts.diffIncomeWarning')
    await userEvent.click(screen.getByRole('button', { name: 'accounts.diffRecordIncome' }))

    expect(onIncome).toHaveBeenCalledWith(
      expect.objectContaining({ balance: 500_000, amount: 100_000, date: TODAY }),
    )
    expect(createSnapshot).not.toHaveBeenCalled()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('can still save a higher balance alone', async () => {
    const { onIncome } = renderDialog(account())
    await typeBalance('500000')
    await userEvent.click(await screen.findByRole('button', { name: 'accounts.saveBalanceOnly' }))

    await waitFor(() => expect(createSnapshot).toHaveBeenCalledWith('momo', expect.objectContaining({ balance: 500_000 })))
    expect(onIncome).not.toHaveBeenCalled()
    expect(createTransaction).not.toHaveBeenCalled()
  })

  it('offers nothing for cash accounts', async () => {
    renderDialog(account({ type: 'cash' }))
    await typeBalance('80000')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers nothing when editing an existing reading', async () => {
    const old = { id: 's0', date: '2026-01-01', balance: { amount: 400_000, currency: 'VND' }, note: null } as AccountSnapshotResponse
    renderDialog(account(), old)
    await typeBalance('80000')
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    await waitFor(() => expect(updateSnapshot).toHaveBeenCalled())
    expect(createTransaction).not.toHaveBeenCalled()
  })
})
