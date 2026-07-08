import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import { TransactionFormModal } from './TransactionFormModal'

vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
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

  it('save-and-continue submits with keepOpen and preserves the form values', async () => {
    const onSubmit = renderModal()

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.amount'), '50000')
    await userEvent.click(screen.getByRole('button', { name: 'form.saveAndContinue' }))

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Ăn trưa', amount: 50000 }),
      { keepOpen: true },
    )
    // Dialog stays open (parent decides) and the fields keep their values for cloning.
    expect(screen.getByLabelText('form.content')).toHaveValue('Ăn trưa')
    expect(screen.getByLabelText('form.amount')).toHaveValue('50.000')
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
