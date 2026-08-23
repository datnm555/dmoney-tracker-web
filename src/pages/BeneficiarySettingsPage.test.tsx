import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteBeneficiary, setDefaultBeneficiary, updateBeneficiary } from '../api/beneficiaryApi'
import { BeneficiarySettingsPage } from './BeneficiarySettingsPage'

const refresh = vi.fn()

vi.mock('../api/beneficiaryApi', () => ({
  createBeneficiary: vi.fn(),
  updateBeneficiary: vi.fn().mockResolvedValue(undefined),
  deleteBeneficiary: vi.fn().mockResolvedValue(undefined),
  setDefaultBeneficiary: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../beneficiaries/BeneficiariesContext', () => ({
  useBeneficiaries: () => ({
    beneficiaries: [
      { id: 'b-default', name: 'Gia đình', isDefault: true },
      { id: 'b-2', name: 'Bạn bè', isDefault: false },
    ],
    refresh,
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('BeneficiarySettingsPage', () => {
  it('lists beneficiaries and marks the default one', () => {
    render(<BeneficiarySettingsPage />)
    expect(screen.getByText('Gia đình')).toBeInTheDocument()
    expect(screen.getByText('beneficiaries.default')).toBeInTheDocument()
    // Delete is always available (server enforces InUse, not client-side default-guard).
    expect(screen.getAllByRole('button', { name: /beneficiaries.delete/ })).toHaveLength(2)
  })

  it('renames a beneficiary', async () => {
    render(<BeneficiarySettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /beneficiaries.rename/ })[1])
    const input = await screen.findByDisplayValue('Bạn bè')
    await userEvent.clear(input)
    await userEvent.type(input, 'Đồng nghiệp{Enter}')
    expect(updateBeneficiary).toHaveBeenCalledWith('b-2', 'Đồng nghiệp')
    expect(refresh).toHaveBeenCalled()
  })

  it('sets a non-default beneficiary as the default', async () => {
    render(<BeneficiarySettingsPage />)
    // Only the non-default beneficiary offers the set-default action.
    const buttons = screen.getAllByRole('button', { name: /beneficiaries.setDefault/ })
    expect(buttons).toHaveLength(1)
    await userEvent.click(buttons[0])
    expect(setDefaultBeneficiary).toHaveBeenCalledWith('b-2')
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes after confirm', async () => {
    render(<BeneficiarySettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /beneficiaries.delete/ })[1])
    await userEvent.click(await screen.findByText('summary.delete'))
    expect(deleteBeneficiary).toHaveBeenCalledWith('b-2')
    expect(refresh).toHaveBeenCalled()
  })
})
