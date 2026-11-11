import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, Coins, MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { GoldAcquisitionResponse, GoldTransactionResponse, MoneyResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

export type GoldHistoryRow =
  | { kind: 'tx'; date: string; key: string; tx: GoldTransactionResponse }
  | { kind: 'acq'; date: string; key: string; acq: GoldAcquisitionResponse }

interface Props {
  rows: GoldHistoryRow[]
  /** Weighted average cost per chỉ; buy prices are compared against it (↑ dearer / ↓ cheaper). */
  avgCostPerChi?: number
  onEdit: (acq: GoldAcquisitionResponse) => void
  onDelete: (acq: GoldAcquisitionResponse) => void
}

const BADGE_STYLE = {
  buy: 'bg-primary/10 text-primary ring-primary/20',
  sell: 'bg-income/10 text-income ring-income/20',
  acq: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
} as const

/** Date tile: gold gradient for gold coming in (buy / pre-owned), emerald for a sale. */
const TILE_STYLE = {
  buy: 'bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950',
  acq: 'bg-gradient-to-br from-amber-200 to-yellow-400 text-amber-950',
  sell: 'bg-gradient-to-br from-emerald-300 to-emerald-500 text-emerald-950',
} as const

interface RowView {
  row: GoldHistoryRow
  badge: keyof typeof BADGE_STYLE
  title: string
  typeName: string
  place: string | null
  quantity: number
  price: MoneyResponse
}

function view(row: GoldHistoryRow): RowView {
  if (row.kind === 'tx') {
    return {
      row,
      badge: row.tx.debit.amount > 0 ? 'buy' : 'sell',
      title: row.tx.content,
      typeName: row.tx.goldTypeName,
      place: row.tx.purchasePlaceName,
      quantity: row.tx.goldQuantity,
      price: row.tx.pricePerChi,
    }
  }
  return {
    row,
    badge: 'acq',
    title: row.acq.note || '—',
    typeName: row.acq.goldTypeName,
    place: row.acq.purchasePlaceName,
    quantity: row.acq.quantity,
    price: row.acq.unitPrice,
  }
}

/** Gold buys, sells and pre-owned gold, newest first, grouped by month. */
export function GoldHistoryList({ rows, avgCostPerChi, onEdit, onDelete }: Props) {
  const { t } = useI18n()
  if (rows.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 py-10 text-sm text-muted-foreground">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-yellow-300 to-amber-500 text-amber-950 shadow-sm">
          <Coins className="size-6" />
        </span>
        {t('gold.empty')}
      </div>
    )
  }

  const months: { key: string; items: RowView[] }[] = []
  for (const row of rows) {
    const key = row.date.slice(0, 7)
    const last = months.at(-1)
    if (last && last.key === key) last.items.push(view(row))
    else months.push({ key, items: [view(row)] })
  }

  return (
    <div className="grid gap-4 p-3 sm:p-4">
      {months.map((month) => {
        const qty = month.items.reduce((sum, v) => sum + (v.badge === 'sell' ? -v.quantity : v.quantity), 0)
        return (
          <section key={month.key} data-testid="gold-history-month" className="grid gap-2">
            <div className="flex items-center gap-2 px-1 text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">
                {dayjs(`${month.key}-01`).format('MM/YYYY')}
              </span>
              <span className="h-px flex-1 bg-border" aria-hidden />
              <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                {qty >= 0 ? '+' : '−'}
                {formatGoldQuantity(Math.abs(qty))} {t('gold.unit')}
              </span>
            </div>
            <ul className="grid gap-2">
              {month.items.map((v) => (
                <HistoryRow key={v.row.key} v={v} avgCostPerChi={avgCostPerChi} onEdit={onEdit} onDelete={onDelete} />
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

function HistoryRow({
  v,
  avgCostPerChi,
  onEdit,
  onDelete,
}: {
  v: RowView
  avgCostPerChi?: number
  onEdit: (acq: GoldAcquisitionResponse) => void
  onDelete: (acq: GoldAcquisitionResponse) => void
}) {
  const { t } = useI18n()
  const { row, badge } = v
  const isTx = row.kind === 'tx'
  const buy = badge === 'buy'
  const date = dayjs(row.date)
  // Only for gold coming in: was this lot dearer or cheaper than the average cost?
  const vsAvg =
    badge !== 'sell' && avgCostPerChi && avgCostPerChi > 0 && v.price.amount !== avgCostPerChi
      ? v.price.amount > avgCostPerChi
        ? 'up'
        : 'down'
      : null
  return (
    <li
      data-testid="gold-history-row"
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md sm:gap-4"
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          badge === 'sell' ? 'bg-emerald-500' : 'bg-gradient-to-b from-yellow-300 to-amber-500',
        )}
      />
      <div className={cn('flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-none shadow-sm', TILE_STYLE[badge])}>
        <span className="text-lg font-extrabold tabular-nums">{date.format('DD')}</span>
        <span className="mt-0.5 text-[10px] font-medium tabular-nums opacity-80">{date.format('MM/YYYY')}</span>
      </div>

      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', BADGE_STYLE[badge])}>
            {badge === 'buy' ? t('gold.buy') : badge === 'sell' ? t('gold.sell') : t('goldAcq.badge')}
          </span>
          <span className="truncate font-semibold">{v.title}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-800 dark:text-amber-300">
            <Coins className="size-3" aria-hidden />
            <span data-testid="gold-history-type">{v.typeName}</span>
          </span>
          {v.place && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-sky-700 dark:text-sky-300">
              <MapPin className="size-3" aria-hidden />
              <span data-testid="gold-history-place">{v.place}</span>
            </span>
          )}
        </div>
      </div>

      <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
        <span className="text-base font-extrabold tabular-nums text-amber-600 dark:text-amber-400">
          {formatGoldQuantity(v.quantity)} <span className="text-xs font-semibold text-muted-foreground">{t('gold.unit')}</span>
        </span>
        <span
          data-testid="gold-history-amount"
          className={cn(
            'text-sm font-semibold tabular-nums',
            !isTx ? 'text-muted-foreground' : buy ? 'text-expense' : 'text-income',
          )}
        >
          {row.kind === 'tx'
            ? buy
              ? `−${formatMoney(row.tx.debit)}`
              : `+${formatMoney(row.tx.credit)}`
            : formatMoney(row.acq.value)}
        </span>
        <span className="inline-flex items-center gap-0.5 text-[11px] tabular-nums text-muted-foreground">
          {vsAvg === 'up' && <ArrowUpRight data-testid="gold-vs-avg-up" className="size-3 text-rose-500" aria-hidden />}
          {vsAvg === 'down' && (
            <ArrowDownRight data-testid="gold-vs-avg-down" className="size-3 text-emerald-500" aria-hidden />
          )}
          {formatMoney(v.price)}/{t('gold.unit')}
        </span>
      </div>

      {row.kind === 'acq' && (
        <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={t('goldAcq.edit')}
            onClick={() => onEdit(row.acq)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
            aria-label={t('goldAcq.deleteConfirm')}
            onClick={() => onDelete(row.acq)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </li>
  )
}
