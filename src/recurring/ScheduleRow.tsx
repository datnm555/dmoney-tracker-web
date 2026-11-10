import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { RecurringScheduleItemResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import type { CardDue } from '../utils/recurring'
import { scheduleStatus } from '../utils/recurring'

function StatusChip({ text, danger, good }: { text: string; danger?: boolean; good?: boolean }) {
  return (
    <span
      className={cn(
        'rounded-full border px-2 py-0.5 text-xs',
        danger && 'border-expense/40 bg-expense/5 text-expense',
        good && 'border-income/40 bg-income/5 text-income',
      )}
    >
      {text}
    </span>
  )
}

function dueText(t: (k: string) => string, daysLeft: number) {
  if (daysLeft < 0) return `${t('accounts.overdue')} ${-daysLeft} ${t('accounts.days')}`
  if (daysLeft === 0) return t('accounts.dueToday')
  return `${t('accounts.left')} ${daysLeft} ${t('accounts.days')}`
}

export function ScheduleItemRow({
  row,
  today,
  canRecord,
  undoing,
  onRecord,
  onMarkPaid,
  onUndo,
  onHistory,
}: {
  row: RecurringScheduleItemResponse
  today: string
  canRecord: boolean
  undoing?: boolean
  onRecord: () => void
  onMarkPaid: () => void
  onUndo: () => void
  onHistory: () => void
}) {
  const { t } = useI18n()
  const { item, record, dueDate } = row
  const { status, daysLeft } = scheduleStatus(row, today)
  const unpaid = !record
  const amountText = record
    ? formatMoney(record.amount)
    : item.isVariable && item.amount.amount === 0
      ? t('recurring.enterAmount')
      : `${item.isVariable ? '≈ ' : ''}${formatMoney(item.amount)}`

  return (
    <Card data-testid={`row-${item.id}`}>
      <CardContent className="grid gap-2 p-3">
        <div className="flex items-center gap-2">
          <CategoryIcon category={item.categoryId} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{item.name}</div>
            <div className="text-xs text-muted-foreground">{dayjs(dueDate).format('DD/MM')}</div>
          </div>
          <span className="text-sm font-bold tabular-nums">{amountText}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status === 'paid' && record && (
            <StatusChip good text={`${t('recurring.paid')} · ${t('recurring.paidOn')} ${dayjs(record.paidDate).format('DD/MM')}`} />
          )}
          {status === 'overdue' && <StatusChip danger text={dueText(t, daysLeft)} />}
          {status === 'dueSoon' && <StatusChip danger text={dueText(t, daysLeft)} />}
          {status === 'upcoming' && <StatusChip text={dueText(t, daysLeft)} />}
          <div className="ml-auto flex flex-wrap gap-1.5">
            {unpaid && (
              <>
                <Button size="sm" disabled={!canRecord} onClick={onRecord}>
                  {t('recurring.record')}
                </Button>
                <Button size="sm" variant="outline" onClick={onMarkPaid}>
                  {t('recurring.markPaid')}
                </Button>
              </>
            )}
            {!unpaid && (
              <Button size="sm" variant="outline" disabled={undoing} onClick={onUndo}>
                {t('recurring.undo')}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onHistory}>
              {t('recurring.history')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ScheduleCardRow({ due, today, onPaid }: { due: CardDue; today: string; onPaid: () => void }) {
  const { t } = useI18n()
  const daysLeft = dayjs(due.dueDate).diff(dayjs(today), 'day')
  return (
    <Card data-testid={`card-row-${due.account.id}`}>
      <CardContent className="grid gap-2 p-3">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">
              {due.account.name}
              {due.account.lastDigits && <span className="ml-1 text-xs font-normal">•••{due.account.lastDigits}</span>}
            </div>
            <div className="text-xs text-muted-foreground">
              {t('recurring.cardRow')} · {dayjs(due.dueDate).format('DD/MM')}
            </div>
          </div>
          <span className="text-sm font-bold tabular-nums">{formatMoney({ amount: due.amount, currency: 'VND' })}</span>
        </div>
        <div className="flex items-center gap-2">
          {due.paid ? (
            <StatusChip good text={t('recurring.paid')} />
          ) : (
            <StatusChip danger={daysLeft <= 3} text={dueText(t, daysLeft)} />
          )}
          {!due.paid && (
            <Button size="sm" variant="outline" className="ml-auto" onClick={onPaid}>
              {t('accounts.markPaid')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
