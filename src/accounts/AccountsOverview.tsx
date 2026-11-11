import { CreditCard, Landmark, Percent, Wallet, type LucideIcon } from 'lucide-react'
import { useI18n } from '../i18n/I18nContext'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { ProgressBar } from '../components/tremor/ProgressBar'
import { formatMoney } from '../utils/money'

interface Props {
  cash: number
  debt: number
  available: number
  /** Estimated overdraft interest per month; the tile hides at 0. */
  interest: number
}

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Fintech-style hero: money held vs owed with a ratio bar, then credit headroom and interest. */
export function AccountsOverview({ cash, debt, available, interest }: Props) {
  const { t } = useI18n()
  const leftPct = debt + available > 0 ? (available / (debt + available)) * 100 : 0
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-violet-950 p-5 text-white shadow-lg sm:p-6">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-violet-500/25 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-10 size-64 rounded-full bg-emerald-500/15 blur-3xl" />

      <div className="relative grid gap-5">
        <div className="grid grid-cols-2 gap-4">
          <Headline testId="tile-cash" icon={Wallet} label={t('accounts.cashTotal')} value={vnd(cash)} tone="text-emerald-300" />
          <Headline
            testId="tile-debt"
            icon={CreditCard}
            label={t('accounts.debtTotal')}
            value={vnd(debt)}
            tone="text-rose-300"
            align="right"
          />
        </div>

        {/* Share of money held vs owed. */}
        <CategoryBar
          values={cash + debt > 0 ? [cash, debt] : [1]}
          colors={cash + debt > 0 ? ['emerald', 'rose'] : ['gray']}
          showLabels={false}
        />

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div data-testid="tile-available" className="grid gap-2 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-sm">
            <TileLabel icon={Landmark} label={t('accounts.availableCredit')} />
            <div className="text-lg font-bold tabular-nums text-sky-200">{vnd(available)}</div>
            <ProgressBar value={leftPct} variant="default" />
          </div>
          {interest > 0 && (
            <div data-testid="tile-interest" className="grid gap-2 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-sm">
              <TileLabel icon={Percent} label={t('accounts.monthlyInterest')} />
              <div className="text-lg font-bold tabular-nums text-amber-200">{vnd(interest)}</div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function Headline({
  testId,
  icon: Icon,
  label,
  value,
  tone,
  align = 'left',
}: {
  testId: string
  icon: LucideIcon
  label: string
  value: string
  tone: string
  align?: 'left' | 'right'
}) {
  return (
    <div data-testid={testId} className={`grid min-w-0 gap-1 ${align === 'right' ? 'justify-items-end text-right' : ''}`}>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </span>
      <span className={`truncate text-2xl font-extrabold tabular-nums sm:text-3xl ${tone}`}>{value}</span>
    </div>
  )
}

function TileLabel({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
      <Icon className="size-3.5 text-violet-300" aria-hidden />
      {label}
    </span>
  )
}
