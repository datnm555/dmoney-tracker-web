import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { MoreHorizontal, Plus } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiErrorMessage } from '../api/client'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  updateTransaction,
} from '../api/transactionApi'
import type { MonthlySummaryResponse, TransactionResponse } from '../api/types'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'
import { groupTransactionsByDay } from '../utils/transactionGroups'

type Filter = 'all' | 'in' | 'out'

export function TransactionsPage() {
  const { t, lang } = useI18n()
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [deleting, setDeleting] = useState<TransactionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      setSummary(await getMonthlySummary(month.format('YYYY-MM')))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [month, t])

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
            {month.startOf('month').format('DD/MM')} →{' '}
            {month.isSame(dayjs(), 'month') ? dayjs().format('DD/MM/YYYY') : month.endOf('month').format('DD/MM/YYYY')} ·{' '}
            {summary?.items.length ?? 0} {t('transactions.count')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={filter} onValueChange={(value) => setFilter(value as Filter)}>
            <TabsList>
              <TabsTrigger value="all">{t('transactions.filterAll')}</TabsTrigger>
              <TabsTrigger value="in">↑ {t('form.moneyIn')}</TabsTrigger>
              <TabsTrigger value="out">↓ {t('form.moneyOut')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type="month"
            className="w-40"
            value={month.format('YYYY-MM')}
            onChange={(e) => e.target.value && setMonth(dayjs(`${e.target.value}-01`))}
          />
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

      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          {t('transactions.creditThisMonth')}:{' '}
          <strong className="text-income">+{summary ? formatMoney(summary.totalCredit) : '—'}</strong>
        </span>
        <span>
          {t('transactions.debitThisMonth')}:{' '}
          <strong className="text-expense">−{summary ? formatMoney(summary.totalDebit) : '—'}</strong>
        </span>
      </div>

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
