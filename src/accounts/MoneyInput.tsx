import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatThousands } from './moneyDigits'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

/**
 * Digit-only money field, mirrors the amount input in TransactionFormModal.
 * - `plain` (default): the original compact field.
 * - `field`: rounded-xl field with an uppercase label, for secondary amounts in the modern dialogs.
 * - `hero`: the big tinted amount block for a dialog's primary money value (`tone` picks emerald/rose).
 */
export function MoneyInput({
  id,
  label,
  digits,
  onChange,
  variant = 'plain',
  tone = 'income',
  hint,
}: {
  id: string
  label: string
  digits: string
  onChange: (digits: string) => void
  variant?: 'plain' | 'field' | 'hero'
  tone?: 'income' | 'expense'
  hint?: ReactNode
}) {
  const value = formatThousands(digits)
  const handle = (raw: string) => onChange(raw.replace(/\D/g, ''))

  if (variant === 'hero') {
    return (
      <div
        className={cn(
          'grid gap-1 rounded-2xl border px-4 pb-3 pt-3.5 text-center transition-colors focus-within:ring-[3px]',
          tone === 'expense'
            ? 'border-expense/20 bg-expense/5 focus-within:ring-expense/15'
            : 'border-income/20 bg-income/5 focus-within:ring-income/15',
        )}
      >
        <Label htmlFor={id} className={cn(SECTION_LABEL, 'justify-center')}>
          {label}
        </Label>
        <div className="relative">
          <Input
            id={id}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            className={cn(
              'h-12 border-0 bg-transparent px-10 text-center text-3xl font-bold tracking-tight tabular-nums shadow-none focus-visible:ring-0 md:text-3xl dark:bg-transparent',
              tone === 'expense' ? 'text-expense' : 'text-income',
            )}
            value={value}
            onChange={(e) => handle(e.target.value)}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-lg font-semibold text-muted-foreground">
            ₫
          </span>
        </div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
    )
  }

  const field = variant === 'field'
  return (
    <div className={cn('grid', field ? 'gap-2' : 'gap-1.5')}>
      <Label htmlFor={id} className={field ? SECTION_LABEL : undefined}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          className={cn('pr-9', field && 'h-10 rounded-xl tabular-nums')}
          value={value}
          onChange={(e) => handle(e.target.value)}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          ₫
        </span>
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
