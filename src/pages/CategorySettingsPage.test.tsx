import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createCategory, updateCategory } from '../api/categoryApi'
import type { CategoryResponse } from '../api/types'
import { CategorySettingsPage } from './CategorySettingsPage'

const refresh = vi.fn().mockResolvedValue(undefined)

const categories: CategoryResponse[] = [
  { id: 'c-food', name: 'Ăn uống', icon: 'utensils', code: null, kind: 'expense', excludeFromStats: false },
  { id: 'c-transfer', name: 'Chuyển tiền nội bộ', icon: 'house', code: null, kind: 'both', excludeFromStats: true },
]

vi.mock('../api/categoryApi', () => ({
  createCategory: vi.fn().mockResolvedValue({ id: 'new' }),
  updateCategory: vi.fn().mockResolvedValue(undefined),
  deleteCategory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../categories/CategoriesContext', () => ({
  useCategories: () => ({ customCategories: categories, refresh }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('CategorySettingsPage exclude from stats', () => {
  beforeEach(() => {
    vi.mocked(createCategory).mockClear()
    vi.mocked(updateCategory).mockClear()
  })

  it('shows the excluded chip only on flagged categories', () => {
    render(<CategorySettingsPage />)
    expect(screen.getAllByText('summary.excludedBadge')).toHaveLength(1)
    expect(screen.getByText('Chuyển tiền nội bộ').parentElement).toHaveTextContent('summary.excludedBadge')
  })

  it('sends excludeFromStats=true on create when the box is checked', async () => {
    render(<CategorySettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: /cat.create/ }))
    await userEvent.type(await screen.findByLabelText('cat.name'), 'Cho vay')
    await userEvent.click(screen.getByRole('button', { name: 'wallet' }))
    expect(screen.getByText('cat.excludeFromStatsHint')).toBeInTheDocument()
    const box = screen.getByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createCategory).toHaveBeenCalledWith('Cho vay', 'wallet', true)
  })

  it('pre-fills the box on edit and sends the toggled value', async () => {
    render(<CategorySettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'summary.edit Chuyển tiền nội bộ' }))
    const box = await screen.findByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).toBeChecked()
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateCategory).toHaveBeenCalledWith('c-transfer', 'Chuyển tiền nội bộ', 'house', true)
  })

  it('edit of an unflagged category starts unchecked; checking sends true', async () => {
    render(<CategorySettingsPage />)
    await userEvent.click(screen.getByRole('button', { name: 'summary.edit Ăn uống' }))
    const box = await screen.findByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateCategory).toHaveBeenCalledWith('c-food', 'Ăn uống', 'utensils', true)
  })
})
