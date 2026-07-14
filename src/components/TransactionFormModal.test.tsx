import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import { TransactionFormModal } from './TransactionFormModal'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn().mockResolvedValue([{ id: 'sub-1', category: 'bills', name: 'Xăng', isDefault: true }]),
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
    await userEvent.click(screen.getByRole('radio', { name: 'payment.card' }))
    await userEvent.click(await screen.findByRole('radio', { name: 'payment.cardType.visa' }))
    await userEvent.click(screen.getByRole('button', { name: 'Techcombank' }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Netflix',
        type: 'out',
        amount: 260000,
        paymentMethod: 'card',
        cardType: 'visa',
        bank: 'Techcombank',
      }),
    )
  })

  it('defaults to transfer money-out with no card fields', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
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

  it('submits isAdvance when the advance checkbox is ticked', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Tiền xe bus ứng trước')
    await userEvent.type(screen.getByLabelText('form.amount'), '2000000')
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
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.reimburseAdvance' }))

    // Submitting without picking an advance is rejected.
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(await screen.findByText('form.advanceRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: /Ứng trước tiền xe/ }))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'in', advanceTransactionId: 'adv-1', isAdvance: false }),
    )
  })

  it('money-in prepaid submits the period computed from the date and month count', async () => {
    const onSubmit = renderModal()

    await userEvent.click(await screen.findByRole('button', { name: /form\.moneyIn/ }))
    await userEvent.type(screen.getByLabelText('form.content'), 'Sinh hoạt 5 tháng')
    await userEvent.type(screen.getByLabelText('form.amount'), '25000000')
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
    await userEvent.click(screen.getByRole('checkbox', { name: 'form.alreadyPrepaid' }))

    // Without picking the prepaid credit the submit is rejected.
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(await screen.findByText('form.prepaidRequired')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('combobox'))
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
            category: null,
            paymentMethod: 'transfer',
            cardType: null,
            bank: null,
            isAdvance: false,
            advanceTransactionId: null,
            isPrepaid: false,
            prepaidFrom: null,
            prepaidTo: null,
            prepaidTransactionId: null,
            subCategoryId: null,
            subCategoryName: null,
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
})
