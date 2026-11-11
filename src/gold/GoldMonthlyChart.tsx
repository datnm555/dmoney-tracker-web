import { useMemo } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GoldTransactionResponse } from '../api/types'
import { BarChart, type TooltipProps } from '../components/tremor/BarChart'
import { useI18n } from '../i18n/I18nContext'
import { goldMonthly } from '../utils/chartData'
import type { GoldMonthDatum } from '../utils/chartData'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Chỉ bought / sold per month over the last 12 months (Tremor BarChart, like the savings chart). */
export function GoldMonthlyChart({ transactions }: { transactions: GoldTransactionResponse[] }) {
  const { t } = useI18n()
  const monthly = useMemo(() => goldMonthly(transactions, dayjs()), [transactions])
  const unit = t('gold.unit')

  const boughtKey = `${t('gold.bought')} (${unit})`
  const soldKey = `${t('gold.sold')} (${unit})`

  // Tremor's default tooltip only knows the plotted chỉ; ours adds the money moved.
  const renderTooltip = ({ active, payload }: TooltipProps) => {
    if (!active || !payload?.length) return null
    const datum = payload[0].payload as GoldMonthDatum & { full: string }
    return (
      <div className="grid gap-1 rounded-xl border bg-background px-3 py-2 text-xs shadow-lg">
        <div className="font-semibold">{datum.full}</div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-income" />
          {t('gold.bought')}: <strong>{formatGoldQuantity(datum.bought)} {unit}</strong>
          {datum.spent > 0 && <span className="text-muted-foreground">· {vnd(datum.spent)}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-expense" />
          {t('gold.sold')}: <strong>{formatGoldQuantity(datum.sold)} {unit}</strong>
          {datum.received > 0 && <span className="text-muted-foreground">· {vnd(datum.received)}</span>}
        </div>
      </div>
    )
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('gold.monthlyChart')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <BarChart
          className="h-64"
          data={monthly.map((m) => ({
            ...m,
            full: m.month,
            // Ticks show "T10"; the tooltip keeps the full MM/YYYY label.
            month: `T${Number(m.month.slice(0, 2))}`,
            [boughtKey]: m.bought,
            [soldKey]: m.sold,
          }))}
          index="month"
          categories={[boughtKey, soldKey]}
          colors={['emerald', 'rose']}
          valueFormatter={(value) => formatGoldQuantity(value)}
          yAxisWidth={40}
          allowDecimals
          showLegend={false}
          customTooltip={renderTooltip}
        />
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t('gold.bought')} ({unit})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            {t('gold.sold')} ({unit})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
