import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarCheck2, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { getAccounts, payStatement } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import { createRecord, deleteRecord, getSchedule } from '../api/recurringPaymentApi'
import { createTransaction, deleteTransaction } from '../api/transactionApi'
import type { AccountResponse, RecurringPaymentResponse, RecurringScheduleItemResponse } from '../api/types'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { usePlans } from '../plans/PlanContext'
import { PayStatementDialog } from '../accounts/PayStatementDialog'
import { MarkPaidDialog } from '../recurring/MarkPaidDialog'
import { RecordHistoryDialog } from '../recurring/RecordHistoryDialog'
import { RecurringHero } from '../recurring/RecurringHero'
import { RecurringManageDialog } from '../recurring/RecurringManageDialog'
import { ScheduleCardRow, ScheduleItemRow } from '../recurring/ScheduleRow'
import { formatMoney } from '../utils/money'
import { cardDuesInMonth, scheduleStatus, scheduleTotals } from '../utils/recurring'
import type { CardDue } from '../utils/recurring'
import { toTransactionPayload } from '../utils/transactionPayload'

export function RecurringPage() {
  const { t } = useI18n()
  const { selectedPlanId } = usePlans()
  const [month, setMonth] = useState(() => dayjs().format('YYYY-MM'))
  const [rows, setRows] = useState<RecurringScheduleItemResponse[]>([])
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [loaded, setLoaded] = useState(false)
  const [manageOpen, setManageOpen] = useState(false)
  const [recording, setRecording] = useState<RecurringPaymentResponse | null>(null)
  const [recordingCard, setRecordingCard] = useState<CardDue | null>(null)
  const [payingCard, setPayingCard] = useState<AccountResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [undoingId, setUndoingId] = useState<string | null>(null)
  const [markPaidItem, setMarkPaidItem] = useState<RecurringPaymentResponse | null>(null)
  const [historyItem, setHistoryItem] = useState<RecurringPaymentResponse | null>(null)
  const today = dayjs().format('YYYY-MM-DD')

  const loadSeq = useRef(0)
  const load = useCallback(async () => {
    const seq = ++loadSeq.current
    try {
      const [schedule, accs] = await Promise.all([getSchedule(month), getAccounts().catch(() => [] as AccountResponse[])])
      if (seq !== loadSeq.current) return
      setRows(schedule)
      setAccounts(accs)
    } catch (error) {
      if (seq !== loadSeq.current) return
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      if (seq === loadSeq.current) setLoaded(true)
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

  // Recurring items only: card statements stay in the list and the paid count, not in the tracker.
  const trackerEntries = rows
    .slice()
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((row) => {
      const { item, record } = row
      const amount = record
        ? formatMoney(record.amount)
        : item.isVariable && item.amount.amount === 0
          ? t('recurring.enterAmount')
          : formatMoney(item.amount)
      return { key: item.id, status: scheduleStatus(row, today).status, tooltip: `${item.name} · ${amount}` }
    })

  const paidCount = list.filter((e) => (e.row ? !!e.row.record : e.card!.paid)).length

  const guarded = async (action: () => Promise<void>) => {
    try {
      await action()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
    await load()
  }

  const submitRecord = async (values: TransactionFormValues) => {
    // Record buttons are disabled without a plan.
    const item = recording
    const card = recordingCard
    if ((!item && !card) || !selectedPlanId) return
    setSubmitting(true)
    let transactionId: string
    try {
      transactionId = (await createTransaction(toTransactionPayload(values, selectedPlanId))).id
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
      setSubmitting(false)
      return
    }
    // The transaction exists now: close the form either way so a retry cannot duplicate it.
    setRecording(null)
    setRecordingCard(null)
    try {
      if (item) {
        await createRecord(item.id, { period: month, amount: values.amount, paidDate: values.date, transactionId })
      } else if (card) {
        // The transaction moves the paying account. Paid into the card ("Trả cho"), it lowers the
        // card's debt too, so the statement is only settled; otherwise the payment lowers the debt.
        await payStatement(card.account.id, {
          date: values.date,
          amount: values.amount,
          fromAccountId: null,
          paidByTransaction: values.transferToAccountId === card.account.id,
        })
      }
    } catch (error) {
      // Compensate: remove the orphan transaction, then surface the record error (e.g. already paid).
      try {
        await deleteTransaction(transactionId)
      } catch {
        // Nothing more to do; the reload below shows the real state.
      }
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
    await load()
  }

  const undoRecord = async (recordId: string) => {
    if (undoingId) return
    setUndoingId(recordId)
    try {
      await guarded(() => deleteRecord(recordId))
    } finally {
      setUndoingId(null)
    }
  }

  const prefill: Partial<TransactionFormValues> | undefined = recording
    ? {
        content: recording.name,
        type: 'out',
        amount: recording.amount.amount > 0 ? recording.amount.amount : undefined,
        categoryId: recording.categoryId,
        subCategoryId: recording.subCategoryId,
        ...(recording.paymentMethod ? { paymentMethod: recording.paymentMethod as TransactionFormValues['paymentMethod'] } : {}),
        ...(recording.bank ? { bank: recording.bank } : {}),
        ...(recording.savingsBank ? { savingsBank: recording.savingsBank } : {}),
        date: today,
      }
    : recordingCard
      ? {
          content: `${t('recurring.cardRow')} ${recordingCard.account.name}`,
          type: 'out',
          amount: recordingCard.amount,
          date: today,
          transferToAccountId: recordingCard.account.id,
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

      <RecurringHero
        month={month}
        onMonthChange={setMonth}
        total={totals.total}
        paid={totals.paid}
        remaining={totals.remaining}
        paidCount={paidCount}
        count={list.length}
        entries={trackerEntries}
      />

      {loaded && list.length === 0 && (
        <div className="grid justify-items-center gap-2 rounded-2xl border bg-card py-10 text-sm text-muted-foreground">
          <CalendarCheck2 className="size-8 text-muted-foreground/40" aria-hidden />
          {t('recurring.empty')}
        </div>
      )}

      {list.length > 0 && (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-sm">
          {list.map((entry) =>
            entry.row ? (
              <ScheduleItemRow
                key={entry.key}
                row={entry.row}
                today={today}
                canRecord={selectedPlanId !== null}
                onRecord={() => setRecording(entry.row.item)}
                onMarkPaid={() => setMarkPaidItem(entry.row.item)}
                undoing={undoingId !== null}
                onUndo={() => void undoRecord(entry.row.record!.id)}
                onHistory={() => setHistoryItem(entry.row.item)}
              />
            ) : (
              <ScheduleCardRow
                key={entry.key}
                due={entry.card!}
                today={today}
                canRecord={selectedPlanId !== null}
                onRecord={() => setRecordingCard(entry.card)}
                onPaid={() => setPayingCard(entry.card!.account)}
              />
            ),
          )}
        </ul>
      )}

      <TransactionFormModal
        open={recording !== null || recordingCard !== null}
        editing={null}
        submitting={submitting}
        prefill={prefill}
        onSubmit={(values) => void submitRecord(values)}
        onCancel={() => {
          setRecording(null)
          setRecordingCard(null)
        }}
      />
      <PayStatementDialog
        card={payingCard}
        accounts={accounts}
        today={today}
        onClose={() => setPayingCard(null)}
        onSaved={() => void load()}
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
