import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiErrorMessage } from '../api/client'
import { createTransaction, getDashboardStats, getMonthlySummary } from '../api/transactionApi'
import type { DashboardStatsResponse, MonthlySummaryResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { toIncomeExpenseBars } from '../utils/chartData'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

export function DashboardPage() {
  const { t, lang } = useI18n()
  const [month, setMonth] = useState<Dayjs>(dayjs())
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const key = month.format('YYYY-MM')
      const [nextStats, nextSummary] = await Promise.all([getDashboardStats(key), getMonthlySummary(key)])
      setStats(nextStats)
      setSummary(nextSummary)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [month, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (values: TransactionFormValues) => {
    setSubmitting(true)
    try {
      await createTransaction({
        date: values.date,
        content: values.content,
        creditAmount: values.type === 'in' ? values.amount : 0,
        debitAmount: values.type === 'out' ? values.amount : 0,
        note: values.note,
        category: values.category,
        paymentMethod: values.paymentMethod,
        cardType: values.cardType,
        bank: values.bank,
      })
      setModalOpen(false)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const monthTabs = [2, 1, 0].map((offset) => dayjs().subtract(offset, 'month'))
  const bars = stats ? toIncomeExpenseBars(stats.monthly.slice(-6)) : []
  const current = stats?.monthly.at(-1)
  const previous = stats?.monthly.at(-2)
  const balanceDelta =
    current && previous && previous.balance.amount !== 0
      ? ((current.balance.amount - previous.balance.amount) / Math.abs(previous.balance.amount)) * 100
      : null
  const creditCount = summary?.items.filter((i) => i.credit.amount > 0).length ?? 0
  const debitCount = summary?.items.filter((i) => i.debit.amount > 0).length ?? 0
  const recent = summary?.items.slice(0, 4) ?? []

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {new Date().toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={month.format('YYYY-MM')} onValueChange={(value) => setMonth(dayjs(`${value}-01`))}>
            <TabsList>
              {monthTabs.map((m) => (
                <TabsTrigger key={m.format('YYYY-MM')} value={m.format('YYYY-MM')}>
                  T{m.month() + 1}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('summary.create')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary ? formatMoney(summary.balance) : '—'}</div>
            {balanceDelta !== null && (
              <p className={balanceDelta >= 0 ? 'text-xs text-income' : 'text-xs text-expense'}>
                {balanceDelta >= 0 ? '+' : ''}
                {balanceDelta.toFixed(1)}% {t('dashboard.vsLastMonth')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.colCredit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-income">
              +{summary ? formatMoney(summary.totalCredit) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {creditCount} {t('dashboard.txThisMonth')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.colDebit')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-expense">
              −{summary ? formatMoney(summary.totalDebit) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {debitCount} {t('dashboard.txThisMonth')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.cashflow')}</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickFormatter={vnd} tickLine={false} axisLine={false} fontSize={12} width={90} />
              <Tooltip formatter={(value) => vnd(Number(value))} />
              <Bar dataKey="income" name={t('summary.colCredit')} fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name={t('summary.colDebit')} fill="#dc2626" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t('dashboard.recent')}</CardTitle>
          <Link to="/app/transactions" className="text-sm text-primary hover:underline">
            {t('dashboard.viewAll')}
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('summary.colContent')}</TableHead>
                <TableHead>{t('payment.method')}</TableHead>
                <TableHead className="text-right">{t('form.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon category={tx.category} />
                      <div>
                        <div className="font-medium">{tx.content}</div>
                        <div className="text-xs text-muted-foreground">{dayjs(tx.date).format('DD/MM')}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{paymentLabel(tx, t)}</Badge>
                  </TableCell>
                  <TableCell
                    className={
                      tx.credit.amount > 0 ? 'text-right font-medium text-income' : 'text-right font-medium text-expense'
                    }
                  >
                    {tx.credit.amount > 0 ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
                  </TableCell>
                </TableRow>
              ))}
              {recent.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    {t('summary.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <TransactionFormModal
        open={modalOpen}
        editing={null}
        submitting={submitting}
        onSubmit={handleCreate}
        onCancel={() => setModalOpen(false)}
      />
    </div>
  )
}
