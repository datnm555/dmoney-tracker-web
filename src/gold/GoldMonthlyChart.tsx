import { useMemo } from 'react'
import dayjs from 'dayjs'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { GoldTransactionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { goldMonthly } from '../utils/chartData'
import type { GoldMonthDatum } from '../utils/chartData'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Chỉ bought / sold per month over the last 12 months (styling mirrors the savings chart). */
export function GoldMonthlyChart({ transactions }: { transactions: GoldTransactionResponse[] }) {
  const { t } = useI18n()
  const monthly = useMemo(() => goldMonthly(transactions, dayjs()), [transactions])
  const unit = t('gold.unit')

  // Only the fields we read — structurally compatible with Recharts' tooltip content props.
  const renderTooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) => {
    if (!active || !payload?.length) return null
    const datum = payload[0].payload as GoldMonthDatum
    return (
      <div className="grid gap-1 rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
        <div className="font-semibold">{datum.month}</div>
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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t('gold.monthlyChart')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              {/* Ticks show "T10"; the tooltip keeps the full MM/YYYY label. */}
              <XAxis
                dataKey="month"
                tickFormatter={(month: string) => `T${Number(month.slice(0, 2))}`}
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis
                tickFormatter={(value: number) => formatGoldQuantity(value)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={40}
                allowDecimals
              />
              <Tooltip content={renderTooltip} cursor={{ fill: '#f4f4f5' }} />
              <Bar dataKey="bought" name={t('gold.bought')} fill="#16a34a" radius={[7, 7, 7, 7]} barSize={10} />
              <Bar dataKey="sold" name={t('gold.sold')} fill="#dc2626" radius={[7, 7, 7, 7]} barSize={10} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-income" />
            {t('gold.bought')} ({unit})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-expense" />
            {t('gold.sold')} ({unit})
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
