import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deletePlan, setDefaultPlan, updatePlan } from '../api/planApi'
import { PlanSettingsPage } from './PlanSettingsPage'

const refresh = vi.fn()

vi.mock('../api/planApi', () => ({
  createPlan: vi.fn(),
  updatePlan: vi.fn().mockResolvedValue(undefined),
  deletePlan: vi.fn().mockResolvedValue(undefined),
  setDefaultPlan: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../plans/PlanContext', () => ({
  usePlans: () => ({
    plans: [
      { id: 'p-default', name: 'Sổ chính', isDefault: true },
      { id: 'p-trip', name: 'Du lịch', isDefault: false },
    ],
    selectedPlanId: 'p-default',
    selectPlan: vi.fn(),
    refresh,
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('PlanSettingsPage', () => {
  it('lists plans and marks the default one undeletable', () => {
    render(<PlanSettingsPage />)
    expect(screen.getByText('Sổ chính')).toBeInTheDocument()
    expect(screen.getByText('plans.default')).toBeInTheDocument()
    // Only the non-default plan has a delete button.
    expect(screen.getAllByRole('button', { name: /plans.delete/ })).toHaveLength(1)
  })

  it('renames a plan', async () => {
    render(<PlanSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /plans.rename/ })[1])
    const input = await screen.findByDisplayValue('Du lịch')
    await userEvent.clear(input)
    await userEvent.type(input, 'Du lịch hè{Enter}')
    expect(updatePlan).toHaveBeenCalledWith('p-trip', 'Du lịch hè')
    expect(refresh).toHaveBeenCalled()
  })

  it('sets a non-default plan as the default', async () => {
    render(<PlanSettingsPage />)
    // Only the non-default plan offers the set-default action.
    const buttons = screen.getAllByRole('button', { name: /plans.setDefault/ })
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(setDefaultPlan).toHaveBeenCalledWith('p-trip')
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes after confirm', async () => {
    render(<PlanSettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: /plans.delete/ }))
    await userEvent.click(await screen.findByText('summary.delete'))
    expect(deletePlan).toHaveBeenCalledWith('p-trip')
  })
})
