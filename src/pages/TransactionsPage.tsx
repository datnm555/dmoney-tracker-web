import { useCallback, useEffect, useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, Download, Plus, Upload, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { getApiErrorMessage } from '../api/client'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  updateTransaction,
} from '../api/transactionApi'
import type { MonthlySummaryResponse, TransactionResponse } from '../api/types'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { DailySpendChart } from '../transactions/DailySpendChart'
import { ImportTransactionsDialog } from '../components/ImportTransactionsDialog'
import { TransactionFilters } from '../components/TransactionFilters'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { SubmitOptions, TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { usePlans } from '../plans/PlanContext'
import { formatMoney } from '../utils/money'
import { countedAmounts, groupTransactionsByDay } from '../utils/transactionGroups'
import { applyTransactionFilters, defaultTransactionFilters, type TransactionFilterState } from '../utils/transactionFilters'
import { defaultDateForRange, rangeDisplayEnd, rangeLabel, rangeToPeriod } from '../utils/dateRange'
import { exportTransactionsToExcel } from '../utils/exportExcel'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { toTransactionPayload } from '../utils/transactionPayload'
import { TransactionDayList } from '../transactions/TransactionDayList'

export function TransactionsPage() {
  const { t, lang } = useI18n()
  const { selectedPlanId } = usePlans()
  const { label: categoryLabel } = useCategoryDisplay()
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  // Filter card state; `filters.range` (inclusive days, default = current month) drives the API call.
  const [filters, setFilters] = useState<TransactionFilterState>(defaultTransactionFilters)
  const { from: rangeFrom, to: rangeTo } = filters.range
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [deleting, setDeleting] = useState<TransactionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!selectedPlanId) return
    try {
      setSummary(await getMonthlySummary(rangeToPeriod({ from: rangeFrom, to: rangeTo }), selectedPlanId))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [rangeFrom, rangeTo, selectedPlanId, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (values: TransactionFormValues, options?: SubmitOptions) => {
    const payload = toTransactionPayload(values, selectedPlanId!)
    setSubmitting(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
      } else {
        await createTransaction(payload)
      }
      if (options?.keepOpen) {
        // Save & Continue: keep the dialog and its values so the user can save a tweaked clone.
        toast.success(t('form.saved'))
      } else {
        toast.success(t(editing ? 'toast.updated' : 'toast.created'))
        setModalOpen(false)
        setEditing(null)
      }
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTransaction(deleting.id)
      toast.success(t('toast.deleted'))
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const items = applyTransactionFilters(summary?.items ?? [], filters)

  const groups = groupTransactionsByDay(items)
  const today = dayjs().format('YYYY-MM-DD')

  // New records default to today inside the range, else its first day.
  const defaultDate = defaultDateForRange(filters.range)

  const rangeStart = dayjs(rangeFrom)
  const rangeEnd = rangeDisplayEnd(filters.range)

  const weekdayName = (date: string) => {
    const name = new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
    })
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
  }

  // 6b mockup: card header reads "Hôm nay · 09/07" / "Thứ Năm · 02/07".
  const dayTitle = (date: string) => (date === today ? t('transactions.today') : weekdayName(date))

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('menu.transactions')}</h1>
          <p className="text-sm text-muted-foreground">
            {rangeStart.format('DD/MM')} → {rangeEnd.format('DD/MM/YYYY')} · {summary?.items.length ?? 0}{' '}
            {t('transactions.count')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border bg-card p-0.5 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg"
            disabled={!summary || summary.items.length === 0}
            onClick={() => summary && exportTransactionsToExcel(summary.items, t, rangeLabel(filters.range), categoryLabel)}
          >
            <Download className="mr-1 h-4 w-4" />
            {t('export.button')}
          </Button>
          <Button type="button" variant="ghost" className="h-8 rounded-lg" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t('import.button')}
          </Button>
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('summary.create')}
          </Button>
        </div>
      </div>

      <TransactionFilters value={filters} onChange={setFilters} />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 p-4 md:p-5">
          {(() => {
            // Totals over the filtered rows, not the raw month — the card must
            // agree with the list it sits above.
            const currency = summary?.totalCredit.currency ?? 'VND'
            // Rows flagged excludedFromStats (internal transfers, savings, gold, advances)
            // still list below but are not real income/spending.
            const credit = items.reduce((sum, tx) => sum + countedAmounts(tx).credit, 0)
            const debit = items.reduce((sum, tx) => sum + countedAmounts(tx).debit, 0)
            const total = credit + debit
            const balance = credit - debit
            return (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <SummaryStat icon={ArrowUpRight} tone="income" label={t('summary.colCredit')}>
                    <strong className="text-income">+{summary ? formatMoney({ amount: credit, currency }) : '—'}</strong>
                  </SummaryStat>
                  <div data-testid="month-balance" className="grid justify-items-center gap-1 text-center">
                    <span className="text-xs text-muted-foreground">{t('summary.balance')} </span>
                    <strong
                      className={cn(
                        'text-base tabular-nums sm:text-xl',
                        balance >= 0 ? 'text-income' : 'text-expense',
                      )}
                    >
                      {summary ? `${balance >= 0 ? '+' : '−'}${formatMoney({ amount: Math.abs(balance), currency })}` : '—'}
                    </strong>
                  </div>
                  <SummaryStat icon={ArrowDownRight} tone="expense" label={t('summary.colDebit')} align="right">
                    <strong className="text-expense">−{summary ? formatMoney({ amount: debit, currency }) : '—'}</strong>
                  </SummaryStat>
                </div>
                <CategoryBar
                  values={total > 0 ? [credit, debit] : [1]}
                  colors={total > 0 ? ['emerald', 'rose'] : ['gray']}
                  showLabels={false}
                />
                <DailySpendChart items={items} from={rangeStart} to={rangeEnd} currency={currency} />
              </>
            )
          })()}
        </CardContent>
      </Card>

      <TransactionDayList
        groups={groups}
        dayTitle={dayTitle}
        onEdit={(tx) => {
          setEditing(tx)
          setModalOpen(true)
        }}
        onDelete={setDeleting}
      />

      <TransactionFormModal
        open={modalOpen}
        editing={editing}
        submitting={submitting}
        defaultDate={defaultDate}
        onSubmit={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />

      <ImportTransactionsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('summary.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.content}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryStat({
  icon: Icon,
  tone,
  label,
  align = 'left',
  children,
}: {
  icon: LucideIcon
  tone: 'income' | 'expense'
  label: string
  align?: 'left' | 'right'
  children: ReactNode
}) {
  return (
    <div className={cn('grid gap-1', align === 'right' && 'justify-items-end text-right')}>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-full',
            tone === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense',
          )}
        >
          <Icon className="size-3" aria-hidden />
        </span>
        {label}
      </span>
      <span className="text-sm tabular-nums sm:text-base">{children}</span>
    </div>
  )
}
