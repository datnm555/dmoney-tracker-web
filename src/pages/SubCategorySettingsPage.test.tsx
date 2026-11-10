import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createSubCategory, getSubCategories, updateSubCategory } from '../api/subCategoryApi'
import type { CategoryResponse, SubCategoryResponse } from '../api/types'
import { SubCategorySettingsPage } from './SubCategorySettingsPage'

const categories: CategoryResponse[] = [
  { id: 'c-debt', name: 'Nợ', icon: 'wallet', code: null, kind: 'both', excludeFromStats: false },
]

const subCategories: SubCategoryResponse[] = [
  {
    id: 's-lend',
    categoryId: 'c-debt',
    name: 'Cho vay',
    isDefault: false,
    icon: null,
    code: null,
    excludeFromStats: true,
  },
  {
    id: 's-interest',
    categoryId: 'c-debt',
    name: 'Lãi vay',
    isDefault: true,
    icon: null,
    code: null,
    excludeFromStats: false,
  },
]

vi.mock('../api/subCategoryApi', () => ({
  getSubCategories: vi.fn(),
  createSubCategory: vi.fn().mockResolvedValue({ id: 'new' }),
  updateSubCategory: vi.fn().mockResolvedValue(undefined),
  deleteSubCategory: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../categories/CategoriesContext', () => ({
  useCategories: () => ({ customCategories: categories, refresh: vi.fn() }),
}))

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

describe('SubCategorySettingsPage exclude from stats', () => {
  beforeEach(() => {
    vi.mocked(getSubCategories).mockResolvedValue(subCategories)
    vi.mocked(createSubCategory).mockClear()
    vi.mocked(updateSubCategory).mockClear()
  })

  it('shows the excluded chip only on flagged sub-categories', async () => {
    render(<SubCategorySettingsPage />)
    expect(await screen.findByText('Cho vay')).toBeInTheDocument()
    expect(screen.getAllByText('summary.excludedBadge')).toHaveLength(1)
    expect(screen.getByText('Cho vay').closest('span')).toHaveTextContent('summary.excludedBadge')
    expect(screen.getByText('Lãi vay').closest('span')).not.toHaveTextContent('summary.excludedBadge')
  })

  it('sends excludeFromStats=true on create when the box is checked', async () => {
    render(<SubCategorySettingsPage />)
    await screen.findByText('Cho vay')
    await userEvent.click(screen.getByRole('button', { name: /subcat.create/ }))
    await userEvent.type(await screen.findByLabelText('subcat.name'), 'Vay vào')
    expect(screen.getByText('cat.excludeFromStatsHint')).toBeInTheDocument()
    const box = screen.getByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(createSubCategory).toHaveBeenCalledWith('c-debt', 'Vay vào', false, null, true)
  })

  it('pre-fills the box on edit and sends the toggled value', async () => {
    render(<SubCategorySettingsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'summary.edit Cho vay' }))
    const box = await screen.findByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).toBeChecked()
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateSubCategory).toHaveBeenCalledWith('s-lend', 'Cho vay', false, null, false)
  })

  it('edit of an unflagged sub-category starts unchecked; checking sends true', async () => {
    render(<SubCategorySettingsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'summary.edit Lãi vay' }))
    const box = await screen.findByRole('checkbox', { name: 'cat.excludeFromStats' })
    expect(box).not.toBeChecked()
    await userEvent.click(box)
    await userEvent.click(screen.getByRole('button', { name: 'summary.submit' }))
    expect(updateSubCategory).toHaveBeenCalledWith('s-interest', 'Lãi vay', true, null, true)
  })
})
