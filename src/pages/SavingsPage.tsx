import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Pencil, PiggyBank, Plus, Receipt, Target, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { getSavingsSummary } from '../api/savingsApi'
import { getSubCategories } from '../api/subCategoryApi'
import { createTransaction } from '../api/transactionApi'
import { TransactionFormModal, type TransactionFormValues } from '../components/TransactionFormModal'
import { BarChart } from '../components/tremor/BarChart'
import { ProgressCircle } from '../components/tremor/ProgressCircle'
import { SparkAreaChart } from '../components/tremor/SparkChart'
import { toTransactionPayload } from '../utils/transactionPayload'
import type { MoneyResponse, SavingsAccountResponse, SavingsSummaryResponse, SubCategoryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { SavingsGoalDialog } from '../savings/SavingsGoalDialog'
import { savingsMonthly, savingsPlaceNetMonthly } from '../utils/chartData'
import { formatMoney } from '../utils/money'
import { goalProgress } from '../utils/savings'

// Select values: 'all', the unassigned bucket sentinel, or an account name.
const ALL = 'all'
const UNASSIGNED = '__unassigned__'

const accountKey = (savingsBank: string | null) => savingsBank ?? UNASSIGNED

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

function StatTile({
  testId,
  label,
  value,
  icon: Icon,
  valueClass,
}: {
  testId: string
  label: string
  value: string
  icon: LucideIcon
  valueClass?: string
}) {
  return (
    <div data-testid={testId} className="grid gap-1 rounded-xl bg-white/10 p-3 ring-1 ring-white/15 backdrop-blur-sm">
      <span className="inline-flex items-center gap-1.5 truncate text-xs text-emerald-50/80">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </span>
      <span className={cn('truncate text-base font-bold tabular-nums sm:text-lg', valueClass ?? 'text-white')}>{value}</span>
    </div>
  )
}

/** Balances can go negative (withdrew more than recorded deposits): show "−" + abs, never "+-". */
function formatBalance(money: MoneyResponse): string {
  return money.amount < 0 ? `−${formatMoney({ ...money, amount: -money.amount })}` : formatMoney(money)
}

/** Goal progress for one savings place, or a button to set one. */
function GoalBlock({ account, onEdit }: { account: SavingsAccountResponse; onEdit: () => void }) {
  const { t } = useI18n()
  const goal = account.goal
  if (!goal) {
    return (
      <Button variant="outline" size="sm" className="w-full" onClick={onEdit}>
        <Target className="mr-1 h-4 w-4" />
        {t('savings.setGoal')}
      </Button>
    )
  }
  const p = goalProgress(goal, account.balance.amount, dayjs().format('YYYY-MM'))
  return (
    <div data-testid="savings-goal" className="grid gap-2 border-t pt-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 font-medium">
          <Target className="h-3.5 w-3.5 text-primary" />
          {t('savings.goal')} {formatMoney(goal.targetAmount)}
        </span>
        <button
          type="button"
          aria-label={`${t('savings.goal')} ${account.savingsBank}`}
          onClick={onEdit}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-3">
        <ProgressCircle value={p.pct} variant="success" radius={30} strokeWidth={5} className="shrink-0">
          <span className="text-[11px] font-bold tabular-nums text-income">{p.pct}%</span>
        </ProgressCircle>
        <div className="grid min-w-0 flex-1 gap-1.5">
          <div className="text-muted-foreground">
            {t('savings.period')} {p.elapsed}/{goal.months} · {dayjs(`${p.endPeriod}-01`).format('MM/YYYY')}
          </div>
          {goal.initialAmount.amount > 0 && (
            <div data-testid="savings-goal-initial" className="flex justify-between gap-2 text-muted-foreground">
              <span>{t('savings.initialAmount')}</span>
              <span className="tabular-nums">{formatMoney(goal.initialAmount)}</span>
            </div>
          )}
          {p.reached ? (
            <div className="font-medium text-income">{t('savings.goalReached')}</div>
          ) : (
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                {t('savings.perMonth')}
                {p.monthsLeft > 0 && ` (${t('accounts.left')} ${p.monthsLeft} ${t('savings.monthUnit')})`}
              </span>
              <span data-testid="savings-goal-per-month" className="font-semibold tabular-nums">
                {vnd(p.perMonth)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function SavingsPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<SavingsSummaryResponse | null>(null)
  const [filter, setFilter] = useState<string>(ALL)
  const [goalAccount, setGoalAccount] = useState<SavingsAccountResponse | null>(null)
  const [depositing, setDepositing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [savingsBook, setSavingsBook] = useState<SubCategoryResponse | null>(null)

  // "Gửi tiết kiệm" pre-fills Tích luỹ › Sổ tiết kiệm; without that sub-category the button hides.
  useEffect(() => {
    let cancelled = false
    getSubCategories()
      .then((subs) => {
        if (!cancelled) setSavingsBook(subs.find((sub) => sub.code === 'savings_book') ?? null)
      })
      .catch(() => {
        if (!cancelled) setSavingsBook(null)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const load = useCallback(async () => {
    try {
      setSummary(await getSavingsSummary())
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const accounts = summary?.accounts ?? []
  const transactions = useMemo(() => summary?.transactions ?? [], [summary])
  const totalBalance = summary?.totalBalance ?? { amount: 0, currency: 'VND' }

  const stats = useMemo(() => {
    const currentMonth = dayjs().format('YYYY-MM')
    let deposited = 0
    let withdrawn = 0
    let thisMonth = 0
    for (const tx of transactions) {
      deposited += tx.debit.amount
      withdrawn += tx.credit.amount
      if (tx.date.slice(0, 7) === currentMonth) thisMonth += tx.debit.amount
    }
    return { deposited, withdrawn, thisMonth, count: transactions.length }
  }, [transactions])

  const monthly = useMemo(() => savingsMonthly(transactions, dayjs()), [transactions])

  // Last 6 months of net deposits per place, for the card sparklines (only places with transactions).
  const sparks = useMemo(() => {
    const today = dayjs()
    const result = new Map<string, { month: string; net: number }[]>()
    for (const account of summary?.accounts ?? []) {
      if (!transactions.some((tx) => tx.savingsBank === account.savingsBank)) continue
      result.set(accountKey(account.savingsBank), savingsPlaceNetMonthly(transactions, account.savingsBank, today))
    }
    return result
  }, [summary, transactions])

  const accountLabel = (savingsBank: string | null) => savingsBank ?? t('savings.unassigned')

  const submitDeposit = async (values: TransactionFormValues) => {
    if (!summary) return
    setSubmitting(true)
    try {
      // Savings only count in the default plan, whatever plan the header has selected.
      await createTransaction(toTransactionPayload(values, summary.planId))
      setDepositing(false)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const visibleTransactions = useMemo(
    () => (filter === ALL ? transactions : transactions.filter((tx) => accountKey(tx.savingsBank) === filter)),
    [transactions, filter],
  )

  const hasHistory = transactions.length > 0
  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-bold">{t('savings.title')}</h1>
        {savingsBook && summary && (
          <Button onClick={() => setDepositing(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('savings.deposit')}
          </Button>
        )}
      </div>

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-900 p-5 text-white shadow-lg shadow-teal-900/20 sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full bg-emerald-300/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 left-0 size-64 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative grid gap-5">
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-emerald-50/80">
                <PiggyBank className="size-3.5" aria-hidden />
                {t('savings.total')}
              </span>
              <span
                data-testid="savings-total"
                className={cn(
                  'text-4xl font-extrabold tracking-tight tabular-nums sm:text-5xl',
                  totalBalance.amount < 0 && 'text-rose-200',
                )}
              >
                {formatBalance(totalBalance)}
              </span>
              {summary && (
                <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs ring-1 ring-white/20">
                  <span className="text-emerald-50/80">{t('savings.plan')}:</span>
                  <span data-testid="savings-plan" className="font-semibold">
                    {summary.planName}
                  </span>
                </span>
              )}
            </div>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <PiggyBank className="size-6" aria-hidden />
            </span>
          </div>
          {hasHistory && (
            <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
              <StatTile
                testId="savings-stat-deposited"
                label={t('savings.totalDeposited')}
                value={vnd(stats.deposited)}
                icon={ArrowDownToLine}
                valueClass="text-emerald-100"
              />
              <StatTile
                testId="savings-stat-withdrawn"
                label={t('savings.totalWithdrawn')}
                value={vnd(stats.withdrawn)}
                icon={ArrowUpFromLine}
                valueClass="text-rose-200"
              />
              <StatTile
                testId="savings-stat-this-month"
                label={t('savings.thisMonth')}
                value={vnd(stats.thisMonth)}
                icon={CalendarDays}
              />
              <StatTile testId="savings-stat-count" label={t('savings.count')} value={String(stats.count)} icon={Receipt} />
            </div>
          )}
          <p className="text-xs text-emerald-50/80">{t('savings.hint')}</p>
        </div>
      </section>

      {summary && !hasHistory && accounts.length === 0 && (
        <Card className="rounded-2xl">
          <CardContent className="grid justify-items-center gap-3 py-10 text-center text-sm text-muted-foreground">
            <PiggyBank className="size-9 text-muted-foreground/40" />
            {t('savings.empty')}
          </CardContent>
        </Card>
      )}

      {hasHistory && (
          <Card className="rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('savings.monthlyChart')}</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart
                className="h-64"
                data={monthly.map((m) => ({
                  month: `T${Number(m.month.slice(0, 2))}`,
                  [t('savings.deposited')]: m.deposited,
                  [t('savings.withdrawn')]: m.withdrawn,
                }))}
                index="month"
                categories={[t('savings.deposited'), t('savings.withdrawn')]}
                colors={['emerald', 'rose']}
                valueFormatter={vnd}
                yAxisWidth={86}
              />
            </CardContent>
          </Card>
      )}

          {accounts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('savings.accounts')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => {
                  const key = accountKey(account.savingsBank)
                  const selected = filter === key
                  const spark = sparks.get(key)
                  return (
                    <div
                      key={key}
                      data-testid={`savings-account-${key}`}
                      className={cn(
                        'grid content-start gap-3 rounded-2xl border bg-gradient-to-br from-teal-500/5 via-card to-card p-4 text-card-foreground shadow-sm transition-colors hover:border-zinc-300',
                        selected && 'border-primary ring-1 ring-primary/30 hover:border-primary',
                      )}
                    >
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setFilter(selected ? ALL : key)}
                        className="grid gap-3 text-left"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={cn(
                              'truncate font-semibold',
                              account.savingsBank === null && 'italic text-muted-foreground',
                            )}
                          >
                            {accountLabel(account.savingsBank)}
                          </span>
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-teal-500/10">
                            <Wallet className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                          </span>
                        </div>
                        <div className="flex items-end justify-between gap-3">
                          <div
                            data-testid="savings-balance"
                            className={cn(
                              'min-w-0 truncate text-2xl font-bold tabular-nums',
                              account.balance.amount < 0 && 'text-expense',
                            )}
                          >
                            {formatBalance(account.balance)}
                          </div>
                          {spark && (
                            <SparkAreaChart
                              data-testid={`savings-spark-${key}`}
                              aria-hidden
                              className="h-9 w-24 shrink-0"
                              data={spark}
                              index="month"
                              categories={['net']}
                              colors={['emerald']}
                            />
                          )}
                        </div>
                        <dl className="grid gap-1.5 border-t pt-3 text-xs">
                          <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">{t('savings.deposited')}</dt>
                            <dd className="font-medium text-income">{formatMoney(account.totalDeposited)}</dd>
                          </div>
                          <div className="flex items-center justify-between">
                            <dt className="text-muted-foreground">{t('savings.withdrawn')}</dt>
                            <dd className="font-medium text-expense">{formatMoney(account.totalWithdrawn)}</dd>
                          </div>
                          <div className="text-muted-foreground">
                            {account.transactionCount} {t('savings.count')}
                          </div>
                        </dl>
                      </button>
                      {account.savingsBank !== null && (
                        <GoalBlock account={account} onEdit={() => setGoalAccount(account)} />
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

      {hasHistory ? (
          <Card className="rounded-2xl">
            <CardHeader className="flex-col gap-3 space-y-0 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{t('savings.history')}</CardTitle>
                <Badge variant="secondary">{visibleTransactions.length}</Badge>
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger aria-label={t('savings.history')} className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>{t('savings.filterAll')}</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={accountKey(account.savingsBank)} value={accountKey(account.savingsBank)}>
                      {accountLabel(account.savingsBank)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y">
                {visibleTransactions.map((tx) => {
                  const isDeposit = tx.debit.amount > 0
                  const details = [tx.subCategoryName, tx.note].filter(Boolean).join(' · ')
                  return (
                    <li
                      key={tx.transactionId}
                      data-testid={`savings-row-${tx.transactionId}`}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-muted/60 py-1.5 leading-none">
                        <span className="text-lg font-bold tabular-nums">{dayjs(tx.date).format('DD')}</span>
                        <span className="mt-0.5 text-[10px] tabular-nums text-muted-foreground">
                          {dayjs(tx.date).format('MM/YYYY')}
                        </span>
                        {/* Full date for screen readers and tests; the tile shows it split. */}
                        <span className="sr-only">{dayjs(tx.date).format('DD/MM/YYYY')}</span>
                      </div>
                      <div className="grid min-w-0 flex-1 gap-1">
                        <span className="truncate font-medium">{tx.content}</span>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5',
                              tx.savingsBank ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300' : 'bg-muted italic text-muted-foreground',
                            )}
                          >
                            {accountLabel(tx.savingsBank)}
                          </span>
                          {details && <span className="text-muted-foreground">{details}</span>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap font-bold tabular-nums',
                          isDeposit ? 'text-income' : 'text-expense',
                        )}
                      >
                        {isDeposit ? `+${formatMoney(tx.debit)}` : `−${formatMoney(tx.credit)}`}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
      ) : (
        accounts.length > 0 && (
          <Card className="rounded-2xl">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">{t('savings.noHistory')}</CardContent>
          </Card>
        )
      )}
      {depositing && savingsBook && (
        <TransactionFormModal
          open
          editing={null}
          submitting={submitting}
          prefill={{ type: 'out', categoryId: savingsBook.categoryId, subCategoryId: savingsBook.id }}
          onSubmit={(values) => void submitDeposit(values)}
          onCancel={() => setDepositing(false)}
        />
      )}
      <SavingsGoalDialog account={goalAccount} onClose={() => setGoalAccount(null)} onSaved={() => void load()} />
    </div>
  )
}
