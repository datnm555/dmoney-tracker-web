import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { CalendarClock, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '../api/client'
import { getAccounts } from '../api/accountApi'
import { getSchedule } from '../api/recurringPaymentApi'
import { getDashboardStats, getMonthlySummary } from '../api/transactionApi'
import type {
  AccountResponse,
  DashboardStatsResponse,
  MonthlySummaryResponse,
  RecurringScheduleItemResponse,
} from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { usePlans } from '../plans/PlanContext'
import { toCategorySpending } from '../utils/chartData'
import { toIncomeExpenseBars } from '../utils/chartData'
import { upcomingDues } from '../utils/accounts'
import { scheduleStatus } from '../utils/recurring'
import { formatMoney } from '../utils/money'
import { paymentLabel } from '../utils/paymentLabel'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { CategoryIcon } from '../components/CategoryIcon'
import { AreaChart } from '../components/tremor/AreaChart'
import { DonutChart } from '../components/tremor/DonutChart'
import { ProgressBar } from '../components/tremor/ProgressBar'
import { getColorClassName, type AvailableChartColorsKeys } from '../components/tremor/utils/chartColors'
import { CashflowHero } from '../dashboard/CashflowHero'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Donut slices by spending rank (Tremor palette; expense rose stays for the cashflow chart). */
const DONUT_COLORS: AvailableChartColorsKeys[] = ['violet', 'blue', 'cyan', 'emerald', 'lime', 'amber', 'pink', 'fuchsia']

export function DashboardPage() {
  const { t, lang } = useI18n()
  const { selectedPlanId } = usePlans()
  const { label: categoryLabel } = useCategoryDisplay()
  // 'YYYY-MM' for a single month, bare 'YYYY' for the whole current year (default).
  const [monthKey, setMonthKey] = useState<string>(() => String(dayjs().year()))
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null)
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)

  const load = useCallback(async () => {
    if (!selectedPlanId) return
    try {
      const statsKey = /^\d{4}$/.test(monthKey) ? dayjs().format('YYYY-MM') : monthKey
      const [nextStats, nextSummary] = await Promise.all([
        getDashboardStats(statsKey, selectedPlanId),
        getMonthlySummary(monthKey, selectedPlanId),
      ])
      setStats(nextStats)
      setSummary(nextSummary)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [monthKey, selectedPlanId, t])

  useEffect(() => {
    void load()
  }, [load])

  // Independent of the dashboard loads: a failure just means no banner (no toast).
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  useEffect(() => {
    let cancelled = false
    getAccounts()
      .then((a) => {
        if (!cancelled) setAccounts(a)
      })
      .catch(() => {
        if (!cancelled) setAccounts([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  const todayStr = dayjs().format('YYYY-MM-DD')
  const urgentDues = useMemo(
    () => upcomingDues(accounts, todayStr).filter((d) => d.urgent),
    [accounts, todayStr],
  )

  const [schedule, setSchedule] = useState<RecurringScheduleItemResponse[]>([])
  useEffect(() => {
    let cancelled = false
    getSchedule(dayjs().format('YYYY-MM'))
      .then((rows) => {
        if (!cancelled) setSchedule(rows)
      })
      .catch(() => {
        if (!cancelled) setSchedule([])
      })
    return () => {
      cancelled = true
    }
  }, [])
  const recurringDues = useMemo(
    () =>
      schedule
        .map((row) => ({ row, ...scheduleStatus(row, todayStr) }))
        .filter((d) => d.status === 'dueSoon' || d.status === 'overdue')
        .sort((a, b) => a.row.dueDate.localeCompare(b.row.dueDate)),
    [schedule, todayStr],
  )

  const isWholeYear = /^\d{4}$/.test(monthKey)
  const monthName = (n: number) => {
    const name = new Date(2026, n - 1, 1).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long',
    })
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
  }
  const monthOptions = Array.from({ length: dayjs().month() + 1 }, (_, i) => ({
    value: `${dayjs().year()}-${String(i + 1).padStart(2, '0')}`,
    label: monthName(i + 1),
  }))
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
          <Select value={monthKey} onValueChange={setMonthKey}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={String(dayjs().year())}>{t('transactions.filterAll')}</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex h-9 items-center gap-1.5 rounded-lg border bg-background px-3 text-sm shadow-xs">
            ₫ VND
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {(urgentDues.length > 0 || recurringDues.length > 0) && (
        <section data-testid="due-banner" className="grid gap-3 rounded-2xl border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <CalendarClock className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-semibold">{t('accounts.upcoming')}</span>
            <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {urgentDues.length + recurringDues.length}
            </span>
          </div>
          <div className="grid gap-2">
            {urgentDues.map((d) => (
              <DueRow
                key={d.account.id}
                to="/app/accounts"
                testId={`due-banner-${d.account.id}`}
                dueDate={d.dueDate}
                hot={d.daysLeft <= 1}
                name={d.account.name}
                digits={d.account.lastDigits}
                when={
                  d.daysLeft < 0
                    ? `${t('accounts.overdue')} ${-d.daysLeft} ${t('accounts.days')}`
                    : d.daysLeft === 0
                      ? t('accounts.dueTodayFull')
                      : `${t('accounts.dueIn')} ${d.daysLeft} ${t('accounts.days')}`
                }
                amount={formatMoney({ amount: d.amount, currency: 'VND' })}
              />
            ))}
            {recurringDues.map(({ row, status, daysLeft }) => (
              <DueRow
                key={row.item.id}
                to="/app/recurring"
                testId={`due-banner-recurring-${row.item.id}`}
                dueDate={row.dueDate}
                hot={status === 'overdue' || daysLeft <= 1}
                name={row.item.name}
                when={
                  status === 'overdue'
                    ? `${t('accounts.overdue')} ${-daysLeft} ${t('accounts.days')}`
                    : daysLeft === 0
                      ? t('accounts.dueTodayFull')
                      : `${t('recurring.dueIn')} ${daysLeft} ${t('accounts.days')}`
                }
                amount={
                  row.item.isVariable && row.item.amount.amount === 0
                    ? t('recurring.enterAmount')
                    : `${row.item.isVariable ? '≈ ' : ''}${formatMoney(row.item.amount)}`
                }
              />
            ))}
          </div>
        </section>
      )}

      <CashflowHero
        balance={summary?.balance ?? null}
        income={summary?.totalCredit ?? null}
        expense={summary?.totalDebit ?? null}
        incomeCount={creditCount}
        expenseCount={debitCount}
        delta={isWholeYear ? null : balanceDelta}
        countLabel={t(isWholeYear ? 'dashboard.txThisYear' : 'dashboard.txThisMonth')}
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('dashboard.cashflow')}</CardTitle>
            {bars.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('dashboard.cashflowSub')} — {bars[0].month} {t('common.to')} {bars[bars.length - 1].month}{' '}
                {dayjs().year()}
              </p>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {bars.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                <FlowStat
                  testId="cashflow-in"
                  label={t('dashboard.legendIn')}
                  value={`+${vnd(bars.reduce((sum, b) => sum + b.income, 0))}`}
                  dot="bg-emerald-500"
                  tone="text-income"
                />
                <FlowStat
                  testId="cashflow-out"
                  label={t('dashboard.legendOut')}
                  value={`−${vnd(bars.reduce((sum, b) => sum + b.expense, 0))}`}
                  dot="bg-rose-500"
                  tone="text-expense"
                />
                {(() => {
                  const net = bars.reduce((sum, b) => sum + b.income - b.expense, 0)
                  return (
                    <FlowStat
                      testId="cashflow-net"
                      label={t('transactions.net')}
                      value={`${net >= 0 ? '+' : '−'}${vnd(Math.abs(net))}`}
                      dot="bg-primary"
                      tone={net >= 0 ? 'text-income' : 'text-expense'}
                    />
                  )
                })()}
              </div>
            )}
            <AreaChart
              className="h-64"
              data={bars.map((b) => ({
                month: b.month,
                [t('dashboard.legendIn')]: b.income,
                [t('dashboard.legendOut')]: b.expense,
              }))}
              index="month"
              categories={[t('dashboard.legendIn'), t('dashboard.legendOut')]}
              colors={['emerald', 'rose']}
              valueFormatter={vnd}
              yAxisWidth={86}
              fill="gradient"
              showLegend={false}
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">{t('dashboard.recent')}</CardTitle>
            <Button asChild variant="ghost" size="sm" className="text-primary">
              <Link to="/app/transactions">
                {t('dashboard.viewAll')}
                <ChevronRight className="ml-0.5 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-3 pt-0">
            {recent.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t('summary.empty')}</p>
            ) : (
              <ul className="grid gap-1">
                {recent.map((tx) => {
                  const isIn = tx.credit.amount > 0
                  return (
                    <li
                      key={tx.id}
                      data-testid="recent-row"
                      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50"
                    >
                      <CategoryIcon category={tx.categoryId} className="h-10 w-10 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{tx.content}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {dayjs(tx.date).format('DD/MM')} · {paymentLabel(tx, t)}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums',
                          isIn ? 'bg-income/10 text-income' : 'text-expense',
                        )}
                      >
                        {isIn ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t('dashboard.byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {categorySpending.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('summary.empty')}</p>
          ) : (
            <div className="grid items-center gap-6 md:grid-cols-[220px_1fr]">
              <div className="relative mx-auto">
                <DonutChart
                  className="size-52"
                  data={categorySpending.map((d) => ({ name: categoryLabel(d.category), amount: d.amount }))}
                  category="name"
                  value="amount"
                  colors={DONUT_COLORS}
                  valueFormatter={vnd}
                />
                {/* Total in the donut hole. */}
                <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
                  <span className="text-[11px] text-muted-foreground">{t('summary.colDebit')}</span>
                  <span data-testid="donut-total" className="text-base font-bold tabular-nums text-expense">
                    {vnd(spendingTotal)}
                  </span>
                </div>
              </div>
              <ul className="grid gap-3">
                {categorySpending.map((d, i) => {
                  const share = spendingTotal > 0 ? (d.amount / spendingTotal) * 100 : 0
                  const hasSubs = d.subs.some((s) => s.name !== null)
                  return (
                    <li key={d.category} data-testid="category-row" className="grid gap-1.5">
                      <div className="flex items-center gap-2.5 text-sm">
                        <span
                          aria-hidden
                          className={cn('size-2.5 shrink-0 rounded-full', getColorClassName(DONUT_COLORS[i % DONUT_COLORS.length], 'bg'))}
                        />
                        <CategoryIcon category={d.category} className="h-7 w-7 rounded-lg" />
                        <span className="min-w-0 flex-1 truncate font-medium">{categoryLabel(d.category)}</span>
                        <span className="font-semibold tabular-nums text-expense">−{vnd(d.amount)}</span>
                        <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">{share.toFixed(1)}%</span>
                      </div>
                      <ProgressBar value={share} variant="neutral" className="pl-5" />
                      {hasSubs && (
                        <div className="ml-5 grid gap-1 border-l-2 border-muted pl-5">
                          {d.subs.map((s) => (
                            <div key={s.name ?? '__none'} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex-1 truncate">{s.name ?? t('dashboard.noSubCategory')}</span>
                              <span className="tabular-nums">−{vnd(s.amount)}</span>
                              <span className="w-12 text-right tabular-nums">
                                {d.amount > 0 ? ((s.amount / d.amount) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** Six-month total above the cashflow chart: coloured dot, label, bold amount. */
function FlowStat({ testId, label, value, dot, tone }: { testId: string; label: string; value: string; dot: string; tone: string }) {
  return (
    <div className="grid gap-0.5 rounded-xl bg-muted/50 px-3 py-2">
      <span className="flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
        <span className={cn('size-2 shrink-0 rounded-full', dot)} />
        {label}
      </span>
      <span data-testid={testId} className={cn('truncate text-sm font-bold tabular-nums sm:text-base', tone)}>
        {value}
      </span>
    </div>
  )
}

/** One due item: date tile, name + days left, amount — rose when overdue / ≤ 1 day, amber otherwise. */
function DueRow({
  to,
  testId,
  dueDate,
  hot,
  name,
  digits,
  when,
  amount,
}: {
  to: string
  testId: string
  dueDate: string
  hot: boolean
  name: string
  digits?: string | null
  when: string
  amount: string
}) {
  const date = dayjs(dueDate)
  return (
    <Link
      to={to}
      data-testid={testId}
      className={cn(
        'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        hot
          ? 'border-rose-200 bg-rose-50 hover:bg-rose-100/70 dark:border-rose-500/30 dark:bg-rose-500/10'
          : 'border-amber-200 bg-amber-50 hover:bg-amber-100/70 dark:border-amber-500/30 dark:bg-amber-500/10',
      )}
    >
      <span
        className={cn(
          'flex w-12 shrink-0 flex-col items-center rounded-lg py-1 leading-none',
          hot ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
        )}
      >
        <span className="text-lg font-bold tabular-nums">{date.format('DD')}</span>
        <span className="mt-0.5 text-[10px] tabular-nums opacity-80">{date.format('MM/YYYY')}</span>
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="truncate font-medium text-foreground">
          {name}
          {digits && <span className="ml-1 text-xs font-normal text-muted-foreground">•••{digits}</span>}
        </span>
        <span
          data-testid={`${testId}-when`}
          className={cn('text-xs', hot ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}
        >
          {when}
        </span>
      </span>
      <span
        data-testid={`${testId}-amount`}
        className={cn('shrink-0 font-bold tabular-nums', hot ? 'text-rose-600 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}
      >
        {amount}
      </span>
    </Link>
  )
}
