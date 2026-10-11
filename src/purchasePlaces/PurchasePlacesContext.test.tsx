import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getPurchasePlaces } from '../api/purchasePlaceApi'
import { PurchasePlacesProvider, usePurchasePlaces } from './PurchasePlacesContext'

vi.mock('../api/purchasePlaceApi', () => ({
  getPurchasePlaces: vi.fn(),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const PURCHASE_PLACES = [
  { id: 'p-sjc', name: 'SJC Trần Nhân Tông' },
  { id: 'p-pnj', name: 'PNJ' },
]

function Probe() {
  const { purchasePlaces, refresh } = usePurchasePlaces()
  return (
    <div>
      <span data-testid="count">{purchasePlaces.length}</span>
      <button onClick={() => refresh()}>reload</button>
    </div>
  )
}

describe('PurchasePlacesContext', () => {
  beforeEach(() => {
    vi.mocked(getPurchasePlaces).mockResolvedValue(PURCHASE_PLACES)
  })

  it('loads the purchase place list on mount', async () => {
    render(
      <PurchasePlacesProvider>
        <Probe />
      </PurchasePlacesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))
  })

  it('refetches the list on refresh', async () => {
    render(
      <PurchasePlacesProvider>
        <Probe />
      </PurchasePlacesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

    vi.mocked(getPurchasePlaces).mockResolvedValue([PURCHASE_PLACES[0]])
    await userEvent.click(screen.getByText('reload'))
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  })
})
