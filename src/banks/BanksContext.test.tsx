import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getBanks } from '../api/bankApi'
import { BanksProvider, useBanks } from './BanksContext'

vi.mock('../api/bankApi', () => ({
  getBanks: vi.fn(),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const BANKS = [
  { id: 'b-momo', name: 'MoMo', isDefault: false },
  { id: 'b-tcb', name: 'Techcombank', isDefault: false },
]

function Probe() {
  const { banks, refresh } = useBanks()
  return (
    <div>
      <span data-testid="count">{banks.length}</span>
      <button onClick={() => refresh()}>reload</button>
    </div>
  )
}

describe('BanksContext', () => {
  beforeEach(() => {
    vi.mocked(getBanks).mockResolvedValue(BANKS)
  })

  it('loads the bank list on mount', async () => {
    render(
      <BanksProvider>
        <Probe />
      </BanksProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))
  })

  it('refetches the list on refresh', async () => {
    render(
      <BanksProvider>
        <Probe />
      </BanksProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

    vi.mocked(getBanks).mockResolvedValue([BANKS[0]])
    await userEvent.click(screen.getByText('reload'))
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  })
})
