import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'
import { groupTransactionsByDay } from '../utils/transactionGroups'

type Filter = 'all' | 'in' | 'out'

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

  const handleSubmit = async (values: TransactionFormValues) => {
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
    }
    setSubmitting(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
      } else {
        await createTransaction(payload)
      }
      setModalOpen(false)
      setEditing(null)
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

  const items = (summary?.items ?? []).filter((tx) =>
    filter === 'all' ? true : filter === 'in' ? tx.credit.amount > 0 : tx.debit.amount > 0,
  )
  const groups = groupTransactionsByDay(items)
  const today = dayjs().format('YYYY-MM-DD')

  const isWholeYear = /^\d{4}$/.test(monthKey)
  const currentYear = dayjs().year()

  const monthLabel = (m: Dayjs) => {
    const name = m.toDate().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', { month: 'long' })
    const capitalized = `${name.charAt(0).toUpperCase()}${name.slice(1)}`
    return `${capitalized} / ${m.year()}`
  }

  // Whole-year option + every month of the current year up to now, newest first.
  const monthOptions = [
    { value: String(currentYear), label: `${t('filters.allYear')} ${currentYear}` },
    ...Array.from({ length: dayjs().month() + 1 }, (_, i) => {
      const m = dayjs().month(dayjs().month() - i)
      return { value: m.format('YYYY-MM'), label: monthLabel(m) }
    }),
  ]

  const rangeStart = isWholeYear ? dayjs(`${monthKey}-01-01`) : dayjs(`${monthKey}-01`).startOf('month')
  const rangeEnd = isWholeYear
    ? dayjs()
    : dayjs(`${monthKey}-01`).isSame(dayjs(), 'month')
      ? dayjs()
      : dayjs(`${monthKey}-01`).endOf('month')

  const dayLabel = (date: string) => {
    if (date === today) return `${t('transactions.today')} · ${dayjs(date).format('DD/MM')}`
    const weekday = new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
    })
    return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} · ${dayjs(date).format('DD/MM')}`
  }

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
                </TabsList>
              </Tabs>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs text-muted-foreground">
                {t('filters.month')} {t('filters.optional')}
              </span>
              <div className="flex items-center gap-2">
                <Select value={monthKey} onValueChange={setMonthKey}>
                  <SelectTrigger className="w-52">
                    <div className="flex min-w-0 items-center gap-2">
                      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
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

          <div className="flex flex-wrap justify-end gap-2 text-sm">
            <span className="rounded-lg bg-income/10 px-3 py-1.5">
              <span className="text-muted-foreground">{t('summary.colCredit')}: </span>
              <strong className="text-income">+{summary ? formatMoney(summary.totalCredit) : '—'}</strong>
            </span>
            <span className="rounded-lg bg-expense/10 px-3 py-1.5">
              <span className="text-muted-foreground">{t('summary.colDebit')}: </span>
              <strong className="text-expense">−{summary ? formatMoney(summary.totalDebit) : '—'}</strong>
            </span>
          </div>
        </CardContent>
      </Card>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t('summary.empty')}</CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <div key={group.date} className="grid gap-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="font-medium">{dayLabel(group.date)}</span>
            <span className={group.net >= 0 ? 'font-semibold text-income' : 'font-semibold text-expense'}>
              {group.net >= 0 ? '+' : '−'}
              {formatMoney({ amount: Math.abs(group.net), currency: 'VND' })}
            </span>
          </div>
          <Card>
            <CardContent className="divide-y p-0">
              {group.items.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryIcon category={tx.category} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{tx.content}</div>
                    <div className="text-xs text-muted-foreground">
                      {tx.category ? `${t(`category.${tx.category}`)} · ` : ''}
                      {paymentLabel(tx, t)}
                    </div>
                  </div>
                  <Badge variant="outline" className="hidden sm:inline-flex">
                    {paymentLabel(tx, t)}
                  </Badge>
                  <span
                    className={tx.credit.amount > 0 ? 'font-semibold text-income' : 'font-semibold text-expense'}
                  >
                    {tx.credit.amount > 0 ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
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
              ))}
            </CardContent>
          </Card>
        </div>
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
