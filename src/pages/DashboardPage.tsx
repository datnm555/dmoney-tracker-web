import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, ChevronDown, Plus, TrendingUp, WalletCards } from 'lucide-react'
import { toast } from 'sonner'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApiErrorMessage } from '../api/client'
import { createTransaction, getDashboardStats, getMonthlySummary } from '../api/transactionApi'
import type { DashboardStatsResponse, MonthlySummaryResponse } from '../api/types'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { SubmitOptions, TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { toCategorySpending } from '../utils/chartData'
import { toIncomeExpenseBars } from '../utils/chartData'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { CategoryIcon } from '../components/CategoryIcon'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

export function DashboardPage() {
  const { t, lang } = useI18n()
  const { label: categoryLabel, visual: categoryDisplayVisual } = useCategoryDisplay()
  // 'YYYY-MM' for a single month, bare 'YYYY' for the whole current year.
  const [monthKey, setMonthKey] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    try {
      const statsKey = /^\d{4}$/.test(monthKey) ? dayjs().format('YYYY-MM') : monthKey
      const [nextStats, nextSummary] = await Promise.all([
        getDashboardStats(statsKey),
        getMonthlySummary(monthKey),
      ])
      setStats(nextStats)
      setSummary(nextSummary)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [monthKey, t])

  useEffect(() => {
    void load()
  }, [load])

  const handleCreate = async (values: TransactionFormValues, options?: SubmitOptions) => {
    setSubmitting(true)
    try {
      await createTransaction({
        date: values.date,
        content: values.content,
        creditAmount: values.type === 'in' ? values.amount : 0,
        debitAmount: values.type === 'out' ? values.amount : 0,
        note: values.note,
        categoryId: values.categoryId,
        paymentMethod: values.paymentMethod,
        cardType: values.cardType,
        bank: values.bank,
        isAdvance: values.isAdvance,
        advanceTransactionIds: values.advanceTransactionIds,
      isPrepaid: values.isPrepaid,
      prepaidFrom: values.prepaidFrom,
      prepaidTo: values.prepaidTo,
      prepaidTransactionId: values.prepaidTransactionId,
      subCategoryId: values.subCategoryId,
      })
      if (options?.keepOpen) {
        // Save & Continue: keep the dialog and its values so the user can save a tweaked clone.
        toast.success(t('form.saved'))
      } else {
        toast.success(t('toast.created'))
        setModalOpen(false)
      }
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const isWholeYear = /^\d{4}$/.test(monthKey)
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
  const categorySpending = toCategorySpending(summary?.items ?? [])
  const spendingTotal = categorySpending.reduce((s, d) => s + d.amount, 0)

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
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={monthKey} onValueChange={setMonthKey}>
            <TabsList>
              {monthTabs.map((m, i) => (
                <TabsTrigger key={m.format('YYYY-MM')} value={m.format('YYYY-MM')}>
                  {i === monthTabs.length - 1
                    ? lang === 'vi'
                      ? `Tháng ${m.month() + 1}`
                      : m.toDate().toLocaleDateString('en-US', { month: 'short' })
                    : `T${m.month() + 1}`}
                </TabsTrigger>
              ))}
              <TabsTrigger value={String(dayjs().year())}>
                {t('filters.allYear')} {dayjs().year()}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm shadow-xs">
            ₫ VND
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('summary.create')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard.totalBalance')}</CardTitle>
            <WalletCards className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold underline decoration-zinc-200 underline-offset-4">
              {summary ? formatMoney(summary.balance) : '—'}
            </div>
            {!isWholeYear && balanceDelta !== null && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={
                    balanceDelta >= 0
                      ? 'flex items-center gap-0.5 rounded-full bg-income/10 px-1.5 py-0.5 font-medium text-income'
                      : 'flex items-center gap-0.5 rounded-full bg-expense/10 px-1.5 py-0.5 font-medium text-expense'
                  }
                >
                  <TrendingUp className="h-3 w-3" />
                  {balanceDelta >= 0 ? '+' : ''}
                  {balanceDelta.toFixed(1)}%
                </span>
                {t('dashboard.vsLastMonth')}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.colCredit')}</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-income" />
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold text-income underline decoration-income/30 underline-offset-4">
              +{summary ? formatMoney(summary.totalCredit) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {creditCount} {t(isWholeYear ? 'dashboard.txThisYear' : 'dashboard.txThisMonth')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('summary.colDebit')}</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-expense" />
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold text-expense underline decoration-expense/30 underline-offset-4">
              −{summary ? formatMoney(summary.totalDebit) : '—'}
            </div>
            <p className="text-xs text-muted-foreground">
              {debitCount} {t(isWholeYear ? 'dashboard.txThisYear' : 'dashboard.txThisMonth')}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.cashflow')}</CardTitle>
          {bars.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('dashboard.cashflowSub')} — {bars[0].month} {t('common.to')} {bars[bars.length - 1].month}{' '}
              {dayjs().year()}
            </p>
          )}
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickFormatter={vnd} tickLine={false} axisLine={false} fontSize={11} width={86} />
                <Tooltip formatter={(value) => vnd(Number(value))} />
                <Bar dataKey="income" name={t('dashboard.legendIn')} fill="#16a34a" radius={[7, 7, 7, 7]} barSize={14} />
                <Bar dataKey="expense" name={t('dashboard.legendOut')} fill="#dc2626" radius={[7, 7, 7, 7]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-income" />
              {t('dashboard.legendIn')}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-expense" />
              {t('dashboard.legendOut')}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">{t('dashboard.recent')}</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link to="/app/transactions">{t('dashboard.viewAll')}</Link>
          </Button>
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
                      <CategoryIcon category={tx.categoryId} />
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
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {categorySpending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('summary.empty')}</p>
          ) : (
            <div className="grid items-center gap-6 md:grid-cols-[260px_1fr]">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categorySpending}
                      dataKey="amount"
                      nameKey="category"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {categorySpending.map((d) => (
                        <Cell key={d.category} fill={categoryDisplayVisual(d.category).hex} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, _name, entry) => [
                        vnd(Number(value)),
                        categoryLabel((entry?.payload as { category?: string })?.category ?? 'other'),
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid gap-2">
                {categorySpending.map((d) => {
                  const hasSubs = d.subs.some((s) => s.name !== null)
                  return (
                    <div key={d.category} className="grid gap-1">
                      <div className="flex items-center gap-2.5 text-sm">
                        <CategoryIcon category={d.category} className="h-7 w-7 rounded-lg" />
                        <span className="w-28 truncate">{categoryLabel(d.category)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${spendingTotal > 0 ? (d.amount / spendingTotal) * 100 : 0}%`,
                              backgroundColor: categoryDisplayVisual(d.category).hex,
                            }}
                          />
                        </div>
                        <span className="w-28 text-right font-medium text-expense">−{vnd(d.amount)}</span>
                        <span className="w-12 text-right text-xs text-muted-foreground">
                          {spendingTotal > 0 ? ((d.amount / spendingTotal) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      {hasSubs && (
                        <div className="mb-1 ml-3.5 grid gap-1 border-l-2 border-zinc-100 pl-6">
                          {d.subs.map((s) => (
                            <div
                              key={s.name ?? '__none'}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span className="flex-1 truncate">
                                {s.name ?? t('dashboard.noSubCategory')}
                              </span>
                              <span className="w-28 text-right">−{vnd(s.amount)}</span>
                              <span className="w-12 text-right">
                                {d.amount > 0 ? ((s.amount / d.amount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
