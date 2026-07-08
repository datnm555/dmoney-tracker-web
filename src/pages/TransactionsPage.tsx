import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarDays, Funnel, MoreHorizontal, Plus, Upload } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiErrorMessage } from '../api/client'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  updateTransaction,
} from '../api/transactionApi'
import type { MonthlySummaryResponse, TransactionResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { ImportTransactionsDialog } from '../components/ImportTransactionsDialog'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { SubmitOptions, TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'
import { groupTransactionsByDay } from '../utils/transactionGroups'

type Filter = 'all' | 'in' | 'out' | 'advance'

export function TransactionsPage() {
  const { t, lang } = useI18n()
  // 'YYYY-MM' for a single month, bare 'YYYY' for the whole current year.
  const [monthKey, setMonthKey] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [deleting, setDeleting] = useState<TransactionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setSummary(await getMonthlySummary(monthKey))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [monthKey, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleSubmit = async (values: TransactionFormValues, options?: SubmitOptions) => {
    const payload = {
      date: values.date,
      content: values.content,
      creditAmount: values.type === 'in' ? values.amount : 0,
      debitAmount: values.type === 'out' ? values.amount : 0,
      note: values.note,
      category: values.category,
      paymentMethod: values.paymentMethod,
      cardType: values.cardType,
      bank: values.bank,
      isAdvance: values.isAdvance,
      advanceTransactionId: values.advanceTransactionId,
    }
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
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const items = (summary?.items ?? []).filter((tx) => {
    if (filter === 'all') return true
    if (filter === 'advance') return tx.isAdvance
    return filter === 'in' ? tx.credit.amount > 0 : tx.debit.amount > 0
  })
  const groups = groupTransactionsByDay(items)
  const today = dayjs().format('YYYY-MM-DD')

  const isWholeYear = /^\d{4}$/.test(monthKey)
  const currentYear = dayjs().year()
  const currentMonth = dayjs().month() + 1

  // monthKey split into the two dropdowns: year + (month | whole year).
  const selYear = Number(monthKey.slice(0, 4))
  const selMonth = isWholeYear ? 'all' : monthKey.slice(5)

  const monthName = (n: number) => {
    const name = new Date(2026, n - 1, 1).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long',
    })
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const monthOptions = [
    { value: 'all', label: t('filters.allYear'), disabled: false },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: monthName(i + 1),
      // Future months of the current year cannot be selected.
      disabled: selYear === currentYear && i + 1 > currentMonth,
    })),
  ]

  const applyPeriod = (year: number, month: string) => {
    if (month === 'all') {
      setMonthKey(String(year))
      return
    }
    // Clamp to the current month when switching back to the current year lands on a future month.
    const clamped =
      year === currentYear && Number(month) > currentMonth ? String(currentMonth).padStart(2, '0') : month
    setMonthKey(`${year}-${clamped}`)
  }

  const rangeStart = isWholeYear ? dayjs(`${monthKey}-01-01`) : dayjs(`${monthKey}-01`).startOf('month')
  const rangeEnd = isWholeYear
    ? dayjs()
    : dayjs(`${monthKey}-01`).isSame(dayjs(), 'month')
      ? dayjs()
      : dayjs(`${monthKey}-01`).endOf('month')

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
          <Button type="button" variant="outline" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t('import.button')}
          </Button>
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

      <Card>
        <CardContent className="grid gap-4 p-4 md:p-5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Funnel className="h-4 w-4 text-primary" />
            {t('filters.title')}
          </div>

          <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">{t('filters.type')}</span>
              <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                <TabsList>
                  <TabsTrigger value="all">{t('transactions.filterAll')}</TabsTrigger>
                  <TabsTrigger value="in" className="data-[state=active]:text-income">
                    ↑ {t('form.moneyIn')}
                  </TabsTrigger>
                  <TabsTrigger value="out" className="data-[state=active]:text-expense">
                    ↓ {t('form.moneyOut')}
                  </TabsTrigger>
                  <TabsTrigger value="advance">⏳ {t('form.isAdvance')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('filters.month')} {t('filters.optional')}
              </span>
              <div className="flex items-center gap-2">
                <Select value={selMonth} onValueChange={(value) => applyPeriod(selYear, value)}>
                  <SelectTrigger className="w-40">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value} disabled={m.disabled}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(selYear)} onValueChange={(value) => applyPeriod(Number(value), selMonth)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFilter('all')
                    setMonthKey(dayjs().format('YYYY-MM'))
                  }}
                >
                  {t('filters.reset')}
                </Button>
              </div>
            </div>
          </div>

        </CardContent>
      </Card>

      <Card>
        <CardContent className="grid gap-2.5 p-4 md:p-5">
          {(() => {
            const credit = summary?.totalCredit.amount ?? 0
            const debit = summary?.totalDebit.amount ?? 0
            const total = credit + debit
            const creditPct = total > 0 ? (credit / total) * 100 : 0
            return (
              <>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-100">
                  {total > 0 && (
                    <>
                      <div className="h-full rounded-l-full bg-income" style={{ width: `${creditPct}%` }} />
                      <div className="h-full flex-1 rounded-r-full bg-expense" />
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>
                    <span className="text-muted-foreground">{t('summary.colCredit')} </span>
                    <strong className="text-income underline decoration-income/30 underline-offset-4">
                      +{summary ? formatMoney(summary.totalCredit) : '—'}
                    </strong>
                  </span>
                  <span>
                    <span className="text-muted-foreground">{t('summary.colDebit')} </span>
                    <strong className="text-expense underline decoration-expense/30 underline-offset-4">
                      −{summary ? formatMoney(summary.totalDebit) : '—'}
                    </strong>
                  </span>
                </div>
              </>
            )
          })()}
        </CardContent>
      </Card>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t('summary.empty')}</CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <Card key={group.date} className="overflow-hidden py-0">
          <CardContent className="divide-y p-0">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
              <span className="flex items-center gap-2.5 font-bold">
                <span
                  aria-hidden="true"
                  className={cn('h-2 w-2 rounded-full', group.net >= 0 ? 'bg-primary' : 'bg-expense')}
                />
                {dayTitle(group.date)} · {dayjs(group.date).format('DD/MM')}
              </span>
              {group.net >= 0 ? (
                <span className="rounded-lg bg-income/10 px-2.5 py-1 text-sm font-semibold text-income">
                  {t('transactions.net')} +{formatMoney({ amount: group.net, currency: 'VND' })}
                </span>
              ) : (
                <span className="text-sm font-semibold text-expense">
                  −{formatMoney({ amount: Math.abs(group.net), currency: 'VND' })}
                </span>
              )}
            </div>
            {group.items.map((tx) => {
              const isIncome = tx.credit.amount > 0
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3.5">
                  <CategoryIcon category={tx.category} className="h-11 w-11 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{tx.content}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <span className="truncate">
                        {tx.category ? `${t(`category.${tx.category}`)} · ` : ''}
                        {paymentLabel(tx, t)}
                      </span>
                      {tx.isAdvance && (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                          {t('form.isAdvance')}
                        </span>
                      )}
                    </div>
                    {tx.note && (
                      <div className="mt-0.5 truncate text-xs italic text-muted-foreground">
                        {t('form.note')}: {tx.note}
                      </div>
                    )}
                  </div>
                  <span className={isIncome ? 'font-semibold text-income' : 'font-semibold text-expense'}>
                    {isIncome ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          setEditing(tx)
                          setModalOpen(true)
                        }}
                      >
                        {t('summary.edit')}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-expense" onClick={() => setDeleting(tx)}>
                        {t('summary.delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )
            })}
          </CardContent>
        </Card>
      ))}

      <TransactionFormModal
        open={modalOpen}
        editing={editing}
        submitting={submitting}
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
