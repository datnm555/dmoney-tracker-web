import { Banknote, Check, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType } from '../../api/types'
import { useI18n } from '../../i18n/I18nContext'
import type { PayWithChip } from '../../utils/payWith'

interface Props {
  chips: PayWithChip[]
  selectedKey: string | null
  onPick: (chip: PayWithChip) => void
}

const TYPE_STYLE: Record<AccountType, { icon: LucideIcon; tint: string }> = {
  checking: { icon: Landmark, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  overdraft: { icon: Landmark, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  credit_card: { icon: CreditCard, tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  ewallet: { icon: Smartphone, tint: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  cash: { icon: Banknote, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
}

export function PayWithChips({ chips, selectedKey, onPick }: Props) {
  const { t } = useI18n()
  return (
    <div className="grid grid-cols-2 gap-2">
      {chips.map((chip) => {
        const selected = chip.key === selectedKey
        const { icon: Icon, tint } = TYPE_STYLE[chip.type]
        // No card digits: fall back to the type label so cards and overdrafts still read apart.
        // It is aria-hidden to keep the button's accessible name to the account name.
        const typeHint = !chip.lastDigits && chip.type !== 'checking' && chip.type !== 'cash'
        return (
          <button
            key={chip.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onPick(chip)}
            className={cn(
              'relative flex min-w-0 items-center gap-2.5 rounded-xl border bg-card p-2.5 text-left transition-colors hover:border-zinc-300 hover:bg-muted/40',
              selected && 'border-primary bg-primary/5 ring-1 ring-primary/30 hover:border-primary hover:bg-primary/5',
            )}
          >
            <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', tint)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="grid min-w-0 pr-3">
              <span className="truncate text-sm font-medium">{chip.label}</span>
              {chip.lastDigits && (
                <span className="text-xs text-muted-foreground tabular-nums">•••{chip.lastDigits}</span>
              )}
              {typeHint && (
                <span aria-hidden className="truncate text-xs text-muted-foreground">
                  {t(`accounts.type.${chip.type}`)}
                </span>
              )}
            </span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" strokeWidth={3} aria-hidden />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
