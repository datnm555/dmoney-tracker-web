import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import { I18nProvider } from '../i18n/I18nContext'
import type { TransactionResponse } from '../api/types'
import { withAlpha } from '../utils/color'
import { formatMoney } from '../utils/money'
import { groupTransactionsByDay } from '../utils/transactionGroups'
import { TransactionDayList } from './TransactionDayList'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../categories/CategoriesContext', () => ({
  useCategories: () => ({ customCategories: [], refresh: vi.fn() }),
}))

// Intl uses non-breaking spaces (U+00A0); normalize before asserting.
const fmt = (amount: number) => formatMoney({ amount, currency: 'VND' }).replace(/\s/g, ' ')

const today = dayjs().format('YYYY-MM-DD')
const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

const tx = (overrides: Partial<TransactionResponse>): TransactionResponse => ({
  id: 'tx',
  date: today,
  content: '',
  credit: { amount: 0, currency: 'VND' },
  debit: { amount: 0, currency: 'VND' },
  note: null,
  categoryId: null,
  paymentMethod: 'cash',
  cardType: null,
  bank: null,
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
  savingsBank: null,
  excludedFromStats: false,
  accountId: null,
  toAccountId: null,
  ...overrides,
})

const dayTitle = (date: string) => (date === today ? 'transactions.today' : 'weekday')

function renderList(items: TransactionResponse[], onEdit = vi.fn(), onDelete = vi.fn()) {
  render(
    <I18nProvider>
      <TransactionDayList
        groups={groupTransactionsByDay(items)}
        dayTitle={dayTitle}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </I18nProvider>,
  )
  return { onEdit, onDelete }
}

describe('TransactionDayList', () => {
  it('shows the empty state when there are no groups', async () => {
    renderList([])
    expect(await screen.findByText('summary.empty')).toBeInTheDocument()
    expect(screen.queryByTestId('day-group')).not.toBeInTheDocument()
  })

  it('renders one card per day, newest first, with the day title and net pill', async () => {
    renderList([
      tx({ id: 'a', date: yesterday, content: 'Ăn trưa', debit: { amount: 120_000, currency: 'VND' } }),
      tx({ id: 'b', content: 'Lương', credit: { amount: 5_000_000, currency: 'VND' } }),
      tx({ id: 'c', content: 'Cafe', debit: { amount: 50_000, currency: 'VND' } }),
    ])

    const days = await screen.findAllByTestId('day-group')
    expect(days).toHaveLength(2)
    expect(days[0]).toHaveTextContent(`transactions.today · ${dayjs(today).format('DD/MM')}`)
    expect(days[0]).toHaveTextContent(`transactions.net +${fmt(4_950_000)}`)
    expect(within(days[0]).getAllByTestId('transaction-row')).toHaveLength(2)
    // In/out split bar only when the day has money moving.
    expect(within(days[0]).getByLabelText('Category bar')).toBeInTheDocument()

    expect(days[1]).toHaveTextContent('weekday')
    expect(within(days[1]).getAllByText(`−${fmt(120_000)}`)).toHaveLength(2) // row pill + day net
  })

  it('renders the meta chips, note and linked rows', async () => {
    renderList([
      tx({
        id: 'a',
        content: 'Gửi tiết kiệm',
        debit: { amount: 10_000_000, currency: 'VND' },
        paymentMethod: 'transfer',
        bank: 'VPBank',
        savingsBank: 'Vietinbank',
        subCategoryName: 'Kỳ hạn 6T',
        beneficiaryName: 'Con',
        isAdvance: true,
        excludedFromStats: true,
        note: 'lãi 5%',
        links: [
          {
            id: 'l1',
            relation: 'reimbursedBy',
            date: today,
            content: 'Hoàn ứng',
            credit: { amount: 10_000_000, currency: 'VND' },
            debit: { amount: 0, currency: 'VND' },
          },
        ],
      }),
    ])

    expect(await screen.findByText('→ Vietinbank')).toBeInTheDocument()
    expect(screen.getByText('VPBank')).toBeInTheDocument()
    expect(screen.getByText('Kỳ hạn 6T')).toBeInTheDocument()
    expect(screen.getByText('Con')).toBeInTheDocument()
    expect(screen.getByText('payment.transfer')).toBeInTheDocument()
    expect(screen.getByText('form.isAdvance')).toBeInTheDocument()
    expect(screen.getByText('summary.excludedBadge')).toBeInTheDocument()
    expect(screen.getByText('form.note: lãi 5%')).toBeInTheDocument()
    expect(screen.getByText('links.reimbursedBy')).toBeInTheDocument()
    expect(screen.getByText(`+${fmt(10_000_000)}`)).toBeInTheDocument()
  })

  it('wires the edit and delete buttons to the row transaction', async () => {
    const item = tx({ id: 'a', content: 'Cafe', debit: { amount: 50_000, currency: 'VND' } })
    const { onEdit, onDelete } = renderList([item])

    await userEvent.click(await screen.findByRole('button', { name: 'summary.edit Cafe' }))
    expect(onEdit).toHaveBeenCalledWith(item)

    await userEvent.click(screen.getByRole('button', { name: 'summary.delete Cafe' }))
    expect(onDelete).toHaveBeenCalledWith(item)
  })
})

describe('withAlpha', () => {
  it('appends a two-digit alpha to #rrggbb and passes other values through', () => {
    expect(withAlpha('#0d9488', 0.1)).toBe('#0d94881a')
    expect(withAlpha('#0d9488', 1)).toBe('#0d9488ff')
    expect(withAlpha('red', 0.5)).toBe('red')
  })
})
