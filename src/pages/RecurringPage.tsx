import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getAccounts, updateSnapshot } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import { createRecord, deleteRecord, getSchedule } from '../api/recurringPaymentApi'
import { createTransaction } from '../api/transactionApi'
import type { AccountResponse, RecurringPaymentResponse, RecurringScheduleItemResponse } from '../api/types'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { usePlans } from '../plans/PlanContext'
import { MarkPaidDialog } from '../recurring/MarkPaidDialog'
import { RecordHistoryDialog } from '../recurring/RecordHistoryDialog'
import { RecurringManageDialog } from '../recurring/RecurringManageDialog'
import { ScheduleCardRow, ScheduleItemRow } from '../recurring/ScheduleRow'
import { formatMoney } from '../utils/money'
import { cardDuesInMonth, scheduleTotals } from '../utils/recurring'
import { toTransactionPayload } from '../utils/transactionPayload'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

function Tile({ testId, label, value, valueClass }: { testId: string; label: string; value: string; valueClass?: string }) {
  return (
    <Card data-testid={testId}>
      <CardContent className="grid gap-1 p-3 sm:p-4">
        <span className="truncate text-xs text-muted-foreground">{label}</span>
        <div className={cn('truncate text-base font-bold tabular-nums sm:text-lg', valueClass)}>{value}</div>
      </CardContent>
    </Card>
  )
}

export function RecurringPage() {
  const { t } = useI18n()
  const { selectedPlanId } = usePlans()
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState<RecurringScheduleItemResponse[]>([])
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [loaded, setLoaded] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [recording, setRecording] = useState<RecurringPaymentResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [markPaidItem, setMarkPaidItem] = useState<RecurringPaymentResponse | null>(null)
  const [historyItem, setHistoryItem] = useState<RecurringPaymentResponse | null>(null)
  const today = dayjs().format('YYYY-MM-DD')

  const load = useCallback(async () => {
    try {
      const [schedule, accs] = await Promise.all([getSchedule(month), getAccounts().catch(() => [] as AccountResponse[])])
      setRows(schedule)
      setAccounts(accs)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setLoaded(true)
    }
  }, [month, t])

  useEffect(() => {
    void load()
  }, [load])

  const cards = useMemo(() => cardDuesInMonth(accounts, month), [accounts, month])
  const totals = scheduleTotals(rows, cards)
  const list = useMemo(
    () =>
      [
        ...rows.map((r) => ({ key: r.item.id, dueDate: r.dueDate, row: r, card: null })),
        ...cards.map((c) => ({ key: `card-${c.account.id}`, dueDate: c.dueDate, row: null, card: c })),
      ].sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [rows, cards],
  )

  const guarded = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
    await load()
  }

  const submitRecord = async (values: TransactionFormValues) => {
    if (!recording || !selectedPlanId) return
    setSubmitting(true)
    let transactionId: string
    try {
      transactionId = (await createTransaction(toTransactionPayload(values, selectedPlanId))).id
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
      setSubmitting(false)
      return
    }
    try {
      await createRecord(recording.id, { period: month, amount: values.amount, paidDate: values.date, transactionId })
      setRecording(null)
    } catch (error) {
      // The transaction stays; the record conflict (e.g. already paid) is surfaced.
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
    await load()
  }

  const markCardPaid = (account: AccountResponse) =>
    guarded(async () => {
      const s = account.latestSnapshot
      if (!s) return
      await updateSnapshot(s.id, {
        date: s.date,
        balance: s.balance.amount,
        statementAmount: s.statementAmount?.amount ?? null,
        dueDate: s.dueDate,
        installmentRemaining: s.installmentRemaining?.amount ?? null,
        note: s.note,
        statementPaid: true,
      })
    })

  const prefill: Partial<TransactionFormValues> | undefined = recording
    ? {
        content: recording.name,
        type: 'out',
        amount: recording.amount.amount > 0 ? recording.amount.amount : undefined,
        categoryId: recording.categoryId,
        subCategoryId: recording.subCategoryId,
        ...(recording.paymentMethod ? { paymentMethod: recording.paymentMethod as TransactionFormValues['paymentMethod'] } : {}),
        ...(recording.bank ? { bank: recording.bank } : {}),
        date: today,
      }
    : undefined

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('recurring.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('recurring.hint')}</p>
        </div>
        <Button variant="outline" onClick={() => setManageOpen(true)}>
          <Settings2 className="mr-1 h-4 w-4" />
          {t('recurring.manage')}
        </Button>
      </div>

      <Input
        type="month"
        aria-label={t('recurring.title')}
        className="w-44"
        value={month}
        onChange={(e) => e.target.value && setMonth(e.target.value)}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Tile testId="tile-total" label={t('recurring.total')} value={vnd(totals.total)} />
        <Tile testId="tile-paid" label={t('recurring.paid')} value={vnd(totals.paid)} valueClass="text-income" />
        <Tile testId="tile-remaining" label={t('recurring.remaining')} value={vnd(totals.remaining)} valueClass="text-expense" />
      </div>

      {loaded && list.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('recurring.empty')}</CardContent>
        </Card>
      )}

      <div className="grid gap-2">
        {list.map((entry) =>
          entry.row ? (
            <ScheduleItemRow
              key={entry.key}
              row={entry.row}
              today={today}
              onRecord={() => setRecording(entry.row.item)}
              onMarkPaid={() => setMarkPaidItem(entry.row.item)}
              onUndo={() => void guarded(() => deleteRecord(entry.row.record!.id))}
              onHistory={() => setHistoryItem(entry.row.item)}
            />
          ) : (
            <ScheduleCardRow key={entry.key} due={entry.card!} today={today} onPaid={() => void markCardPaid(entry.card!.account)} />
          ),
        )}
      </div>

      <TransactionFormModal
        open={recording !== null}
        editing={null}
        submitting={submitting}
        prefill={prefill}
        onSubmit={(values) => void submitRecord(values)}
        onCancel={() => setRecording(null)}
      />
      <MarkPaidDialog
        item={markPaidItem}
        month={month}
        today={today}
        onClose={() => setMarkPaidItem(null)}
        onSaved={() => void load()}
      />
      <RecordHistoryDialog item={historyItem} onClose={() => setHistoryItem(null)} />
      <RecurringManageDialog open={manageOpen} onClose={() => setManageOpen(false)} onChanged={() => void load()} />
    </div>
  )
}
