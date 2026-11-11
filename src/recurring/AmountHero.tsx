import type { ReactNode } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { formatThousands } from '../accounts/moneyDigits'

const TONES = {
  primary: { box: 'border-primary/20 bg-primary/5 focus-within:ring-primary/15', text: 'text-primary' },
  paid: {
    box: 'border-emerald-500/20 bg-emerald-500/5 focus-within:ring-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
} as const

/** Big tinted digit-only money field — the dialog's main amount, like the transaction form's hero. */
export function AmountHero({
  id,
  label,
  digits,
  onChange,
  tone = 'primary',
  children,
}: {
  id: string
  label: string
  digits: string
  onChange: (digits: string) => void
  tone?: keyof typeof TONES
  children?: ReactNode
}) {
  const style = TONES[tone]
  return (
    <div
      className={cn(
        'grid gap-1 rounded-2xl border px-4 pb-3 pt-3.5 text-center transition-colors focus-within:ring-[3px]',
        style.box,
      )}
    >
      <Label htmlFor={id} className="justify-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          inputMode="numeric"
          autoComplete="off"
          placeholder="0"
          className={cn(
            'h-14 border-0 bg-transparent px-10 text-center text-4xl font-bold tracking-tight tabular-nums shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent',
            style.text,
          )}
          value={formatThousands(digits)}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        />
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl font-semibold text-muted-foreground">
          ₫
        </span>
      </div>
      {children}
    </div>
  )
}
