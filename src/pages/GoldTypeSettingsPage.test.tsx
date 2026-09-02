import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { deleteGoldType, updateGoldType } from '../api/goldApi'
import { GoldTypeSettingsPage } from './GoldTypeSettingsPage'

const refresh = vi.fn()

vi.mock('../api/goldApi', () => ({
  createGoldType: vi.fn(),
  updateGoldType: vi.fn().mockResolvedValue(undefined),
  deleteGoldType: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../gold/GoldTypesContext', () => ({
  useGoldTypes: () => ({
    goldTypes: [
      { id: 'g-1', name: 'Nhẫn trơn' },
      { id: 'g-2', name: 'SJC' },
    ],
    refresh,
  }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('GoldTypeSettingsPage', () => {
  it('lists gold types without a default badge', () => {
    render(<GoldTypeSettingsPage />)
    expect(screen.getByText('Nhẫn trơn')).toBeInTheDocument()
    expect(screen.getByText('SJC')).toBeInTheDocument()
    expect(screen.queryByText('beneficiaries.default')).not.toBeInTheDocument()
    expect(screen.queryByText('goldTypes.default')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /goldTypes.delete/ })).toHaveLength(2)
  })

  it('renames a gold type', async () => {
    render(<GoldTypeSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /goldTypes.rename/ })[1])
    const input = await screen.findByDisplayValue('SJC')
    await userEvent.clear(input)
    await userEvent.type(input, 'SJC 9999{Enter}')
    expect(updateGoldType).toHaveBeenCalledWith('g-2', 'SJC 9999')
    expect(refresh).toHaveBeenCalled()
  })

  it('deletes after confirm', async () => {
    render(<GoldTypeSettingsPage />)
    await userEvent.click(screen.getAllByRole('button', { name: /goldTypes.delete/ })[1])
    await userEvent.click(await screen.findByText('summary.delete'))
    expect(deleteGoldType).toHaveBeenCalledWith('g-2')
    expect(refresh).toHaveBeenCalled()
  })
})
