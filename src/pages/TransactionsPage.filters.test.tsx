import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import dayjs from 'dayjs'
import { I18nProvider } from '../i18n/I18nContext'
import { getMonthlySummary } from '../api/transactionApi'
import { TransactionsPage } from './TransactionsPage'

// Filter-card behaviour (header toggle, date range). Kept apart from TransactionsPage.test.tsx.

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../plans/PlanContext', () => ({
  usePlans: () => ({
    plans: [{ id: 'p-default', name: 'Sổ chính', isDefault: true }],
    selectedPlanId: 'p-default',
    selectPlan: vi.fn(),
    refresh: vi.fn(),
  }),
}))

vi.mock('../categories/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({ customCategories: [], refresh: vi.fn().mockResolvedValue(undefined) }),
}))

vi.mock('../beneficiaries/BeneficiariesContext', () => ({
  useBeneficiaries: () => ({ beneficiaries: [], refresh: vi.fn() }),
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

vi.mock('../components/TransactionFormModal', () => ({
  TransactionFormModal: () => null,
}))
vi.mock('../components/ImportTransactionsDialog', () => ({
  ImportTransactionsDialog: () => null,
}))

const renderPage = () =>
  render(
    <I18nProvider>
      <TransactionsPage />
    </I18nProvider>,
  )

const amountInput = () => screen.queryByLabelText('filters.amountFrom')

beforeEach(() => {
  vi.mocked(getMonthlySummary).mockReset()
  vi.mocked(getMonthlySummary).mockResolvedValue({
    items: [],
    totalCredit: { amount: 0, currency: 'VND' },
    totalDebit: { amount: 0, currency: 'VND' },
    balance: { amount: 0, currency: 'VND' },
  })
})

describe('TransactionsPage filter header', () => {
  it('clicking the title expands and, once open, collapses the card', async () => {
    renderPage()

    await userEvent.click(await screen.findByText('filters.title'))
    expect(amountInput()).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'filters.collapse' })).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(screen.getByText('filters.title'))
    expect(amountInput()).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'filters.expand' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('clicking the chevron toggles both ways', async () => {
    renderPage()
    await screen.findByText('filters.title')

    await userEvent.click(screen.getByTestId('filters-chevron'))
    expect(amountInput()).toBeInTheDocument()

    await userEvent.click(screen.getByTestId('filters-chevron'))
    expect(amountInput()).not.toBeInTheDocument()
  })

  it('the header is a single keyboard toggle (no nested buttons)', async () => {
    renderPage()
    const header = await screen.findByRole('button', { name: 'filters.expand' })
    expect(within(header).queryByRole('button')).toBeNull()
    expect(header).toHaveTextContent('filters.title')

    header.focus()
    await userEvent.keyboard('{Enter}')
    expect(amountInput()).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(amountInput()).not.toBeInTheDocument()
  })
})

describe('TransactionsPage date range filter', () => {
  it('defaults to the current month via the month param and replaces the month/year selects', async () => {
    renderPage()
    await waitFor(() => expect(getMonthlySummary).toHaveBeenCalledWith(dayjs().format('YYYY-MM'), 'p-default'))

    await userEvent.click(await screen.findByText('filters.title'))
    const trigger = screen.getByRole('button', { name: 'filters.dateRange' })
    const start = dayjs().startOf('month').format('DD/MM/YYYY')
    const end = dayjs().endOf('month').format('DD/MM/YYYY')
    expect(trigger).toHaveTextContent(`${start} – ${end}`)
    expect(screen.queryByText('filters.month')).not.toBeInTheDocument()
  })

  it('picking 05 → 20 requests exactly that day range and updates the header', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('filters.title'))
    await userEvent.click(screen.getByRole('button', { name: 'filters.dateRange' }))

    // Two months are shown; the first is the range's month (the current one).
    const [firstMonth] = await screen.findAllByRole('grid')
    await userEvent.click(within(firstMonth).getByText('5'))
    await userEvent.click(within(firstMonth).getByText('20'))
    await userEvent.click(screen.getByRole('button', { name: 'filters.apply' }))

    const from = dayjs().date(5).format('YYYY-MM-DD')
    const to = dayjs().date(20).format('YYYY-MM-DD')
    await waitFor(() => expect(getMonthlySummary).toHaveBeenLastCalledWith({ from, to }, 'p-default'))
    expect(
      screen.getByText(new RegExp(`^${dayjs(from).format('DD/MM')} → ${dayjs(to).format('DD/MM/YYYY')} ·`)),
    ).toBeInTheDocument()
  })

  it('only rows the API returns for the range are listed', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('filters.title'))
    vi.mocked(getMonthlySummary).mockImplementation(async (period) => ({
      items:
        typeof period === 'string'
          ? []
          : [
              {
                id: 'in-range',
                date: period.from,
                content: 'Trong khoảng',
                credit: { amount: 0, currency: 'VND' },
                debit: { amount: 50_000, currency: 'VND' },
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
              },
            ],
      totalCredit: { amount: 0, currency: 'VND' },
      totalDebit: { amount: 50_000, currency: 'VND' },
      balance: { amount: -50_000, currency: 'VND' },
    }))

    await userEvent.click(screen.getByRole('button', { name: 'filters.dateRange' }))
    const [firstMonth] = await screen.findAllByRole('grid')
    await userEvent.click(within(firstMonth).getByText('3'))
    await userEvent.click(within(firstMonth).getByText('3'))
    await userEvent.click(screen.getByRole('button', { name: 'filters.apply' }))

    const day = dayjs().date(3).format('YYYY-MM-DD')
    await waitFor(() => expect(getMonthlySummary).toHaveBeenLastCalledWith({ from: day, to: day }, 'p-default'))
    expect(await screen.findByText('Trong khoảng')).toBeInTheDocument()
  })

  it('cancel keeps the previous range', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('filters.title'))
    await waitFor(() => expect(getMonthlySummary).toHaveBeenCalledTimes(1))
    await userEvent.click(screen.getByRole('button', { name: 'filters.dateRange' }))

    const [firstMonth] = await screen.findAllByRole('grid')
    await userEvent.click(within(firstMonth).getByText('5'))
    await userEvent.click(screen.getByRole('button', { name: 'summary.cancel' }))

    expect(getMonthlySummary).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'filters.dateRange' })).toHaveTextContent(
      dayjs().startOf('month').format('DD/MM/YYYY'),
    )
  })

  it('the last-month preset sends that month, and reset returns to the current month', async () => {
    renderPage()
    await userEvent.click(await screen.findByText('filters.title'))
    await userEvent.click(screen.getByRole('button', { name: 'filters.dateRange' }))
    await userEvent.click(await screen.findByRole('button', { name: 'filters.lastMonth' }))
    await userEvent.click(screen.getByRole('button', { name: 'filters.apply' }))

    const lastMonth = dayjs().subtract(1, 'month').format('YYYY-MM')
    await waitFor(() => expect(getMonthlySummary).toHaveBeenLastCalledWith(lastMonth, 'p-default'))

    await userEvent.click(screen.getByRole('button', { name: /filters\.reset/ }))
    await waitFor(() =>
      expect(getMonthlySummary).toHaveBeenLastCalledWith(dayjs().format('YYYY-MM'), 'p-default'),
    )
  })
})
