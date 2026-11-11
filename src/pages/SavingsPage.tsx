import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { ArrowDownToLine, ArrowUpFromLine, CalendarDays, Pencil, PiggyBank, Receipt, Target, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { getSavingsSummary } from '../api/savingsApi'
import type { MoneyResponse, SavingsAccountResponse, SavingsSummaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { SavingsGoalDialog } from '../savings/SavingsGoalDialog'
import { savingsMonthly } from '../utils/chartData'
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
    <Card data-testid={testId}>
      <CardContent className="grid gap-1 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted-foreground">{label}</span>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className={cn('truncate text-base font-bold tabular-nums sm:text-lg', valueClass)}>{value}</div>
      </CardContent>
    </Card>
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
      <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
        <div className="h-full bg-income" style={{ width: `${p.pct}%` }} />
      </div>
      {goal.initialAmount.amount > 0 && (
        <div data-testid="savings-goal-initial" className="flex justify-between text-muted-foreground">
          <span>{t('savings.initialAmount')}</span>
          <span className="tabular-nums">{formatMoney(goal.initialAmount)}</span>
        </div>
      )}
      <div className="flex justify-between text-muted-foreground">
        <span className="font-medium text-income">{p.pct}%</span>
        <span>
          {t('savings.period')} {p.elapsed}/{goal.months} · {dayjs(`${p.endPeriod}-01`).format('MM/YYYY')}
        </span>
      </div>
      {p.reached ? (
        <div className="font-medium text-income">{t('savings.goalReached')}</div>
      ) : (
        <div className="flex justify-between">
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
  )
}

export function SavingsPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<SavingsSummaryResponse | null>(null)
  const [filter, setFilter] = useState<string>(ALL)
  const [goalAccount, setGoalAccount] = useState<SavingsAccountResponse | null>(null)

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

  const accountLabel = (savingsBank: string | null) => savingsBank ?? t('savings.unassigned')

  const visibleTransactions = useMemo(
    () => (filter === ALL ? transactions : transactions.filter((tx) => accountKey(tx.savingsBank) === filter)),
    [transactions, filter],
  )

  return (
    <div className="grid gap-4">
      <div className="grid gap-0.5">
        <h1 className="text-xl font-bold">{t('savings.title')}</h1>
        {summary && (
          <p className="text-sm text-muted-foreground">
            <span>{t('savings.plan')}:</span>{' '}
            <span data-testid="savings-plan" className="font-medium text-foreground">
              {summary.planName}
            </span>
          </p>
        )}
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{t('savings.total')}</CardTitle>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <PiggyBank className="h-4 w-4 text-primary" />
          </span>
        </CardHeader>
        <CardContent className="grid gap-1.5">
          <div
            data-testid="savings-total"
            className={cn('text-3xl font-bold tabular-nums', totalBalance.amount < 0 ? 'text-expense' : 'text-primary')}
          >
            {formatBalance(totalBalance)}
          </div>
          <p className="text-xs text-muted-foreground">{t('savings.hint')}</p>
        </CardContent>
      </Card>

      {summary && transactions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('savings.empty')}</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              testId="savings-stat-deposited"
              label={t('savings.totalDeposited')}
              value={vnd(stats.deposited)}
              icon={ArrowDownToLine}
              valueClass="text-income"
            />
            <StatTile
              testId="savings-stat-withdrawn"
              label={t('savings.totalWithdrawn')}
              value={vnd(stats.withdrawn)}
              icon={ArrowUpFromLine}
              valueClass="text-expense"
            />
            <StatTile
              testId="savings-stat-this-month"
              label={t('savings.thisMonth')}
              value={vnd(stats.thisMonth)}
              icon={CalendarDays}
            />
            <StatTile
              testId="savings-stat-count"
              label={t('savings.count')}
              value={String(stats.count)}
              icon={Receipt}
            />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t('savings.monthlyChart')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                    {/* Ticks show "T10"; the tooltip keeps the full MM/YYYY label. */}
                    <XAxis
                      dataKey="month"
                      tickFormatter={(month: string) => `T${Number(month.slice(0, 2))}`}
                      tickLine={false}
                      axisLine={false}
                      fontSize={12}
                    />
                    <YAxis tickFormatter={vnd} tickLine={false} axisLine={false} fontSize={11} width={86} />
                    <Tooltip formatter={(value) => vnd(Number(value))} />
                    <Bar dataKey="deposited" name={t('savings.deposited')} fill="#16a34a" radius={[7, 7, 7, 7]} barSize={10} />
                    <Bar dataKey="withdrawn" name={t('savings.withdrawn')} fill="#dc2626" radius={[7, 7, 7, 7]} barSize={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-income" />
                  {t('savings.deposited')}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-expense" />
                  {t('savings.withdrawn')}
                </span>
              </div>
            </CardContent>
          </Card>

          {accounts.length > 0 && (
            <>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t('savings.accounts')}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {accounts.map((account) => {
                  const key = accountKey(account.savingsBank)
                  const selected = filter === key
                  return (
                    <div
                      key={key}
                      data-testid={`savings-account-${key}`}
                      className={cn(
                        'grid content-start gap-3 rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-colors hover:border-zinc-300',
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
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                            <Wallet className="h-4 w-4 text-primary" />
                          </span>
                        </div>
                        <div
                          data-testid="savings-balance"
                          className={cn(
                            'text-2xl font-bold tabular-nums',
                            account.balance.amount < 0 && 'text-expense',
                          )}
                        >
                          {formatBalance(account.balance)}
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

          <Card>
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
                      className="flex items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="grid min-w-0 gap-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="whitespace-nowrap text-xs text-muted-foreground">
                            {dayjs(tx.date).format('DD/MM/YYYY')}
                          </span>
                          <span className="truncate font-medium">{tx.content}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs">
                          <span
                            className={cn(
                              'rounded-md px-1.5 py-0.5',
                              tx.savingsBank ? 'bg-teal-50 text-teal-700' : 'bg-zinc-100 italic text-muted-foreground',
                            )}
                          >
                            {accountLabel(tx.savingsBank)}
                          </span>
                          {details && <span className="text-muted-foreground">{details}</span>}
                        </div>
                      </div>
                      <span
                        className={cn(
                          'shrink-0 whitespace-nowrap font-medium tabular-nums',
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
        </>
      )}
      <SavingsGoalDialog account={goalAccount} onClose={() => setGoalAccount(null)} onSaved={() => void load()} />
    </div>
  )
}
