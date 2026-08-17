import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { STORAGE_KEYS } from '../api/client'
import { getPlans } from '../api/planApi'
import { PlanProvider, usePlans } from './PlanContext'

vi.mock('../api/planApi', () => ({
  getPlans: vi.fn(),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const PLANS = [
  { id: 'p-default', name: 'Sổ chính', isDefault: true },
  { id: 'p-trip', name: 'Du lịch', isDefault: false },
]

function Probe() {
  const { plans, selectedPlanId, selectPlan } = usePlans()
  return (
    <div>
      <span data-testid="selected">{selectedPlanId ?? 'none'}</span>
      <span data-testid="count">{plans.length}</span>
      <button onClick={() => selectPlan('p-trip')}>go-trip</button>
    </div>
  )
}

describe('PlanContext', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(getPlans).mockResolvedValue(PLANS)
  })

  it('selects the default plan when nothing is stored', async () => {
    render(<PlanProvider><Probe /></PlanProvider>)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-default'))
    expect(screen.getByTestId('count')).toHaveTextContent('2')
  })

  it('keeps a stored valid selection', async () => {
    localStorage.setItem(STORAGE_KEYS.planId, 'p-trip')
    render(<PlanProvider><Probe /></PlanProvider>)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-trip'))
  })

  it('falls back to default when the stored plan no longer exists', async () => {
    localStorage.setItem(STORAGE_KEYS.planId, 'p-gone')
    render(<PlanProvider><Probe /></PlanProvider>)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-default'))
    expect(localStorage.getItem(STORAGE_KEYS.planId)).toBe('p-default')
  })

  it('persists a manual selection', async () => {
    render(<PlanProvider><Probe /></PlanProvider>)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-default'))
    await userEvent.click(screen.getByText('go-trip'))
    expect(screen.getByTestId('selected')).toHaveTextContent('p-trip')
    expect(localStorage.getItem(STORAGE_KEYS.planId)).toBe('p-trip')
  })

  it('self-heals selection when a plans-changed event fires after the plan disappears', async () => {
    render(<PlanProvider><Probe /></PlanProvider>)
    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-default'))
    await userEvent.click(screen.getByText('go-trip'))
    expect(screen.getByTestId('selected')).toHaveTextContent('p-trip')

    // 'p-trip' was deleted elsewhere; the next getPlans() no longer returns it.
    vi.mocked(getPlans).mockResolvedValue([PLANS[0]])

    act(() => {
      window.dispatchEvent(new CustomEvent('dmoney:plans-changed'))
    })

    await waitFor(() => expect(screen.getByTestId('selected')).toHaveTextContent('p-default'))
  })
})
