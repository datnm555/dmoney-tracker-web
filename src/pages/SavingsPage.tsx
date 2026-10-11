import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { PiggyBank, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { getSavingsSummary } from '../api/savingsApi'
import type { MoneyResponse, SavingsSummaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'

// Select values: 'all', the unassigned bucket sentinel, or an account name.
const ALL = 'all'
const UNASSIGNED = '__unassigned__'

const accountKey = (savingsBank: string | null) => savingsBank ?? UNASSIGNED

/** Balances can go negative (withdrew more than recorded deposits): show "−" + abs, never "+-". */
function formatBalance(money: MoneyResponse): string {
  return money.amount < 0 ? `−${formatMoney({ ...money, amount: -money.amount })}` : formatMoney(money)
}

export function SavingsPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<SavingsSummaryResponse | null>(null)
  const [filter, setFilter] = useState<string>(ALL)

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

  const accountLabel = (savingsBank: string | null) => savingsBank ?? t('savings.unassigned')

  const visibleTransactions = useMemo(
    () => (filter === ALL ? transactions : transactions.filter((tx) => accountKey(tx.savingsBank) === filter)),
    [transactions, filter],
  )

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">{t('savings.title')}</h1>

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
                    <button
                      key={key}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setFilter(selected ? ALL : key)}
                      className={cn(
                        'grid gap-3 rounded-lg border bg-card p-4 text-left text-card-foreground shadow-sm transition-colors hover:border-zinc-300',
                        selected && 'border-primary ring-1 ring-primary/30 hover:border-primary',
                      )}
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
    </div>
  )
}
