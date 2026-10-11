import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createGoldAcquisition, updateGoldAcquisition } from '../api/goldApi'
import { GoldAcquisitionDialog } from './GoldAcquisitionDialog'
import type { GoldAcquisitionResponse } from '../api/types'

vi.mock('../api/goldApi', () => ({
  createGoldAcquisition: vi.fn().mockResolvedValue({ id: 'acq-new' }),
  updateGoldAcquisition: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('./GoldTypesContext', () => ({
  useGoldTypes: () => ({
    goldTypes: [{ id: 'g-1', name: 'Nhẫn trơn' }],
    refresh: vi.fn(),
  }),
}))

vi.mock('../purchasePlaces/PurchasePlacesContext', () => ({
  usePurchasePlaces: () => ({
    purchasePlaces: [{ id: 'p-sjc', name: 'SJC' }],
    refresh: vi.fn(),
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const editingFixture: GoldAcquisitionResponse = {
  id: 'acq-1',
  date: '2024-04-01',
  goldTypeId: 'g-1',
  goldTypeName: 'Nhẫn trơn',
  quantity: 2,
  unitPrice: { amount: 5000000, currency: 'VND' },
  value: { amount: 10000000, currency: 'VND' },
  note: 'quà tặng',
  purchasePlaceId: 'p-sjc',
  purchasePlaceName: 'SJC',
}

describe('GoldAcquisitionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates an acquisition with the entered values', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<GoldAcquisitionDialog open editing={null} onClose={onClose} onSaved={onSaved} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Nhẫn trơn' }))
    fireEvent.change(screen.getByLabelText('goldAcq.date'), { target: { value: '2024-05-10' } })
    await userEvent.type(screen.getByLabelText('goldAcq.quantity'), '3')
    await userEvent.type(screen.getByLabelText('goldAcq.unitPrice'), '5500000')
    await userEvent.type(screen.getByLabelText('goldAcq.note'), 'mua 2024')

    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(createGoldAcquisition).toHaveBeenCalledWith({
      goldTypeId: 'g-1',
      date: '2024-05-10',
      quantity: 3,
      unitPrice: 5500000,
      note: 'mua 2024',
      purchasePlaceId: null,
    })
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('submits the picked purchase place', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<GoldAcquisitionDialog open editing={null} onClose={onClose} onSaved={onSaved} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'form.goldType' }))
    await userEvent.click(await screen.findByRole('option', { name: 'Nhẫn trơn' }))
    await userEvent.click(screen.getByRole('combobox', { name: 'form.purchasePlace' }))
    await userEvent.click(await screen.findByRole('option', { name: 'SJC' }))
    fireEvent.change(screen.getByLabelText('goldAcq.date'), { target: { value: '2024-05-10' } })
    await userEvent.type(screen.getByLabelText('goldAcq.quantity'), '3')

    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(createGoldAcquisition).toHaveBeenCalledWith(
      expect.objectContaining({ purchasePlaceId: 'p-sjc' }),
    )
  })

  it('blocks submit when gold type or quantity is missing', async () => {
    const onSaved = vi.fn()
    render(<GoldAcquisitionDialog open editing={null} onClose={vi.fn()} onSaved={onSaved} />)

    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(createGoldAcquisition).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  })

  it('edit mode pre-fills fields and calls update', async () => {
    const onSaved = vi.fn()
    const onClose = vi.fn()
    render(<GoldAcquisitionDialog open editing={editingFixture} onClose={onClose} onSaved={onSaved} />)

    expect(await screen.findByRole('combobox', { name: 'form.goldType' })).toHaveTextContent('Nhẫn trơn')
    expect(screen.getByRole('combobox', { name: 'form.purchasePlace' })).toHaveTextContent('SJC')
    expect(screen.getByLabelText('goldAcq.date')).toHaveValue('2024-04-01')
    expect(screen.getByLabelText('goldAcq.quantity')).toHaveValue('2')
    expect(screen.getByLabelText('goldAcq.note')).toHaveValue('quà tặng')

    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))

    expect(updateGoldAcquisition).toHaveBeenCalledWith('acq-1', {
      goldTypeId: 'g-1',
      date: '2024-04-01',
      quantity: 2,
      unitPrice: 5000000,
      note: 'quà tặng',
      purchasePlaceId: 'p-sjc',
    })
    expect(onSaved).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
