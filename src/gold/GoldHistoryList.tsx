import dayjs from 'dayjs'
import { Coins, MapPin, Pencil, Trash2 } from 'lucide-react'
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
  onEdit: (acq: GoldAcquisitionResponse) => void
  onDelete: (acq: GoldAcquisitionResponse) => void
}

const BADGE_STYLE = {
  buy: 'bg-primary/10 text-primary',
  sell: 'bg-income/10 text-income',
  acq: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
} as const

/** Gold buys, sells and pre-owned gold as a dated list, newest first. */
export function GoldHistoryList({ rows, onEdit, onDelete }: Props) {
  const { t } = useI18n()
  if (rows.length === 0) {
    return (
      <div className="grid justify-items-center gap-2 py-10 text-sm text-muted-foreground">
        <Coins className="size-8 text-muted-foreground/40" />
        {t('gold.empty')}
      </div>
    )
  }
  return (
    <ul className="divide-y">
      {rows.map((row) => {
        const isTx = row.kind === 'tx'
        const buy = isTx && row.tx.debit.amount > 0
        const badge = isTx ? (buy ? 'buy' : 'sell') : 'acq'
        const title = isTx ? row.tx.content : row.acq.note || '—'
        const typeName = isTx ? row.tx.goldTypeName : row.acq.goldTypeName
        const place = isTx ? row.tx.purchasePlaceName : row.acq.purchasePlaceName
        const quantity = isTx ? row.tx.goldQuantity : row.acq.quantity
        const price: MoneyResponse = isTx ? row.tx.pricePerChi : row.acq.unitPrice
        const date = dayjs(row.date)
        return (
          <li key={row.key} data-testid="gold-history-row" className="group flex items-center gap-3 px-4 py-3 sm:gap-4">
            <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-muted/60 py-1.5 leading-none">
              <span className="text-lg font-bold tabular-nums">{date.format('DD')}</span>
              <span className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{date.format('MM/YYYY')}</span>
            </div>

            <div className="grid min-w-0 flex-1 gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-md px-1.5 py-0.5 text-[11px] font-semibold', BADGE_STYLE[badge])}>
                  {badge === 'buy' ? t('gold.buy') : badge === 'sell' ? t('gold.sell') : t('goldAcq.badge')}
                </span>
                <span className="truncate font-medium">{title}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span data-testid="gold-history-type" className="inline-flex items-center gap-1">
                  <Coins className="size-3 text-amber-500" aria-hidden />
                  {typeName}
                </span>
                {place && (
                  <span data-testid="gold-history-place" className="inline-flex items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    {place}
                  </span>
                )}
              </div>
            </div>

            <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
              <span className="text-sm font-bold tabular-nums">
                {formatGoldQuantity(quantity)} <span className="font-medium text-muted-foreground">{t('gold.unit')}</span>
              </span>
              <span
                data-testid="gold-history-amount"
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  !isTx ? 'text-muted-foreground' : buy ? 'text-expense' : 'text-income',
                )}
              >
                {isTx ? (buy ? `−${formatMoney(row.tx.debit)}` : `+${formatMoney(row.tx.credit)}`) : formatMoney(row.acq.value)}
              </span>
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {formatMoney(price)}/{t('gold.unit')}
              </span>
            </div>

            {!isTx && (
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
      })}
    </ul>
  )
}
