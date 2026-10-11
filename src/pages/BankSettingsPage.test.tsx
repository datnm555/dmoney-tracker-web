import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteBank, updateBank } from '../api/bankApi'
import { BankSettingsPage } from './BankSettingsPage'

const refresh = vi.fn()

vi.mock('../api/bankApi', () => ({
  createBank: vi.fn(),
  updateBank: vi.fn().mockResolvedValue(undefined),
  deleteBank: vi.fn().mockResolvedValue(undefined),
  setDefaultBank: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../banks/BanksContext', () => ({
  useBanks: () => ({
    banks: [
      { id: 'b-1', name: 'MoMo', isDefault: true },
      { id: 'b-2', name: 'Techcombank', isDefault: false },
    ],
    refresh,
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('BankSettingsPage', () => {
  it('lists banks', () => {
    render(<BankSettingsPage />)
    expect(screen.getByText('MoMo')).toBeInTheDocument()
    expect(screen.getByText('Techcombank')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /banks.delete/ })).toHaveLength(2)
  })

  it('renames a bank', async () => {
    render(<BankSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /banks.rename/ })[1])
    const input = await screen.findByDisplayValue('Techcombank')
    await userEvent.clear(input)
    await userEvent.type(input, 'TCB{Enter}')
    expect(updateBank).toHaveBeenCalledWith('b-2', 'TCB')
    expect(refresh).toHaveBeenCalled()
  })

  it('shows the default badge and sets a new default', async () => {
    const { setDefaultBank } = await import('../api/bankApi')
    render(<BankSettingsPage />)
    // MoMo is default: badge shown, no set-default button for it.
    expect(screen.getByText('banks.default')).toBeInTheDocument()
    const setButtons = screen.getAllByRole('button', { name: /banks.setDefault/ })
    expect(setButtons).toHaveLength(1) // only Techcombank
    await userEvent.click(setButtons[0])
    expect(setDefaultBank).toHaveBeenCalledWith('b-2')
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes after confirm', async () => {
    render(<BankSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /banks.delete/ })[1])
    await userEvent.click(await screen.findByText('summary.delete'))
    expect(deleteBank).toHaveBeenCalledWith('b-2')
    expect(refresh).toHaveBeenCalled()
  })
})
