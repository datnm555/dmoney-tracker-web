import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, WalletCards } from 'lucide-react'
import type { MoneyResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'

interface Props {
  balance: MoneyResponse | null
  income: MoneyResponse | null
  expense: MoneyResponse | null
  incomeCount: number
  expenseCount: number
  /** % change of the balance vs the previous month; null hides the pill. */
  delta: number | null
  /** "giao dịch tháng này" / "giao dịch năm nay". */
  countLabel: string
}

/** Balance headline on a violet gradient, with income / expense glass tiles and their split. */
export function CashflowHero({ balance, income, expense, incomeCount, expenseCount, delta, countLabel }: Props) {
  const { t } = useI18n()
  const inAmount = income?.amount ?? 0
  const outAmount = expense?.amount ?? 0
  const inPct = inAmount + outAmount > 0 ? (inAmount / (inAmount + outAmount)) * 100 : 50
  const DeltaIcon = (delta ?? 0) >= 0 ? TrendingUp : TrendingDown
  return (
    <section
      data-testid="cashflow-hero"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6C4CF1] via-violet-700 to-indigo-900 p-5 text-white shadow-lg shadow-violet-900/20 sm:p-6"
    >
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-fuchsia-400/30 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 left-0 size-64 rounded-full bg-sky-400/20 blur-3xl" />

      <div className="relative grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-violet-100/80">
              <WalletCards className="size-3.5" aria-hidden />
              {t('dashboard.totalBalance')}
            </span>
            <span data-testid="hero-balance" className="text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl">
              {balance ? formatMoney(balance) : '—'}
            </span>
            {delta !== null && (
              <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium ring-1 ring-white/20">
                <DeltaIcon className="size-3" aria-hidden />
                {delta >= 0 ? '+' : ''}
                {delta.toFixed(1)}% <span className="font-normal text-violet-100/80">{t('dashboard.vsLastMonth')}</span>
              </span>
            )}
          </div>
        </div>

        {/* Income vs expense split. */}
        <div aria-hidden className="flex h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-emerald-300 to-emerald-400" style={{ width: `${inPct}%` }} />
          <div className="h-full flex-1 bg-gradient-to-r from-rose-400 to-rose-500" />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <FlowTile
            testId="hero-income"
            icon={ArrowUpRight}
            label={t('summary.colCredit')}
            value={income ? `+${formatMoney(income)}` : '—'}
            tone="text-emerald-300"
            sub={`${incomeCount} ${countLabel}`}
          />
          <FlowTile
            testId="hero-expense"
            icon={ArrowDownRight}
            label={t('summary.colDebit')}
            value={expense ? `−${formatMoney(expense)}` : '—'}
            tone="text-rose-300"
            sub={`${expenseCount} ${countLabel}`}
          />
        </div>
      </div>
    </section>
  )
}

function FlowTile({
  testId,
  icon: Icon,
  label,
  value,
  tone,
  sub,
}: {
  testId: string
  icon: typeof ArrowUpRight
  label: string
  value: string
  tone: string
  sub: string
}) {
  return (
    <div className="grid gap-1 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1.5 text-xs text-violet-100/90">
        <span className="flex size-5 items-center justify-center rounded-full bg-white/15">
          <Icon className={`size-3 ${tone}`} aria-hidden />
        </span>
        {label}
      </span>
      <span data-testid={testId} className={`truncate text-lg font-bold tabular-nums sm:text-xl ${tone}`}>
        {value}
      </span>
      <span className="text-[11px] text-violet-100/70">{sub}</span>
    </div>
  )
}
