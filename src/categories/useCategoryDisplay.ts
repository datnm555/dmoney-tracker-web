import { useCallback, useMemo } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { categoryVisual, visualForIcon } from '../utils/categoryIcons'
import type { CategoryVisual } from '../utils/categoryIcons'
import { useCategories } from './CategoriesContext'

export interface CategoryOption {
  /** Value stored on transactions/sub-categories: the category's id. */
  code: string
  label: string
  visual: CategoryVisual
  /** False for the seeded system categories (they carry a built-in code). */
  isCustom: boolean
}

/**
 * Resolves labels and visuals for db-backed categories. Seeded system rows
 * localize through their built-in code; rows on old transactions that still
 * hold a code string fall back to the i18n label and legacy visual.
 */
export function useCategoryDisplay() {
  const { t } = useI18n()
  const { customCategories: categories } = useCategories()

  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories])

  const label = useCallback(
    (code: string | null | undefined): string => {
      if (!code) return ''
      // Stored name wins (categories are editable data); legacy code strings
      // on old rows still localize through resx.
      return byId.get(code)?.name ?? t(`category.${code}`)
    },
    [byId, t],
  )

  const visual = useCallback(
    (code: string | null | undefined): CategoryVisual => {
      const category = code ? byId.get(code) : undefined
      return category ? visualForIcon(category.icon) : categoryVisual(code ?? null)
    },
    [byId],
  )

  const options = useMemo<CategoryOption[]>(
    () =>
      categories.map((c) => ({
        code: c.id,
        label: c.name,
        visual: visualForIcon(c.icon),
        isCustom: !c.code,
      })),
    [categories],
  )

  return { label, visual, options, customCategories: categories }
}
