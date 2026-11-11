import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, ReceiptText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TransactionResponse } from '../api/types'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import type { DayGroup } from '../utils/transactionGroups'
import { TransactionRow } from './TransactionRow'

interface Props {
  groups: DayGroup[]
  /** "Hôm nay" for today, else the weekday name. */
  dayTitle: (date: string) => string
  onEdit: (tx: TransactionResponse) => void
  onDelete: (tx: TransactionResponse) => void
}

/** Transactions grouped into day cards, newest day first; an empty state when nothing matches. */
export function TransactionDayList({ groups, dayTitle, onEdit, onDelete }: Props) {
  const { t } = useI18n()

  if (groups.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="grid justify-items-center gap-3 py-12 text-center text-muted-foreground">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/10 text-primary ring-1 ring-primary/15">
            <ReceiptText className="size-6" aria-hidden />
          </span>
          {t('summary.empty')}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {groups.map((group) => (
        <TransactionDayGroup
          key={group.date}
          group={group}
          title={dayTitle(group.date)}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

function TransactionDayGroup({
  group,
  title,
  onEdit,
  onDelete,
}: {
  group: DayGroup
  title: string
  onEdit: (tx: TransactionResponse) => void
  onDelete: (tx: TransactionResponse) => void
}) {
  const { t } = useI18n()
  const date = dayjs(group.date)
  const isToday = group.date === dayjs().format('YYYY-MM-DD')
  const inCount = group.items.filter((tx) => tx.credit.amount > 0).length
  const outCount = group.items.length - inCount
  const flow = group.credit + group.debit

  return (
    <section data-testid="day-group" className="grid gap-2">
      <div className="flex items-center gap-3 px-1">
        <div
          className={cn(
            'flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-none shadow-sm',
            isToday
              ? 'bg-gradient-to-br from-[#6C4CF1] via-violet-600 to-indigo-700 text-white shadow-violet-900/20'
              : 'bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-primary ring-1 ring-primary/15',
          )}
        >
          <span className="text-lg font-extrabold tabular-nums">{date.format('DD')}</span>
          <span className={cn('mt-0.5 text-[10px] font-medium tabular-nums', isToday ? 'text-violet-100' : 'opacity-70')}>
            {date.format('MM/YY')}
          </span>
        </div>

        <div className="grid min-w-0 flex-1 gap-1">
          <span className="truncate text-sm font-semibold">
            {title} · {date.format('DD/MM')}
          </span>
          <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
            {inCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-income">
                <ArrowUpRight className="size-3" aria-hidden />
                <span className="tabular-nums">{inCount}</span>
              </span>
            )}
            {outCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-expense">
                <ArrowDownRight className="size-3" aria-hidden />
                <span className="tabular-nums">{outCount}</span>
              </span>
            )}
            {flow > 0 && (
              <CategoryBar
                className="hidden w-24 sm:block"
                values={[group.credit, group.debit]}
                colors={['emerald', 'rose']}
                showLabels={false}
              />
            )}
          </div>
        </div>

        {group.net >= 0 ? (
          <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-income ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400">
            {t('transactions.net')} +{formatMoney({ amount: group.net, currency: 'VND' })}
          </span>
        ) : (
          <span className="shrink-0 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold tabular-nums text-expense ring-1 ring-inset ring-rose-500/20 dark:text-rose-400">
            −{formatMoney({ amount: Math.abs(group.net), currency: 'VND' })}
          </span>
        )}
      </div>

      <Card className="overflow-hidden rounded-2xl py-0 transition-shadow duration-300 hover:shadow-md">
        <CardContent className="divide-y p-0">
          {group.items.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </CardContent>
      </Card>
    </section>
  )
}
