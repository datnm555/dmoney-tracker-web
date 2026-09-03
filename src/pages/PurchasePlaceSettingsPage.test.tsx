import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deletePurchasePlace, updatePurchasePlace } from '../api/purchasePlaceApi'
import { PurchasePlaceSettingsPage } from './PurchasePlaceSettingsPage'

const refresh = vi.fn()

vi.mock('../api/purchasePlaceApi', () => ({
  createPurchasePlace: vi.fn(),
  updatePurchasePlace: vi.fn().mockResolvedValue(undefined),
  deletePurchasePlace: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../purchasePlaces/PurchasePlacesContext', () => ({
  usePurchasePlaces: () => ({
    purchasePlaces: [
      { id: 'p-1', name: 'PNJ' },
      { id: 'p-2', name: 'SJC Trần Nhân Tông' },
    ],
    refresh,
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('PurchasePlaceSettingsPage', () => {
  it('lists purchase places without a default badge', () => {
    render(<PurchasePlaceSettingsPage />)
    expect(screen.getByText('PNJ')).toBeInTheDocument()
    expect(screen.getByText('SJC Trần Nhân Tông')).toBeInTheDocument()
    expect(screen.queryByText('beneficiaries.default')).not.toBeInTheDocument()
    expect(screen.queryByText('purchasePlaces.default')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /purchasePlaces.delete/ })).toHaveLength(2)
  })

  it('renames a purchase place', async () => {
    render(<PurchasePlaceSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /purchasePlaces.rename/ })[1])
    const input = await screen.findByDisplayValue('SJC Trần Nhân Tông')
    await userEvent.clear(input)
    await userEvent.type(input, 'SJC Nguyễn Trãi{Enter}')
    expect(updatePurchasePlace).toHaveBeenCalledWith('p-2', 'SJC Nguyễn Trãi')
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes after confirm', async () => {
    render(<PurchasePlaceSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /purchasePlaces.delete/ })[1])
    await userEvent.click(await screen.findByText('summary.delete'))
    expect(deletePurchasePlace).toHaveBeenCalledWith('p-2')
    expect(refresh).toHaveBeenCalled()
  })
})
