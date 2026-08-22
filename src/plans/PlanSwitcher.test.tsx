import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlanSwitcher } from './PlanSwitcher'

const selectPlan = vi.fn()

vi.mock('./PlanContext', () => ({
  usePlans: () => ({
    plans: [
      { id: 'p-default', name: 'Sổ chính', isDefault: true },
      { id: 'p-trip', name: 'Du lịch', isDefault: false },
    ],
    selectedPlanId: 'p-default',
    selectPlan,
    refresh: vi.fn(),
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

describe('PlanSwitcher', () => {
  it('shows the selected plan and switches on pick', async () => {
    render(<PlanSwitcher />)
    expect(screen.getByRole('button', { name: /Sổ chính/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /Sổ chính/ }))
    await userEvent.click(await screen.findByText('Du lịch'))
    expect(selectPlan).toHaveBeenCalledWith('p-trip')
  })

  it('offers create and manage entries', async () => {
    render(<PlanSwitcher />)
    await userEvent.click(screen.getByRole('button', { name: /Sổ chính/ }))
    expect(await screen.findByText('plans.create')).toBeInTheDocument()
    expect(screen.getByText('plans.manage')).toBeInTheDocument()
  })
})
