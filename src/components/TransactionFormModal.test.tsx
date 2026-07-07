import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { I18nProvider } from '../i18n/I18nContext'
import { TransactionFormModal } from './TransactionFormModal'

// No backend in tests: resources resolve empty, so t(key) returns the key itself.
vi.mock('../api/resourceApi', () => ({
  getResources: vi.fn().mockResolvedValue({}),
}))

function Wrapper({ children }: { children: ReactNode }) {
  return <I18nProvider>{children}</I18nProvider>
}

describe('TransactionFormModal', () => {
  it('rejects submit when both amounts are empty', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <TransactionFormModal open editing={null} submitting={false} onSubmit={onSubmit} onCancel={() => {}} />
      </Wrapper>,
    )

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(await screen.findAllByText('form.amountRequired')).not.toHaveLength(0)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits when content and one amount are provided', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <TransactionFormModal open editing={null} submitting={false} onSubmit={onSubmit} onCancel={() => {}} />
      </Wrapper>,
    )

    await userEvent.type(await screen.findByLabelText('form.content'), 'Lương')
    await userEvent.type(screen.getByLabelText('form.credit'), '15000000')
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const values = onSubmit.mock.calls[0][0]
    expect(values.content).toBe('Lương')
    expect(values.creditAmount).toBe(15000000)
  })

  it('submits the selected category', async () => {
    const onSubmit = vi.fn()
    render(
      <Wrapper>
        <TransactionFormModal open editing={null} submitting={false} onSubmit={onSubmit} onCancel={() => {}} />
      </Wrapper>,
    )

    await userEvent.type(await screen.findByLabelText('form.content'), 'Ăn trưa')
    await userEvent.type(screen.getByLabelText('form.debit'), '50000')
    await userEvent.click(screen.getByLabelText('form.category'))
    await userEvent.click(await screen.findByTitle('category.food'))
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0].category).toBe('food')
  })
})
