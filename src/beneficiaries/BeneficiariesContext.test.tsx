import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { getBeneficiaries } from '../api/beneficiaryApi'
import { BeneficiariesProvider, useBeneficiaries } from './BeneficiariesContext'

vi.mock('../api/beneficiaryApi', () => ({
  getBeneficiaries: vi.fn(),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const BENEFICIARIES = [
  { id: 'b-self', name: 'Bản thân', isDefault: true },
  { id: 'b-friend', name: 'Bạn bè', isDefault: false },
]

function Probe() {
  const { beneficiaries, refresh } = useBeneficiaries()
  return (
    <div>
      <span data-testid="count">{beneficiaries.length}</span>
      <button onClick={() => refresh()}>reload</button>
    </div>
  )
}

describe('BeneficiariesContext', () => {
  beforeEach(() => {
    vi.mocked(getBeneficiaries).mockResolvedValue(BENEFICIARIES)
  })

  it('loads the beneficiary list on mount', async () => {
    render(
      <BeneficiariesProvider>
        <Probe />
      </BeneficiariesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))
  })

  it('refetches the list on refresh', async () => {
    render(
      <BeneficiariesProvider>
        <Probe />
      </BeneficiariesProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'))

    vi.mocked(getBeneficiaries).mockResolvedValue([BENEFICIARIES[0]])
    await userEvent.click(screen.getByText('reload'))
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'))
  })
})
