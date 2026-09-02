import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getGoldTypes } from '../api/goldApi'
import { GoldTypesProvider, useGoldTypes } from './GoldTypesContext'

vi.mock('../api/goldApi', () => ({
  getGoldTypes: vi.fn(),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const GOLD_TYPES = [
  { id: 'g-sjc', name: 'SJC' },
  { id: 'g-9999', name: 'Vàng 9999' },
]

function Probe() {
  const { goldTypes, refresh } = useGoldTypes()
  return (
    <div>
      <span data-testid="count">{goldTypes.length}</span>
      <button onClick={() => refresh()}>reload</button>
    </div>
  )
}

describe('GoldTypesContext', () => {
  beforeEach(() => {
    vi.mocked(getGoldTypes).mockResolvedValue(GOLD_TYPES)
  })

  it('loads the gold type list on mount', async () => {
    render(
      <GoldTypesProvider>
        <Probe />
      </GoldTypesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))
  })

  it('refetches the list on refresh', async () => {
    render(
      <GoldTypesProvider>
        <Probe />
      </GoldTypesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

    vi.mocked(getGoldTypes).mockResolvedValue([GOLD_TYPES[0]])
    await userEvent.click(screen.getByText('reload'))
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  })
})
