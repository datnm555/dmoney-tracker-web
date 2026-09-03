import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import { TransactionFormModal } from './TransactionFormModal'

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

vi.mock('../categories/CategoriesContext', () => ({
  CategoriesProvider: ({ children }: { children: ReactNode }) => children,
  useCategories: () => ({
    customCategories: [{ id: 'cat-bills', name: 'Hóa đơn', icon: 'zap', code: 'bills', kind: 'expense' }],
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn().mockResolvedValue([{ id: 'sub-1', categoryId: 'cat-bills', name: 'Xăng', isDefault: true }]),
}))

vi.mock('../api/transactionApi', () => ({
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
}

async function pickCategory() {
  await userEvent.click(await screen.findByRole('button', { name: /Hóa đơn/ }))
}

function renderModal(onSubmit = vi.fn()) {
  render(
    <Wrapper>
      <TransactionFormModal open editing={null} submitting={false} onSubmit={onSubmit} onCancel={() => {}} />
    </Wrapper>,
  )
  return onSubmit
}

describe('TransactionFormModal', () => {
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
        bank: null,
      }),
    )
  })

  it('preselects the default beneficiary on a money-out transaction', async () => {
    const onSubmit = renderModal()

    expect(await screen.findByRole('combobox', { name: 'form.beneficiary' })).toHaveTextContent('Tôi')

    await userEvent.type(screen.getByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await pickCategory()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ beneficiaryId: 'b-me' }))
  })

  it('clears the beneficiary when switching to money-in', async () => {
    const onSubmit = renderModal()

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

    await userEvent.type(await screen.findByLabelText('form.content'), 'Tiền xe bus ứng trước')
    await userEvent.type(screen.getByLabelText('form.amount'), '2000000')
    await pickCategory()
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.isAdvance' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isAdvance: true }))
  })

  it('money-in shows the reimburse checkbox instead of the advance checkbox', async () => {
    renderModal()

    await screen.findByLabelText('form.content')
    expect(screen.getByRole('checkbox', { name: 'form.isAdvance' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /form\.moneyIn/ }))

    expect(screen.queryByRole('checkbox', { name: 'form.isAdvance' })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'form.reimburseAdvance' })).toBeInTheDocument()
  })

  it('links a money-in to a selected open advance', async () => {
    const onSubmit = renderModal()

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
})
