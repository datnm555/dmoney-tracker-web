import { cn } from '@/lib/utils'
import type { TransactionSuggestionResponse } from '../../api/types'
import { useCategoryDisplay } from '../../categories/useCategoryDisplay'
import { useI18n } from '../../i18n/I18nContext'
import { formatMoney } from '../../utils/money'

interface Props {
  items: TransactionSuggestionResponse[]
  highlight: number
  onHighlight: (index: number) => void
  onPick: (suggestion: TransactionSuggestionResponse) => void
}

export function ContentSuggestions({ items, highlight, onHighlight, onPick }: Props) {
  const { t } = useI18n()
  const { label } = useCategoryDisplay()
  return (
    <div className="absolute inset-x-0 top-full z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md">
      <p className="px-3 pt-2 pb-1 text-xs text-muted-foreground">{t('form.suggestions')}</p>
      <ul role="listbox" className="max-h-64 overflow-y-auto pb-1">
        {items.map((s, index) => {
          const category = label(s.categoryId)
          return (
            <li
              key={s.content}
              role="option"
              aria-selected={index === highlight}
              // preventDefault keeps focus in the input so blur does not close before the pick.
              onMouseDown={(e) => {
                e.preventDefault()
                onPick(s)
              }}
              onMouseEnter={() => onHighlight(index)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 px-3 py-1.5 text-sm',
                index === highlight && 'bg-accent',
              )}
            >
              <span className="min-w-0">
                <span className="block truncate">{s.content}</span>
                {category && <span className="block truncate text-xs text-muted-foreground">{category}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(s.amount)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
