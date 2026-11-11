import dayjs from 'dayjs'
import { AreaChart } from '../components/tremor/AreaChart'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import type { GoldHistoryRow } from './GoldHistoryList'
import { goldPricePoints } from './goldPricePoints'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Tremor area line of the price paid per chỉ over time, with the average cost alongside. */
export function GoldPriceTrend({ rows, avgCostPerChi }: { rows: GoldHistoryRow[]; avgCostPerChi: number }) {
  const { t } = useI18n()
  const points = goldPricePoints(rows)
  if (points.length < 2) return null
  const label = t('gold.pricePerChi')
  // Short tick labels: a centred "31/01/26" at the edge got clipped by the chart's 20px padding.
  const sameYear = points.every((p) => p.date.slice(0, 4) === points[0].date.slice(0, 4))
  const axisFormat = sameYear ? 'DD/MM' : 'MM/YY'
  return (
    <div data-testid="gold-price-trend" data-points={points.length} className="grid gap-2 px-4 pb-1 pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {avgCostPerChi > 0 && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-800 dark:text-amber-300">
            {t('gold.avgCost')}: <span className="font-semibold tabular-nums">{vnd(avgCostPerChi)}</span>
          </span>
        )}
      </div>
      <AreaChart
        className="h-32"
        data={points.map((p) => ({ date: dayjs(p.date).format(axisFormat), [label]: p.price }))}
        index="date"
        categories={[label]}
        colors={['amber']}
        valueFormatter={vnd}
        showLegend={false}
        showYAxis={false}
        autoMinValue
        fill="gradient"
      />
    </div>
  )
}
