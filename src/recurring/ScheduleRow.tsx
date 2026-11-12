import dayjs from 'dayjs'
import type { ReactNode } from 'react'
import { AlarmClock, CalendarClock, CircleAlert, CircleCheck, CreditCard, History, Undo2, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { RecurringScheduleItemResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import type { CardDue, ScheduleStatus } from '../utils/recurring'
import { dueStatus, scheduleStatus } from '../utils/recurring'

const TONE: Record<ScheduleStatus, { tile: string; chip: string; icon: LucideIcon }> = {
  paid: {
    tile: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    chip: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
    icon: CircleCheck,
  },
  overdue: {
    tile: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
    chip: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
    icon: CircleAlert,
  },
  dueSoon: {
    tile: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    chip: 'bg-amber-500/10 text-amber-700 ring-amber-500/25 dark:text-amber-300',
    icon: AlarmClock,
  },
  upcoming: {
    tile: 'bg-muted/60 text-foreground',
    chip: 'bg-muted/60 text-muted-foreground ring-border',
    icon: CalendarClock,
  },
}

function StatusChip({ status, text }: { status: ScheduleStatus; text: string }) {
  const { chip, icon: Icon } = TONE[status]
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', chip)}>
      <Icon className="size-3 shrink-0" aria-hidden />
      {text}
    </span>
  )
}

/** Day number + month/year, tinted by status — the timeline anchor of a row. */
function DateTile({ date, status }: { date: string; status: ScheduleStatus }) {
  const d = dayjs(date)
  return (
    <time
      dateTime={date}
      className={cn('flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-none', TONE[status].tile)}
    >
      <span className="text-lg font-bold tabular-nums">{d.format('DD')}</span>
      <span className="mt-0.5 text-[10px] tabular-nums opacity-70">{d.format('MM/YYYY')}</span>
    </time>
  )
}

function dueText(t: (k: string) => string, daysLeft: number) {
  if (daysLeft < 0) return `${t('accounts.overdue')} ${-daysLeft} ${t('accounts.days')}`
  if (daysLeft === 0) return t('accounts.dueToday')
  return `${t('accounts.left')} ${daysLeft} ${t('accounts.days')}`
}

/** Shared row layout: date tile · title + chips · amount · actions (wrap under on narrow screens). */
function RowShell({
  testId,
  date,
  status,
  title,
  meta,
  amount,
  actions,
}: {
  testId: string
  date: string
  status: ScheduleStatus
  title: ReactNode
  meta: ReactNode
  amount: ReactNode
  actions: ReactNode
}) {
  return (
    <li
      data-testid={testId}
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-nowrap sm:gap-4',
        status === 'paid' && 'bg-muted/20',
      )}
    >
      <DateTile date={date} status={status} />
      <div className="grid min-w-0 flex-1 gap-1">
        <div className="flex min-w-0 items-center gap-2">{title}</div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">{meta}</div>
      </div>
      <div className="shrink-0 text-right">{amount}</div>
      {actions && <div className="flex basis-full flex-wrap justify-end gap-1 sm:basis-auto sm:flex-nowrap">{actions}</div>}
    </li>
  )
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
  const needsAmount = !record && item.isVariable && item.amount.amount === 0
  const amountText = record
    ? formatMoney(record.amount)
    : needsAmount
      ? t('recurring.enterAmount')
      : `${item.isVariable ? '≈ ' : ''}${formatMoney(item.amount)}`

  return (
    <RowShell
      testId={`row-${item.id}`}
      date={dueDate}
      status={status}
      title={
        <>
          <CategoryIcon category={item.categoryId} className="h-6 w-6 rounded-md [&_svg]:h-3.5 [&_svg]:w-3.5" />
          <span className={cn('truncate text-sm font-semibold', status === 'paid' && 'text-muted-foreground')}>{item.name}</span>
        </>
      }
      meta={
        status === 'paid' && record ? (
          <StatusChip status="paid" text={`${t('recurring.paid')} · ${t('recurring.paidOn')} ${dayjs(record.paidDate).format('DD/MM')}`} />
        ) : (
          <StatusChip status={status} text={dueText(t, daysLeft)} />
        )
      }
      amount={
        <span
          className={cn(
            'text-sm font-bold tabular-nums sm:text-base',
            needsAmount && 'rounded-md border border-dashed px-2 py-0.5 text-xs font-medium text-muted-foreground sm:text-xs',
            status === 'paid' && 'text-emerald-700 dark:text-emerald-300',
          )}
        >
          {amountText}
        </span>
      }
      actions={
        <>
          {unpaid && (
            <>
              <Button size="sm" className="rounded-full" disabled={!canRecord} onClick={onRecord}>
                {t('recurring.record')}
              </Button>
              <Button size="sm" variant="ghost" className="rounded-full" onClick={onMarkPaid}>
                <CircleCheck className="mr-1 size-3.5" aria-hidden />
                {t('recurring.markPaid')}
              </Button>
            </>
          )}
          {!unpaid && (
            <Button size="sm" variant="ghost" className="rounded-full" disabled={undoing} onClick={onUndo}>
              <Undo2 className="mr-1 size-3.5" aria-hidden />
              {t('recurring.undo')}
            </Button>
          )}
          <Button size="sm" variant="ghost" className="rounded-full text-muted-foreground" onClick={onHistory}>
            <History className="mr-1 size-3.5" aria-hidden />
            {t('recurring.history')}
          </Button>
        </>
      }
    />
  )
}

export function ScheduleCardRow({
  due,
  today,
  canRecord,
  onRecord,
}: {
  due: CardDue
  today: string
  canRecord: boolean
  onRecord: () => void
}) {
  const { t } = useI18n()
  const { status, daysLeft } = dueStatus(due.paid, due.dueDate, today)
  return (
    <RowShell
      testId={`card-row-${due.account.id}`}
      date={due.dueDate}
      status={status}
      title={
        <>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-violet-500/10 text-violet-600 dark:text-violet-300">
            <CreditCard className="size-3.5" aria-hidden />
          </span>
          <span className={cn('truncate text-sm font-semibold', due.paid && 'text-muted-foreground')}>{due.account.name}</span>
          {due.account.lastDigits && (
            <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">•••{due.account.lastDigits}</span>
          )}
        </>
      }
      meta={
        <>
          <StatusChip status={status} text={due.paid ? t('recurring.paid') : dueText(t, daysLeft)} />
          <span>{t('recurring.cardRow')}</span>
          {!due.paid && due.remaining < due.amount && (
            <span className="tabular-nums">
              {t('accounts.statementRemaining')} {formatMoney({ amount: due.remaining, currency: 'VND' })}
            </span>
          )}
        </>
      }
      amount={
        <span className={cn('text-sm font-bold tabular-nums sm:text-base', due.paid && 'text-emerald-700 dark:text-emerald-300')}>
          {formatMoney({ amount: due.amount, currency: 'VND' })}
        </span>
      }
      actions={
        // Paying is always a transaction into the card; only an untracked statement counts as spending.
        !due.paid && (
          <Button size="sm" className="rounded-full" disabled={!canRecord} onClick={onRecord}>
            {t('recurring.record')}
          </Button>
        )
      }
    />
  )
}
