import { ArrowUpRight, Coins, PiggyBank, Scale, type LucideIcon } from 'lucide-react'
import type { MoneyResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

interface Props {
  totalHeld: number
  /** Names of the gold types still held, for the chips under the headline. */
  heldTypes: string[]
  totalBought: number
  totalSold: number
  totalSpent: MoneyResponse
  totalReceived: MoneyResponse
  avgCost: MoneyResponse
}

/** The "vault" hero: held quantity as the headline, money stats as glass tiles. */
export function GoldOverview({ totalHeld, heldTypes, totalBought, totalSold, totalSpent, totalReceived, avgCost }: Props) {
  const { t } = useI18n()
  return (
    <section
      data-testid="gold-overview"
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950 p-5 text-white shadow-lg sm:p-6"
    >
      {/* Soft gold glows; purely decorative. */}
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-amber-400/20 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-24 left-10 size-56 rounded-full bg-yellow-500/10 blur-3xl" />

      <div className="relative grid gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-amber-200/70">{t('gold.held')}</span>
            <div className="flex items-baseline gap-2">
              <span
                data-testid="gold-held-total"
                className="bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-500 bg-clip-text text-5xl font-extrabold tracking-tight text-transparent tabular-nums"
              >
                {formatGoldQuantity(totalHeld)}
              </span>
              <span className="text-lg font-semibold text-amber-200/80">{t('gold.unit')}</span>
            </div>
            {heldTypes.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {heldTypes.map((name) => (
                  <span
                    key={name}
                    data-testid="gold-held-type"
                    className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-amber-100 ring-1 ring-white/10"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-600 shadow-lg shadow-amber-900/40">
            <Coins className="size-6 text-amber-950" />
          </span>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-3">
          <Tile
            testId="gold-stat-saved"
            icon={PiggyBank}
            label={t('gold.totalSaved')}
            value={formatMoney(totalSpent)}
            valueClass="text-emerald-300"
            sub={`${t('gold.bought')} ${formatGoldQuantity(totalBought)} ${t('gold.unit')}`}
          />
          <Tile
            testId="gold-stat-received"
            icon={ArrowUpRight}
            label={t('gold.totalReceived')}
            value={`+${formatMoney(totalReceived)}`}
            valueClass="text-emerald-300"
            sub={`${t('gold.sold')} ${formatGoldQuantity(totalSold)} ${t('gold.unit')}`}
          />
          <Tile
            testId="gold-stat-avg"
            icon={Scale}
            label={t('gold.avgCost')}
            value={formatMoney(avgCost)}
            valueClass="text-amber-200"
            sub={`${t('gold.bought')} ${formatGoldQuantity(totalBought)} · ${t('gold.sold')} ${formatGoldQuantity(totalSold)}`}
          />
        </div>
      </div>
    </section>
  )
}

function Tile({
  testId,
  icon: Icon,
  label,
  value,
  valueClass,
  sub,
}: {
  testId: string
  icon: LucideIcon
  label: string
  value: string
  valueClass: string
  sub: string
}) {
  return (
    <div data-testid={testId} className="grid gap-1 rounded-xl bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-xs text-zinc-300">
        <Icon className="size-3.5 text-amber-300" aria-hidden />
        {label}
      </div>
      <div data-testid={`${testId}-value`} className={`text-lg font-bold tabular-nums ${valueClass}`}>
        {value}
      </div>
      <div className="text-[11px] text-zinc-400">{sub}</div>
    </div>
  )
}
