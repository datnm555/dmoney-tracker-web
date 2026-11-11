import { Coins } from 'lucide-react'
import type { GoldTypeSummaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

/** One gold type: held quantity as the headline, a held/sold bar and the buy/sell figures as mini tiles. */
export function GoldTypeCard({ type }: { type: GoldTypeSummaryResponse }) {
  const { t } = useI18n()
  const unit = t('gold.unit')
  const heldPct = type.boughtQuantity > 0 ? Math.round((type.heldQuantity / type.boughtQuantity) * 100) : 0
  return (
    <div
      data-testid={`gold-type-${type.goldTypeId}`}
      className="relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-card to-card p-4 shadow-sm dark:border-amber-500/20 dark:from-amber-500/10"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-600 shadow-sm shadow-amber-900/20">
          <Coins className="size-5 text-amber-950" aria-hidden />
        </span>
        <div className="min-w-0">
          <div data-testid="gold-type-name" className="truncate font-semibold">
            {type.name}
          </div>
          <div className="text-xs text-muted-foreground">{t('gold.held')}</div>
        </div>
        <div data-testid="gold-type-held" className="ml-auto text-right text-2xl font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
          {formatGoldQuantity(type.heldQuantity)}
          <span className="ml-1 text-sm font-semibold text-muted-foreground">{unit}</span>
        </div>
      </div>

      {/* Held vs sold share of everything bought. */}
      <div className="mt-3 grid gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-amber-100 dark:bg-amber-500/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-amber-600"
            style={{ width: `${heldPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {t('gold.bought')} <span className="font-medium text-foreground tabular-nums">{formatGoldQuantity(type.boughtQuantity)} {unit}</span>
          </span>
          <span>
            {t('gold.sold')} <span className="font-medium text-foreground tabular-nums">{formatGoldQuantity(type.soldQuantity)} {unit}</span>
          </span>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label={t('gold.avgCost')} value={formatMoney(type.averageCostPerChi)} className="col-span-2" />
        <Stat label={t('gold.totalSpent')} value={formatMoney(type.totalSpent)} valueClass="text-income" />
        <Stat label={t('gold.totalReceived')} value={formatMoney(type.totalReceived)} valueClass="text-income" />
      </dl>
    </div>
  )
}

function Stat({
  label,
  value,
  valueClass,
  className,
}: {
  label: string
  value: string
  valueClass?: string
  className?: string
}) {
  return (
    <div className={`grid gap-0.5 rounded-lg bg-background/70 px-2.5 py-2 ring-1 ring-border/60 ${className ?? ''}`}>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-sm font-semibold tabular-nums ${valueClass ?? ''}`}>{value}</dd>
    </div>
  )
}
