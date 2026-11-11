import { CalendarClock, CircleCheck, Hourglass, type LucideIcon } from 'lucide-react'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'

interface Props {
  month: string
  onMonthChange: (month: string) => void
  total: number
  paid: number
  remaining: number
  /** Items (incl. card statements) settled / listed this month. */
  paidCount: number
  count: number
}

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Month headline on a dark gradient: what is due, the paid share as a bar, paid / remaining glass tiles. */
export function RecurringHero({ month, onMonthChange, total, paid, remaining, paidCount, count }: Props) {
  const { t } = useI18n()
  const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 p-5 text-white shadow-lg sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-500/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative grid gap-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div data-testid="tile-total" className="grid min-w-0 gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
              <CalendarClock className="size-3.5" aria-hidden />
              {t('recurring.total')}
            </span>
            <span className="truncate text-3xl font-extrabold tracking-tight tabular-nums sm:text-4xl">{vnd(total)}</span>
          </div>
          <input
            type="month"
            aria-label={t('recurring.title')}
            className="h-9 w-44 rounded-lg bg-white/10 px-3 text-sm text-white ring-1 ring-white/15 outline-none backdrop-blur-sm [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-violet-300"
            value={month}
            onChange={(e) => e.target.value && onMonthChange(e.target.value)}
          />
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
            <span data-testid="hero-paid-share">{paidPct}%</span>
            <span>
              {paidCount}/{count}
            </span>
          </div>
          {/* Paid vs still-to-pay share of the month. */}
          <CategoryBar
            values={total > 0 ? [paid, remaining] : [1]}
            colors={total > 0 ? ['emerald', 'rose'] : ['gray']}
            showLabels={false}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <GlassTile testId="tile-paid" icon={CircleCheck} label={t('recurring.paid')} value={vnd(paid)} tone="text-emerald-300" />
          <GlassTile
            testId="tile-remaining"
            icon={Hourglass}
            label={t('recurring.remaining')}
            value={vnd(remaining)}
            tone="text-rose-300"
          />
        </div>
      </div>
    </section>
  )
}

function GlassTile({
  testId,
  icon: Icon,
  label,
  value,
  tone,
}: {
  testId: string
  icon: LucideIcon
  label: string
  value: string
  tone: string
}) {
  return (
    <div data-testid={testId} className="grid min-w-0 gap-1 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1.5 truncate text-xs text-slate-300">
        <Icon className={`size-3.5 shrink-0 ${tone}`} aria-hidden />
        {label}
      </span>
      <span className={`truncate text-base font-bold tabular-nums sm:text-lg ${tone}`}>{value}</span>
    </div>
  )
}
