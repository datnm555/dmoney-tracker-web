import { useCallback, useMemo } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { CATEGORY_CODES } from '../utils/categories'
import { categoryVisual, visualForIcon } from '../utils/categoryIcons'
import type { CategoryVisual } from '../utils/categoryIcons'
import { useCategories } from './CategoriesContext'

export interface CategoryOption {
  code: string
  label: string
  visual: CategoryVisual
  isCustom: boolean
}

/** Resolves labels and visuals across built-in and user-defined categories. */
export function useCategoryDisplay() {
  const { t } = useI18n()
  const { customCategories } = useCategories()

  const byId = useMemo(
    () => new Map(customCategories.map((c) => [c.id, c])),
    [customCategories],
  )

  const label = useCallback(
    (code: string | null | undefined): string => {
      if (!code) return ''
      return byId.get(code)?.name ?? t(`category.${code}`)
    },
    [byId, t],
  )

  const visual = useCallback(
    (code: string | null | undefined): CategoryVisual => {
      const custom = code ? byId.get(code) : undefined
      return custom ? visualForIcon(custom.icon) : categoryVisual(code ?? null)
    },
    [byId],
  )

  const options = useMemo<CategoryOption[]>(
    () => [
      ...CATEGORY_CODES.map((code) => ({
        code: code as string,
        label: t(`category.${code}`),
        visual: categoryVisual(code),
        isCustom: false,
      })),
      ...customCategories.map((c) => ({
        code: c.id,
        label: c.name,
        visual: visualForIcon(c.icon),
        isCustom: true,
      })),
    ],
    [customCategories, t],
  )

  return { label, visual, options, customCategories }
}
