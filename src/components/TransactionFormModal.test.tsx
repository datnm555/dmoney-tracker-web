import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import { TransactionFormModal } from './TransactionFormModal'
import { getAccounts } from '../api/accountApi'
import { beforeEach } from 'vitest'

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

vi.mock('../beneficiaries/BeneficiariesContext', () => ({
  useBeneficiaries: () => ({
    beneficiaries: [
      { id: 'b-me', name: 'Tôi', isDefault: true },
      { id: 'b-con', name: 'Con', isDefault: false },
    ],
    refresh: vi.fn(),
  }),
}))

vi.mock('../gold/GoldTypesContext', () => ({
  useGoldTypes: () => ({
    goldTypes: [
      { id: 'g-ring', name: 'Nhẫn trơn' },
      { id: 'g-sjc', name: 'SJC' },
    ],
    refresh: vi.fn(),
  }),
}))

vi.mock('../purchasePlaces/PurchasePlacesContext', () => ({
  usePurchasePlaces: () => ({
    purchasePlaces: [{ id: 'p-sjc', name: 'SJC' }],
    refresh: vi.fn(),
  }),
}))

vi.mock('../banks/BanksContext', () => ({
  useBanks: () => ({
    banks: [
      { id: 'b-momo', name: 'MoMo', isDefault: false },
      { id: 'b-tcb', name: 'Techcombank', isDefault: true },
    ],
    refresh: vi.fn(),
  }),
}))

vi.mock('../categories/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({
    customCategories: [
      { id: 'cat-bills', name: 'Hóa đơn', icon: 'zap', code: 'bills', kind: 'expense' },
      { id: 'cat-savings', name: 'Tích luỹ', icon: 'piggy-bank', code: 'savings', kind: 'both' },
    ],
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn().mockResolvedValue([
    { id: 'sub-1', categoryId: 'cat-bills', name: 'Xăng', isDefault: true, icon: null, code: null },
    { id: 'sub-book', categoryId: 'cat-savings', name: 'Sổ tiết kiệm', isDefault: false, icon: null, code: 'savings_book' },
    { id: 'sub-gold', categoryId: 'cat-savings', name: 'Vàng', isDefault: false, icon: null, code: null },
  ]),
}))

vi.mock('../api/accountApi', () => ({
  getAccounts: vi.fn(),
}))

vi.mock('../api/transactionApi', () => ({
  getCredits: vi.fn().mockResolvedValue([]),
  getOpenAdvances: vi.fn().mockResolvedValue([
    {
      id: 'adv-1',
      date: '2026-07-01',
      content: 'Ứng trước tiền xe',
      debit: { amount: 2_000_000, currency: 'VND' },
    },
  ]),
  getPrepaidCredits: vi.fn().mockResolvedValue([
    {
      id: 'pre-1',
      date: '2026-01-05',
      content: 'Sinh hoạt 5 tháng',
      credit: { amount: 25_000_000, currency: 'VND' },
      prepaidFrom: '2026-01-01',
      prepaidTo: '2026-05-31',
    },
  ]),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

const baseEditingFixture = {
  id: '1',
  date: '2026-07-08',
  content: 'Netflix',
  credit: { amount: 0, currency: 'VND' },
  debit: { amount: 260000, currency: 'VND' },
  note: null,
  categoryId: 'cat-bills',
  paymentMethod: 'transfer',
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
}

async function pickCategory() {
  await userEvent.click(await screen.findByRole('button', { name: /Hóa đơn/ }))
}

async function openPayWithOther() {
  const toggle = await screen.findByRole('button', { name: 'form.payWithOther' })
  if (toggle.getAttribute('aria-expanded') !== 'true') await userEvent.click(toggle)
}

beforeEach(() => {
  vi.mocked(getAccounts).mockReset()
  vi.mocked(getAccounts).mockResolvedValue([])
})

async function openMoreOptions() {
  await userEvent.click(await screen.findByRole('button', { name: 'form.moreOptions' }))
}

function renderModal(onSubmit = vi.fn(), extra: Partial<React.ComponentProps<typeof TransactionFormModal>> = {}) {
  render(
    <Wrapper>
      <TransactionFormModal open editing={null} submitting={false} onSubmit={onSubmit} onCancel={() => {}} {...extra} />
    </Wrapper>,
  )
  return onSubmit
}

describe('TransactionFormModal', () => {
  it('applies prefill in create mode (keeping a prefilled sub-category) and submits it', async () => {
    const onSubmit = renderModal(vi.fn(), {
      prefill: {
        content: 'Netflix',
        amount: 260000,
        categoryId: 'cat-savings',
        subCategoryId: 'sub-gold',
        paymentMethod: 'transfer',
        bank: 'MoMo',
        date: '2026-11-15',
        note: 'tháng 11',
      },
    })

    expect(await screen.findByLabelText('form.content')).toHaveValue('Netflix')
    await waitFor(() => expect(screen.getByLabelText('form.amount')).toHaveValue('260.000'))
    // Let the sub-category list load so the default auto-pick could fire.
    await new Promise((r) => setTimeout(r, 50))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Netflix',
        amount: 260000,
        categoryId: 'cat-savings',
        subCategoryId: 'sub-gold',
        paymentMethod: 'transfer',
        bank: 'MoMo',
        date: '2026-11-15',
        note: 'tháng 11',
      }),
    )
  })

  it('rounds a fractional prefill amount to an integer', async () => {
    renderModal(vi.fn(), { prefill: { amount: 165556.5 } })
    await waitFor(() => expect(screen.getByLabelText('form.amount')).toHaveValue('165.557'))
  })

  it('ignores prefill in edit mode', async () => {
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={baseEditingFixture}
          submitting={false}
          prefill={{ content: 'Other', amount: 1 }}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )
    expect(await screen.findByLabelText('form.content')).toHaveValue('Netflix')
  })

  it('rejects submit when amount is empty', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(await screen.findByText('form.amountRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires a card type when paying by card', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Netflix')
    await userEvent.type(screen.getByLabelText('form.amount'), '260000')
    await openPayWithOther()
    await userEvent.click(screen.getByRole('radio', { name: 'payment.card' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(await screen.findByText('form.cardTypeRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits mapped values for a card expense', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Netflix')
    await userEvent.type(screen.getByLabelText('form.amount'), '260000')
    await pickCategory()
    await openPayWithOther()
    await userEvent.click(screen.getByRole('radio', { name: 'payment.card' }))
    await userEvent.click(await screen.findByRole('radio', { name: 'payment.cardType.debit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Techcombank' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Netflix',
        type: 'out',
        amount: 260000,
        paymentMethod: 'card',
        cardType: 'debit',
        bank: 'Techcombank',
      }),
    )
  })

  it('renders bank chips from the user catalog and submits the picked name', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Cà phê')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await openPayWithOther()
    // Both catalog entries render as chips; MoMo comes from the user's list.
    await userEvent.click(screen.getByRole('button', { name: 'MoMo' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ bank: 'MoMo' }))
  })

  it('defaults to transfer money-out with no card fields', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'out',
        amount: 50000,
        paymentMethod: 'transfer',
        cardType: null,
        // The default bank from the catalog is preselected on a new transaction.
        bank: 'Techcombank',
      }),
    )
  })

  it('preselects the default beneficiary on a money-out transaction', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    expect(await screen.findByRole('combobox', { name: 'form.beneficiary' })).toHaveTextContent('Tôi')

    await userEvent.type(screen.getByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ beneficiaryId: 'b-me' }))
  })

  it('clears the beneficiary when switching to money-in', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await screen.findByRole('combobox', { name: 'form.beneficiary' })
    await userEvent.click(screen.getByRole('button', { name: /form\.moneyIn/ }))

    expect(screen.queryByRole('combobox', { name: 'form.beneficiary' })).not.toBeInTheDocument()

    await userEvent.type(screen.getByLabelText('form.content'), 'Nhận lương')
    await userEvent.type(screen.getByLabelText('form.amount'), '1000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: 'in', beneficiaryId: null }))
  })

  it('submits the picked beneficiary', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.click(await screen.findByRole('combobox', { name: 'form.beneficiary' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Con' }))

    await userEvent.type(screen.getByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ beneficiaryId: 'b-con' }))
  })

  it('submits isAdvance when the advance checkbox is ticked', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Tiền xe bus ứng trước')
    await userEvent.type(screen.getByLabelText('form.amount'), '2000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.isAdvance' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isAdvance: true }))
  })

  it('money-in shows the reimburse checkbox instead of the advance checkbox', async () => {
    renderModal()
    await openMoreOptions()

    await screen.findByLabelText('form.content')
    expect(screen.getByRole('checkbox', { name: 'form.isAdvance' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /form\.moneyIn/ }))

    expect(screen.queryByRole('checkbox', { name: 'form.isAdvance' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'form.reimburseAdvance' })).toBeInTheDocument()
  })

  it('links a money-in to a selected open advance', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.click(await screen.findByRole('button', { name: /form\.moneyIn/ }))
    await userEvent.type(screen.getByLabelText('form.content'), 'Nhận hoàn ứng')
    await userEvent.type(screen.getByLabelText('form.amount'), '2000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.reimburseAdvance' }))

    // Submitting without picking an advance is rejected.
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(await screen.findByText('form.advanceRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'Ứng trước tiền xe' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'in', advanceTransactionIds: ['adv-1'], isAdvance: false }),
    )
  })

  it('money-in prepaid submits the period computed from the date and month count', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.click(await screen.findByRole('button', { name: /form\.moneyIn/ }))
    await userEvent.type(screen.getByLabelText('form.content'), 'Sinh hoạt 5 tháng')
    await userEvent.type(screen.getByLabelText('form.amount'), '25000000')
    await pickCategory()
    fireEvent.change(screen.getByLabelText('form.date'), { target: { value: '2026-01-01' } })
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.isPrepaid' }))

    await userEvent.click(screen.getByRole('combobox', { name: 'form.prepaidMonths' }))
    await userEvent.click(await screen.findByRole('option', { name: /5 common\.months/ }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'in',
        isPrepaid: true,
        prepaidFrom: '2026-01-01',
        prepaidTo: '2026-05-31',
      }),
    )
  })

  it('already-prepaid money-out allows an empty amount and links the prepaid credit', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Sinh hoạt tháng 2')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.alreadyPrepaid' }))

    // Without picking the prepaid credit the submit is rejected.
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(await screen.findByText('form.prepaidRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('combobox', { name: 'form.selectPrepaid' }))
    await userEvent.click(await screen.findByRole('option', { name: /Sinh hoạt 5 tháng/ }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    // No amount was typed — the linked prepaid covers it.
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'out', amount: 0, prepaidTransactionId: 'pre-1' }),
    )
    expect(screen.queryByText('form.amountRequired')).not.toBeInTheDocument()
  })

  it('save-and-continue submits with keepOpen and clears the per-record fields', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    fireEvent.change(await screen.findByLabelText('form.date'), { target: { value: '2026-07-10' } })
    await userEvent.type(screen.getByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.isAdvance' }))
    await userEvent.click(screen.getByRole('button', { name: 'form.saveAndContinue' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Ăn trưa', amount: 50000, isAdvance: true }),
      { keepOpen: true },
    )
    // Per-record fields reset for the next entry; date and type survive.
    expect(screen.getByLabelText('form.content')).toHaveValue('')
    expect(screen.getByLabelText('form.amount')).toHaveValue('')
    expect(screen.getByRole('checkbox', { name: 'form.isAdvance' })).not.toBeChecked()
    expect(screen.getByLabelText('form.date')).toHaveValue('2026-07-10')
  })

  it('uses the provided default date in create mode', async () => {
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={null}
          submitting={false}
          defaultDate="2026-03-01"
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )

    expect(await screen.findByLabelText('form.date')).toHaveValue('2026-03-01')
  })

  it('hides save-and-continue when editing', async () => {
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{
            id: '1',
            date: '2026-07-08',
            content: 'Netflix',
            credit: { amount: 0, currency: 'VND' },
            debit: { amount: 260000, currency: 'VND' },
            note: null,
            categoryId: null,
            paymentMethod: 'transfer',
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
          }}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )

    await screen.findByLabelText('form.content')
    expect(screen.queryByRole('button', { name: 'form.saveAndContinue' })).not.toBeInTheDocument()
  })

  it('lets an edited transaction pick another plan', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{ ...baseEditingFixture }}
          submitting={false}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      </Wrapper>,
    )

    // Plan select only renders in edit mode, preselected to the current plan.
    await userEvent.click(await screen.findByRole('combobox', { name: 'plans.form' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Du lịch' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0].planId).toBe('p-trip')
  })

  it('gold toggle off by default sends null gold fields and hides the gold type field', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ goldTypeId: null, goldQuantity: null, purchasePlaceId: null }),
    )
    expect(screen.queryByRole('combobox', { name: 'form.goldType' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'form.purchasePlace' })).not.toBeInTheDocument()
  })

  it('submits the picked gold type and quantity on a money-out transaction', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Mua vàng')
    await userEvent.type(screen.getByLabelText('form.amount'), '5000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Nhẫn trơn' }))
    await userEvent.type(screen.getByLabelText('form.goldQuantity'), '0.5')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ goldTypeId: 'g-ring', goldQuantity: 0.5, purchasePlaceId: null }),
    )
  })

  it('submits the picked purchase place while the gold toggle is on', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Mua vàng')
    await userEvent.type(screen.getByLabelText('form.amount'), '5000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Nhẫn trơn' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.purchasePlace' }))
    await userEvent.click(await screen.findByRole('option', { name: 'SJC' }))
    await userEvent.type(screen.getByLabelText('form.goldQuantity'), '0.5')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ purchasePlaceId: 'p-sjc' }),
    )
  })

  it('turning off the gold toggle clears the picked purchase place', async () => {
    renderModal()
    await openMoreOptions()

    await userEvent.click(await screen.findByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.purchasePlace' }))
    await userEvent.click(await screen.findByRole('option', { name: 'SJC' }))
    expect(screen.getByRole('combobox', { name: 'form.purchasePlace' })).toHaveTextContent('SJC')

    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))

    expect(screen.getByRole('combobox', { name: 'form.purchasePlace' })).not.toHaveTextContent('SJC')
  })

  it('gold toggle also works on a money-in transaction (sell)', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.click(await screen.findByRole('button', { name: /form\.moneyIn/ }))
    await userEvent.type(screen.getByLabelText('form.content'), 'Bán vàng')
    await userEvent.type(screen.getByLabelText('form.amount'), '5000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'SJC' }))
    await userEvent.type(screen.getByLabelText('form.goldQuantity'), '1')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'in', goldTypeId: 'g-sjc', goldQuantity: 1 }),
    )
  })

  it('requires a gold quantity when the gold toggle is on', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Mua vàng')
    await userEvent.type(screen.getByLabelText('form.amount'), '5000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(await screen.findByText('form.goldQuantityRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('edit mode prefills the gold toggle, type, quantity and purchase place', async () => {
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{
            ...baseEditingFixture,
            goldTypeId: 'g-ring',
            goldTypeName: 'Nhẫn trơn',
            goldQuantity: 2,
            purchasePlaceId: 'p-sjc',
            purchasePlaceName: 'SJC',
          }}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )

    expect(await screen.findByRole('checkbox', { name: 'form.goldToggle' })).toBeChecked()
    expect(screen.getByLabelText('form.goldQuantity')).toHaveValue('2')
    expect(screen.getByRole('combobox', { name: 'form.purchasePlace' })).toHaveTextContent('SJC')
  })

  it('save-and-continue clears the picked purchase place along with the rest of the gold block', async () => {
    const onSubmit = renderModal()
    await openMoreOptions()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Mua vàng')
    await userEvent.type(screen.getByLabelText('form.amount'), '5000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Nhẫn trơn' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.purchasePlace' }))
    await userEvent.click(await screen.findByRole('option', { name: 'SJC' }))
    await userEvent.type(screen.getByLabelText('form.goldQuantity'), '0.5')
    await userEvent.click(screen.getByRole('button', { name: 'form.saveAndContinue' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ purchasePlaceId: 'p-sjc' }),
      { keepOpen: true },
    )
    // Gold block collapses back to off, taking the purchase place select with it.
    expect(screen.getByRole('checkbox', { name: 'form.goldToggle' })).not.toBeChecked()
    expect(screen.queryByRole('combobox', { name: 'form.purchasePlace' })).not.toBeInTheDocument()
  })

  describe('savings account (Nơi gửi)', () => {
    const savingsGroup = () => screen.getByRole('group', { name: 'form.savingsBank' })
    const querySavingsGroup = () => screen.queryByRole('group', { name: 'form.savingsBank' })
    const pickSavingsBook = async () =>
      userEvent.click(await screen.findByRole('button', { name: 'Sổ tiết kiệm' }))

    async function fillSavingsBasics() {
      await userEvent.type(await screen.findByLabelText('form.content'), 'Gửi tiết kiệm')
      await userEvent.type(screen.getByLabelText('form.amount'), '10000000')
      await userEvent.click(screen.getByRole('button', { name: /Tích luỹ/ }))
      await pickSavingsBook()
    }

    const editingSavingsBook = (savingsBank: string | null) => ({
      ...baseEditingFixture,
      categoryId: 'cat-savings',
      subCategoryId: 'sub-book',
      subCategoryName: 'Sổ tiết kiệm',
      savingsBank,
    })

    it('is hidden until the savings-book sub-category is picked', async () => {
      renderModal()

      await pickCategory()
      expect(querySavingsGroup()).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /Tích luỹ/ }))
      // The category alone is not enough — Tích luỹ also holds gold.
      expect(querySavingsGroup()).not.toBeInTheDocument()

      await pickSavingsBook()
      expect(savingsGroup()).toBeInTheDocument()
      // No default preselect, even though Techcombank is the default bank.
      for (const chip of within(savingsGroup()).getAllByRole('button')) {
        expect(chip.className).not.toContain('border-primary')
      }
    })

    it('stays hidden and submits null for Tích luỹ with another sub-category (Vàng)', async () => {
      const onSubmit = renderModal()

      await userEvent.type(await screen.findByLabelText('form.content'), 'Mua vàng')
      await userEvent.type(screen.getByLabelText('form.amount'), '10000000')
      await userEvent.click(screen.getByRole('button', { name: /Tích luỹ/ }))
      await userEvent.click(await screen.findByRole('button', { name: 'Vàng' }))
      expect(querySavingsGroup()).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-savings', subCategoryId: 'sub-gold', savingsBank: null }),
      )
    })

    it('switching the sub-category away hides and clears it', async () => {
      const onSubmit = renderModal()

      await fillSavingsBasics()
      await userEvent.click(within(savingsGroup()).getByRole('button', { name: 'MoMo' }))
      await userEvent.click(screen.getByRole('button', { name: 'Vàng' }))
      expect(querySavingsGroup()).not.toBeInTheDocument()

      // Back to the savings book: the earlier pick is gone.
      await pickSavingsBook()
      for (const chip of within(savingsGroup()).getAllByRole('button')) {
        expect(chip.className).not.toContain('border-primary')
      }
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ subCategoryId: 'sub-book', savingsBank: null }))
    })

    it('submits null when nothing is picked', async () => {
      const onSubmit = renderModal()

      await fillSavingsBasics()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ categoryId: 'cat-savings', subCategoryId: 'sub-book', savingsBank: null }),
      )
    })

    it('submits the picked bank chip name', async () => {
      const onSubmit = renderModal()

      await fillSavingsBasics()
      await userEvent.click(within(savingsGroup()).getByRole('button', { name: 'MoMo' }))
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(
        // The source bank stays the default preselect; Nơi gửi is separate.
        expect.objectContaining({ savingsBank: 'MoMo', bank: 'Techcombank' }),
      )
    })

    it('submits trimmed free text from "＋ other"', async () => {
      const onSubmit = renderModal()

      await fillSavingsBasics()
      await userEvent.click(within(savingsGroup()).getByRole('button', { name: /payment\.bank\.other/ }))
      await userEvent.type(screen.getByRole('textbox', { name: 'form.savingsBank' }), '  Vietinbank  ')
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ savingsBank: 'Vietinbank' }))
    })

    it('submits null after switching to another category', async () => {
      const onSubmit = renderModal()

      await fillSavingsBasics()
      await userEvent.click(within(savingsGroup()).getByRole('button', { name: 'MoMo' }))
      await pickCategory()
      expect(querySavingsGroup()).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'cat-bills', savingsBank: null }))
    })

    it('edit mode preselects a catalog savings bank', async () => {
      const onSubmit = vi.fn()
      render(
        <Wrapper>
          <TransactionFormModal
            open
            editing={editingSavingsBook('MoMo')}
            submitting={false}
            onSubmit={onSubmit}
            onCancel={() => {}}
          />
        </Wrapper>,
      )

      const momo = await within(await screen.findByRole('group', { name: 'form.savingsBank' })).findByRole('button', {
        name: 'MoMo',
      })
      expect(momo.className).toContain('border-primary')
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ savingsBank: 'MoMo' }))
    })

    it('edit mode restores a non-catalog savings bank into the custom input', async () => {
      render(
        <Wrapper>
          <TransactionFormModal
            open
            editing={editingSavingsBook('Vietinbank')}
            submitting={false}
            onSubmit={vi.fn()}
            onCancel={() => {}}
          />
        </Wrapper>,
      )

      expect(await screen.findByRole('textbox', { name: 'form.savingsBank' })).toHaveValue('Vietinbank')
    })

    it('edit of an old savings row without Nơi gửi opens empty and keeps null', async () => {
      const onSubmit = vi.fn()
      render(
        <Wrapper>
          <TransactionFormModal
            open
            editing={editingSavingsBook(null)}
            submitting={false}
            onSubmit={onSubmit}
            onCancel={() => {}}
          />
        </Wrapper>,
      )

      await screen.findByRole('group', { name: 'form.savingsBank' })
      for (const chip of within(savingsGroup()).getAllByRole('button')) {
        expect(chip.className).not.toContain('border-primary')
      }
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ savingsBank: null }))
    })

    it('edit of a Tích luỹ row with a non-savings-book sub-category hides it and submits null', async () => {
      const onSubmit = vi.fn()
      render(
        <Wrapper>
          <TransactionFormModal
            open
            editing={{ ...baseEditingFixture, categoryId: 'cat-savings', subCategoryId: 'sub-gold', savingsBank: 'MoMo' }}
            submitting={false}
            onSubmit={onSubmit}
            onCancel={() => {}}
          />
        </Wrapper>,
      )

      await screen.findByRole('button', { name: 'Vàng' })
      expect(querySavingsGroup()).not.toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ savingsBank: null }))
    })
  })
})

describe('TransactionFormModal quick-entry layout', () => {
  const before = (a: HTMLElement, b: HTMLElement) =>
    Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)

  it('orders the fields amount, content, category, pay-with, date, note', async () => {
    renderModal()
    const amount = await screen.findByLabelText('form.amount')
    const content = screen.getByLabelText('form.content')
    const category = screen.getByText('form.category')
    const payWith = screen.getByText('form.payWith')
    const date = screen.getByLabelText('form.date')
    const note = screen.getByLabelText('form.note')
    expect(before(amount, content)).toBe(true)
    expect(before(content, category)).toBe(true)
    expect(before(category, payWith)).toBe(true)
    expect(before(payWith, date)).toBe(true)
    expect(before(date, note)).toBe(true)
  })

  it('focuses the amount input on create', async () => {
    renderModal()
    const amount = await screen.findByLabelText('form.amount')
    await waitFor(() => expect(amount).toHaveFocus())
  })

  it('keeps the more-options section collapsed on create', async () => {
    renderModal()
    const toggle = await screen.findByRole('button', { name: 'form.moreOptions' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('checkbox', { name: 'form.goldToggle' })).not.toBeInTheDocument()
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox', { name: 'form.goldToggle' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'form.isAdvance' })).toBeInTheDocument()
  })

  const renderEditing = (extra: Partial<typeof baseEditingFixture> | Record<string, unknown>) => {
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{ ...baseEditingFixture, ...extra } as typeof baseEditingFixture}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )
  }

  it('stays collapsed when editing a plain transaction (default beneficiary)', async () => {
    renderEditing({ beneficiaryId: 'b-me' })
    expect(await screen.findByRole('button', { name: 'form.moreOptions' })).toHaveAttribute('aria-expanded', 'false')
  })

  it.each([
    ['gold', { goldTypeId: 'g-ring', goldQuantity: 1 }],
    ['non-default beneficiary', { beneficiaryId: 'b-con' }],
    ['advance', { isAdvance: true }],
    ['already prepaid', { prepaidTransactionId: 'pre-1' }],
    ['reimburse', { credit: { amount: 1000, currency: 'VND' }, debit: { amount: 0, currency: 'VND' }, advanceTransactionIds: ['adv-1'] }],
    ['prepaid', { credit: { amount: 1000, currency: 'VND' }, debit: { amount: 0, currency: 'VND' }, isPrepaid: true, prepaidFrom: '2026-07-01', prepaidTo: '2026-07-31' }],
  ])('auto-expands when editing a transaction with %s', async (_name, extra) => {
    renderEditing(extra)
    expect(await screen.findByRole('button', { name: 'form.moreOptions' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('edits a transaction with a fractional stored amount (rounded)', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{ ...baseEditingFixture, debit: { amount: 1500.5, currency: 'VND' } }}
          submitting={false}
          onSubmit={onSubmit}
          onCancel={() => {}}
        />
      </Wrapper>,
    )
    expect(await screen.findByLabelText('form.amount')).toHaveValue('1.501')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 1501 }))
  })

  it('keeps edit values intact for an advance', async () => {
    renderEditing({ isAdvance: true })
    expect(await screen.findByRole('checkbox', { name: 'form.isAdvance' })).toBeChecked()
  })

  it('expands the section when a validation error lives inside it', async () => {
    const onSubmit = renderModal()
    await userEvent.type(await screen.findByLabelText('form.amount'), '100')
    await userEvent.type(screen.getByLabelText('form.content'), 'Mua vàng')
    await pickCategory()
    const toggle = screen.getByRole('button', { name: 'form.moreOptions' })
    await userEvent.click(toggle)
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.goldToggle' }))
    await userEvent.click(toggle) // collapse again
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(await screen.findByText('form.goldTypeRequired')).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('Hôm nay / Hôm qua chips set the date', async () => {
    renderModal(vi.fn(), { defaultDate: '2026-01-01' })
    const date = await screen.findByLabelText('form.date')
    await userEvent.click(screen.getByRole('button', { name: 'form.yesterday' }))
    expect(date).toHaveValue(dayjs().subtract(1, 'day').format('YYYY-MM-DD'))
    await userEvent.click(screen.getByRole('button', { name: 'form.today' }))
    expect(date).toHaveValue(dayjs().format('YYYY-MM-DD'))
  })

  describe('amount shorthand', () => {
    it('shows digits with thousand separators while typing', async () => {
      renderModal()
      const amount = await screen.findByLabelText('form.amount')
      await userEvent.type(amount, '1500000')
      expect(amount).toHaveValue('1.500.000')
    })

    it.each([
      ['50k', 50000],
      ['1tr5', 1500000],
      ['1,5tr', 1500000],
      ['2m', 2000000],
      ['15', 15],
    ])('converts %s on blur', async (typed, expected) => {
      renderModal()
      const amount = await screen.findByLabelText('form.amount')
      await userEvent.type(amount, typed)
      await userEvent.tab()
      expect(amount).toHaveValue(formatVi(expected))
    })

    it.each([
      ['1200k', 1200000],
      ['1500k', 1500000],
      ['2000m', 2000000000],
    ])('typing %s (auto-formatted) submits the full amount', async (typed, expected) => {
      const onSubmit = renderModal()
      await userEvent.type(await screen.findByLabelText('form.amount'), typed)
      await userEvent.type(screen.getByLabelText('form.content'), 'Ăn')
      await pickCategory()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: expected }))
    })

    it('never turns a typed 1.2345tr into a huge amount', async () => {
      const onSubmit = renderModal()
      await userEvent.type(await screen.findByLabelText('form.amount'), '1.2345tr')
      await userEvent.type(screen.getByLabelText('form.content'), 'Ăn')
      await pickCategory()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(await screen.findByText('form.amountRequired')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('reads a typed 0.125tr as 125,000', async () => {
      const onSubmit = renderModal()
      await userEvent.type(await screen.findByLabelText('form.amount'), '0.125tr')
      await userEvent.type(screen.getByLabelText('form.content'), 'Ăn')
      await pickCategory()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 125000 }))
    })

    it('shows a live preview for shorthand only', async () => {
      renderModal()
      const amount = await screen.findByLabelText('form.amount')
      await userEvent.type(amount, '1500')
      expect(screen.queryByText(/^=/)).not.toBeInTheDocument()
      await userEvent.type(amount, 'k')
      expect(screen.getByText(/^= .*1\.500\.000/)).toBeInTheDocument()
      await userEvent.type(amount, 'x')
      expect(screen.queryByText(/^=/)).not.toBeInTheDocument()
    })

    it('converts shorthand on submit', async () => {
      const onSubmit = renderModal()
      await userEvent.type(await screen.findByLabelText('form.amount'), '1tr250')
      await userEvent.type(screen.getByLabelText('form.content'), 'Ăn')
      await pickCategory()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 1250000 }))
    })

    it('rejects invalid shorthand with the amount-required error', async () => {
      const onSubmit = renderModal()
      await userEvent.type(await screen.findByLabelText('form.amount'), '12abc')
      await userEvent.type(screen.getByLabelText('form.content'), 'Ăn')
      await pickCategory()
      await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
      expect(await screen.findByText('form.amountRequired')).toBeInTheDocument()
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Enter key', () => {
    async function fillValid() {
      await userEvent.type(await screen.findByLabelText('form.amount'), '50k')
      await userEvent.type(screen.getByLabelText('form.content'), 'Cafe')
      await pickCategory()
    }

    it('submits from a text input', async () => {
      const onSubmit = renderModal()
      await fillValid()
      await userEvent.type(screen.getByLabelText('form.content'), '{Enter}')
      expect(onSubmit).toHaveBeenCalledTimes(1)
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000, content: 'Cafe' }))
    })

    it('does not submit from the note textarea', async () => {
      const onSubmit = renderModal()
      await fillValid()
      await userEvent.type(screen.getByLabelText('form.note'), 'a{Enter}b')
      expect(onSubmit).not.toHaveBeenCalled()
      expect(screen.getByLabelText('form.note')).toHaveValue('a\nb')
    })

    it('does not submit when a handler already prevented the key', async () => {
      const onSubmit = renderModal()
      await fillValid()
      const content = screen.getByLabelText('form.content')
      content.addEventListener('keydown', (e) => e.preventDefault())
      await userEvent.type(content, '{Enter}')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('does not submit while a select is open', async () => {
      const onSubmit = renderModal()
      await fillValid()
      await userEvent.click(screen.getByRole('button', { name: 'form.moreOptions' }))
      await userEvent.click(screen.getByRole('combobox', { name: 'form.beneficiary' }))
      expect(await screen.findByRole('option', { name: 'Con' })).toBeInTheDocument()
      fireEvent.keyDown(screen.getByLabelText('form.content'), { key: 'Enter' })
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })
})

function formatVi(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

const acct = (over: Record<string, unknown>) => ({
  id: 'a1',
  name: 'Acc',
  type: 'checking',
  lastDigits: null,
  creditLimit: null,
  statementDay: null,
  dueDay: null,
  interestRatePercent: null,
  latestSnapshot: null,
  bankName: null,
  ...over,
})

describe('TransactionFormModal pay-with chips', () => {
  const accounts = [
    acct({ id: 'a-tcb', name: 'Techcombank CK', type: 'checking', bankName: 'Techcombank' }),
    acct({ id: 'a-visa', name: 'Visa VPBank', type: 'credit_card', lastDigits: '4321', bankName: 'VPBank' }),
  ]

  async function fill(onSubmit: ReturnType<typeof vi.fn>) {
    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    return onSubmit
  }

  it('renders a chip per account with last digits and a Tiền mặt chip when no cash account', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    renderModal()
    expect(await screen.findByRole('button', { name: /Techcombank CK/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Visa VPBank/ })).toHaveTextContent('•••4321')
    expect(screen.getByRole('button', { name: 'form.cashChip' })).toBeInTheDocument()
  })

  it('omits the synthetic cash chip when a cash account exists', async () => {
    vi.mocked(getAccounts).mockResolvedValue([acct({ id: 'c', name: 'Ví tiền', type: 'cash' })] as never)
    renderModal()
    expect(await screen.findByRole('button', { name: 'Ví tiền' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'form.cashChip' })).not.toBeInTheDocument()
  })

  it('picking a credit card chip sets card/credit/bank and submits them', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    const onSubmit = await fill(renderModal())
    await userEvent.click(await screen.findByRole('button', { name: /Visa VPBank/ }))
    expect(screen.getByRole('button', { name: /Visa VPBank/ })).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'card', cardType: 'credit', bank: 'VPBank' }),
    )
  })

  it('picking the cash chip sets cash with no bank', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    const onSubmit = await fill(renderModal())
    await userEvent.click(await screen.findByRole('button', { name: 'form.cashChip' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'cash', cardType: null, bank: null }),
    )
  })

  it('manually changing the bank in Khác deselects the chip and submits the manual value', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    const onSubmit = await fill(renderModal())
    const chip = await screen.findByRole('button', { name: /Techcombank CK/ })
    await userEvent.click(chip)
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    await openPayWithOther()
    await userEvent.click(screen.getByRole('button', { name: 'MoMo' }))
    expect(chip).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ paymentMethod: 'transfer', bank: 'MoMo' }))
  })

  it('picking a chip collapses Khác', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    renderModal()
    await openPayWithOther()
    expect(screen.getByRole('radio', { name: 'payment.card' })).toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: /Visa VPBank/ }))
    expect(screen.queryByRole('radio', { name: 'payment.card' })).not.toBeInTheDocument()
  })

  it('auto-opens Khác on create when the default values match no chip', async () => {
    vi.mocked(getAccounts).mockResolvedValue([acct({ id: 'x', name: 'Other', bankName: 'ACB' })] as never)
    renderModal()
    expect(await screen.findByRole('radio', { name: 'payment.card' })).toBeInTheDocument()
  })

  it('picking a card chip then a transfer chip clears cardType', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    const onSubmit = await fill(renderModal())
    await userEvent.click(await screen.findByRole('button', { name: /Visa VPBank/ }))
    await userEvent.click(screen.getByRole('button', { name: /Techcombank CK/ }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethod: 'transfer', cardType: null, bank: 'Techcombank' }),
    )
  })

  it('does not reuse a failed previous open: reopen shows chips and keeps Khác collapsed', async () => {
    vi.mocked(getAccounts).mockRejectedValueOnce(new Error('boom'))
    const props = { editing: null, submitting: false, onSubmit: vi.fn(), onCancel: () => {} }
    const { rerender } = render(
      <Wrapper>
        <TransactionFormModal open {...props} />
      </Wrapper>,
    )
    expect(await screen.findByRole('radio', { name: 'payment.card' })).toBeInTheDocument()
    rerender(
      <Wrapper>
        <TransactionFormModal open={false} {...props} />
      </Wrapper>,
    )
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    rerender(
      <Wrapper>
        <TransactionFormModal open {...props} />
      </Wrapper>,
    )
    expect(await screen.findByRole('button', { name: /Visa VPBank/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: 'payment.card' })).not.toBeInTheDocument()
  })

  it('keeps Khác collapsed on create', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    renderModal()
    await screen.findByRole('button', { name: /Visa VPBank/ })
    expect(screen.queryByRole('radio', { name: 'payment.card' })).not.toBeInTheDocument()
  })

  it('hides chips and shows the manual controls expanded when accounts fail to load', async () => {
    vi.mocked(getAccounts).mockRejectedValue(new Error('boom'))
    renderModal()
    expect(await screen.findByRole('radio', { name: 'payment.card' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'form.cashChip' })).not.toBeInTheDocument()
  })

  it('edit mode: selects the matching chip and keeps Khác closed', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{ ...baseEditingFixture, paymentMethod: 'card', cardType: 'credit', bank: 'VPBank' }}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )
    expect(await screen.findByRole('button', { name: /Visa VPBank/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('radio', { name: 'payment.card' })).not.toBeInTheDocument()
  })

  it('edit mode: opens Khác when no chip matches', async () => {
    vi.mocked(getAccounts).mockResolvedValue(accounts as never)
    render(
      <Wrapper>
        <TransactionFormModal
          open
          editing={{ ...baseEditingFixture, paymentMethod: 'card', cardType: 'debit', bank: 'MoMo' }}
          submitting={false}
          onSubmit={vi.fn()}
          onCancel={() => {}}
        />
      </Wrapper>,
    )
    expect(await screen.findByRole('radio', { name: 'payment.card' })).toBeInTheDocument()
  })
})
