import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { I18nProvider } from '../i18n/I18nContext'
import { getMonthlySummary } from '../api/transactionApi'
import type { TransactionResponse } from '../api/types'
import { formatMoney } from '../utils/money'
import { TransactionsPage } from './TransactionsPage'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../plans/PlanContext', () => ({
  usePlans: () => ({
    plans: [
      { id: 'p-default', name: 'Sổ chính', isDefault: true },
      { id: 'p-trip', name: 'Du lịch', isDefault: false },
    ],
    selectedPlanId: 'p-default',
    selectPlan: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('../categories/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({
    customCategories: [],
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn().mockResolvedValue([]),
}))

vi.mock('../api/transactionApi', () => ({
  getMonthlySummary: vi.fn(),
  createTransaction: vi.fn(),
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}))

// The page only needs these rendered while their dialogs are closed.
vi.mock('../components/TransactionFormModal', () => ({
  TransactionFormModal: () => null,
}))
vi.mock('../components/ImportTransactionsDialog', () => ({
  ImportTransactionsDialog: () => null,
}))

// Intl uses non-breaking spaces (U+00A0); normalize before asserting.
const fmt = (amount: number) => formatMoney({ amount, currency: 'VND' }).replace(/\s/g, ' ')

const tx = (overrides: Partial<TransactionResponse>): TransactionResponse => ({
  id: 'tx',
  date: dayjs().format('YYYY-MM-DD'),
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
  ...overrides,
})

describe('TransactionsPage summary card', () => {
  it('totals follow the active filters instead of the whole month', async () => {
    vi.mocked(getMonthlySummary).mockResolvedValue({
      items: [
        tx({ id: 't1', content: 'Lương tháng 7', credit: { amount: 10_000_000, currency: 'VND' } }),
        tx({ id: 't2', content: 'Thưởng', credit: { amount: 3_000_000, currency: 'VND' } }),
        tx({ id: 't3', content: 'Ăn trưa', debit: { amount: 2_000_000, currency: 'VND' } }),
        tx({ id: 't4', content: 'Cafe', debit: { amount: 500_000, currency: 'VND' } }),
      ],
      totalCredit: { amount: 13_000_000, currency: 'VND' },
      totalDebit: { amount: 2_500_000, currency: 'VND' },
      balance: { amount: 10_500_000, currency: 'VND' },
    })

    render(
      <I18nProvider>
        <TransactionsPage />
      </I18nProvider>,
    )

    // No filter: card shows the whole month.
    expect(await screen.findByText(`+${fmt(13_000_000)}`)).toBeInTheDocument()
    expect(screen.getByText(`−${fmt(2_500_000)}`)).toBeInTheDocument()

    // Filters start collapsed; expand before touching the inputs.
    await userEvent.click(screen.getByRole('button', { name: 'filters.expand' }))

    // Amount ≥ 5.000.000 leaves only the 10M salary.
    await userEvent.type(screen.getByLabelText('filters.amountFrom'), '5000000')

    expect(screen.queryByText(`+${fmt(13_000_000)}`)).not.toBeInTheDocument()
    expect(screen.queryByText(`−${fmt(2_500_000)}`)).not.toBeInTheDocument()
    // Card credit total plus the matching row itself.
    expect(screen.getAllByText(`+${fmt(10_000_000)}`)).toHaveLength(2)
    expect(screen.getByText(`−${fmt(0)}`)).toBeInTheDocument()
  })

  it('filters start collapsed and toggle from the header button', async () => {
    vi.mocked(getMonthlySummary).mockResolvedValue({
      items: [],
      totalCredit: { amount: 0, currency: 'VND' },
      totalDebit: { amount: 0, currency: 'VND' },
      balance: { amount: 0, currency: 'VND' },
    })
    render(
      <I18nProvider>
        <TransactionsPage />
      </I18nProvider>,
    )

    expect(await screen.findByText('filters.title')).toBeInTheDocument()
    expect(screen.queryByLabelText('filters.amountFrom')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'filters.expand' }))
    expect(screen.getByLabelText('filters.amountFrom')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'filters.collapse' }))
    expect(screen.queryByLabelText('filters.amountFrom')).not.toBeInTheDocument()
  })

  it('loads the summary scoped to the selected plan', async () => {
    vi.mocked(getMonthlySummary).mockResolvedValue({
      items: [],
      totalCredit: { amount: 0, currency: 'VND' },
      totalDebit: { amount: 0, currency: 'VND' },
      balance: { amount: 0, currency: 'VND' },
    })
    render(
      <I18nProvider>
        <TransactionsPage />
      </I18nProvider>,
    )
    await waitFor(() =>
      expect(getMonthlySummary).toHaveBeenCalledWith(dayjs().format('YYYY-MM'), 'p-default'),
    )
  })
})
