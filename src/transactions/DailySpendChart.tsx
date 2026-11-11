import dayjs from 'dayjs'
import type { TransactionResponse } from '../api/types'
import { BarChart, type TooltipProps } from '../components/tremor/BarChart'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { dailySpending } from './dailySpending'

// Two stacked series so the costliest day(s) can stand out: ordinary days are
// drawn in a muted rose (the "pink" slot is recoloured via the wrapper class),
// the peak in full rose. Each day has exactly one non-zero series.
const DAY_KEY = 'day'
const PEAK_KEY = 'peak'

interface DailySpendChartProps {
  /** The rows the totals card sums (already filtered); excludedFromStats rows are skipped. */
  items: Pick<TransactionResponse, 'date' | 'debit' | 'excludedFromStats'>[]
  /** First day of the period shown on the page. */
  from: dayjs.ConfigType
  /** Last day of the period shown on the page (inclusive). */
  to: dayjs.ConfigType
  currency: string
}

/** Compact one-bar-per-day spending chart for the transactions totals card. */
export function DailySpendChart({ items, from, to, currency }: DailySpendChartProps) {
  const { t } = useI18n()
  // Cheap (≤ a year of days) and the page passes fresh arrays each render — no memo.
  const days = dailySpending(items, from, to)
  const max = days.reduce((m, d) => Math.max(m, d.amount), 0)
  if (max <= 0) return null

  // Day numbers fit a month; longer ranges need the month to stay unambiguous.
  const longRange = days.length > 31
  const data = days.map((d) => {
    const isPeak = d.amount === max
    return {
      date: d.date,
      amount: d.amount,
      isPeak,
      label: longRange ? dayjs(d.date).format('DD/MM') : String(dayjs(d.date).date()),
      [DAY_KEY]: isPeak ? 0 : d.amount,
      [PEAK_KEY]: isPeak ? d.amount : 0,
    }
  })

  const renderTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null
    const datum = payload[0].payload as (typeof data)[number]
    return (
      <div className="grid gap-0.5 rounded-xl border bg-background px-3 py-2 text-xs shadow-lg">
        <div className="font-semibold">{dayjs(datum.date).format('DD/MM')}</div>
        <div className="flex items-center gap-1.5">
          <span className={datum.isPeak ? 'h-2 w-2 rounded-full bg-rose-500' : 'h-2 w-2 rounded-full bg-rose-300'} />
          {t('summary.colDebit')}: <strong className="tabular-nums">{formatMoney({ amount: datum.amount, currency })}</strong>
        </div>
      </div>
    )
  }

  return (
    <div data-testid="daily-spend-chart" data-days={days.length} data-peak={max}>
      <BarChart
        className="h-28 [&_.fill-pink-500]:fill-rose-300 dark:[&_.fill-pink-500]:fill-rose-900"
        data={data}
        index="label"
        categories={[DAY_KEY, PEAK_KEY]}
        colors={['pink', 'rose']}
        type="stacked"
        valueFormatter={(value) => formatMoney({ amount: value, currency })}
        showLegend={false}
        showYAxis={false}
        showGridLines={false}
        barCategoryGap="12%"
        tickGap={8}
        customTooltip={renderTooltip}
      />
    </div>
  )
}
