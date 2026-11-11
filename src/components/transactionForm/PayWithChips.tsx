import { useState } from 'react'
import { Banknote, Check, ChevronDown, ChevronUp, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AccountType } from '../../api/types'
import { bankBrand } from '../../banks/bankBrand'
import { useI18n } from '../../i18n/I18nContext'
import { groupPayWithChips, type PayWithChip } from '../../utils/payWith'

interface Props {
  chips: PayWithChip[]
  selectedKey: string | null
  onPick: (chip: PayWithChip) => void
  /** Bank names in the user's display priority (Cài đặt → Ngân hàng). */
  bankOrder?: string[]
}

/** Bank groups shown before "Xem thêm". */
const VISIBLE_GROUPS = 2

const TYPE_STYLE: Record<AccountType, { icon: LucideIcon; tint: string }> = {
  checking: { icon: Landmark, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  overdraft: { icon: Landmark, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  credit_card: { icon: CreditCard, tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  ewallet: { icon: Smartphone, tint: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  cash: { icon: Banknote, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
}

/** Pay-with accounts grouped under their bank, one row per account; only the top banks until expanded. */
export function PayWithChips({ chips, selectedKey, onPick, bankOrder }: Props) {
  const { t } = useI18n()
  const [expanded, setExpanded] = useState(false)
  const groups = groupPayWithChips(chips, bankOrder)
  // A collapsed list never hides the current pick: its group stays visible.
  const visible = expanded
    ? groups
    : groups.filter((g, i) => i < VISIBLE_GROUPS || g.chips.some((c) => c.key === selectedKey))
  const hiddenCount = groups.length - visible.length
  return (
    <div className="grid gap-3">
      {visible.map((group) => {
        const brand = group.bank ? bankBrand(group.bank) : null
        return (
          <section key={group.bank ?? '__none__'} className="grid gap-1.5">
            <div className="flex items-center gap-2 px-1">
              {brand && (
                <span
                  aria-hidden
                  className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                  style={{ backgroundColor: brand.color }}
                >
                  {brand.short}
                </span>
              )}
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.bank ?? t('accounts.noBank')}
              </span>
            </div>
            <div className="divide-y overflow-hidden rounded-xl border bg-card">
              {group.chips.map((chip) => (
                <PayWithRow key={chip.key} chip={chip} selected={chip.key === selectedKey} onPick={onPick} />
              ))}
            </div>
          </section>
        )
      })}
      {(hiddenCount > 0 || expanded) && groups.length > VISIBLE_GROUPS && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1 rounded-xl border border-dashed py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-zinc-300 hover:text-foreground dark:hover:border-zinc-600"
        >
          {expanded ? (
            <>
              {t('form.payWithLess')}
              <ChevronUp className="size-3.5" aria-hidden />
            </>
          ) : (
            <>
              {t('form.payWithMore')} ({hiddenCount})
              <ChevronDown className="size-3.5" aria-hidden />
            </>
          )}
        </button>
      )}
    </div>
  )
}

function PayWithRow({
  chip,
  selected,
  onPick,
}: {
  chip: PayWithChip
  selected: boolean
  onPick: (chip: PayWithChip) => void
}) {
  const { t } = useI18n()
  const { icon: Icon, tint } = TYPE_STYLE[chip.type]
  // The type label is aria-hidden to keep the button's accessible name to the account name
  // (+ digits); cash skips it because its name already says "Tiền mặt".
  const typeLabel = chip.type === 'cash' ? null : t(`accounts.type.${chip.type}`)
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onPick(chip)}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
        selected && 'bg-primary/5 hover:bg-primary/5',
      )}
    >
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', tint)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="grid min-w-0 flex-1">
        <span className={cn('text-sm font-medium break-words', selected && 'text-primary')}>{chip.label}</span>
        {(typeLabel || chip.lastDigits) && (
          <span className="text-xs text-muted-foreground">
            {typeLabel && <span aria-hidden>{typeLabel}</span>}
            {typeLabel && chip.lastDigits && <span aria-hidden> · </span>}
            {chip.lastDigits && <span className="tabular-nums">•••{chip.lastDigits}</span>}
          </span>
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border',
          selected ? 'border-primary bg-primary text-primary-foreground' : 'border-zinc-300 dark:border-zinc-600',
        )}
      >
        {selected && <Check className="size-3" strokeWidth={3} />}
      </span>
    </button>
  )
}
