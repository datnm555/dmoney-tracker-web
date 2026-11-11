import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { CreditCard, Landmark, Plus, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { createSnapshot, deleteAccount, getAccounts } from '../api/accountApi'
import { createTransaction, deleteTransaction } from '../api/transactionApi'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { usePlans } from '../plans/PlanContext'
import { payWithFields } from '../utils/payWith'
import { toTransactionPayload } from '../utils/transactionPayload'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { AccountCard } from '../accounts/AccountCard'
import { bankBrand } from '../banks/bankBrand'
import { AccountDialog } from '../accounts/AccountDialog'
import { CloseMonthDialog } from '../accounts/CloseMonthDialog'
import type { CloseMonthResult } from '../accounts/CloseMonthDialog'
import { PayStatementDialog } from '../accounts/PayStatementDialog'
import { SnapshotDialog } from '../accounts/SnapshotDialog'
import { SnapshotHistoryDialog } from '../accounts/SnapshotHistoryDialog'
import { useI18n } from '../i18n/I18nContext'
import { availableCredit, cashTotal, debtTotal, groupByBank, monthlyInterest, upcomingDues } from '../utils/accounts'
import { formatMoney } from '../utils/money'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

function Tile({
  testId,
  label,
  value,
  sub,
  icon: Icon,
  valueClass,
}: {
  testId: string
  label: string
  value: string
  sub?: string
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
        {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  )
}

function BankBadge({ name }: { name: string | null }) {
  const brand = bankBrand(name)
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: brand.color }}
    >
      {brand.short}
    </span>
  )
}

export function AccountsPage() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccountResponse | null>(null)
  const [snapAccount, setSnapAccount] = useState<AccountResponse | null>(null)
  const [snapEditing, setSnapEditing] = useState<AccountSnapshotResponse | null>(null)
  const [historyAccount, setHistoryAccount] = useState<AccountResponse | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [paying, setPaying] = useState<AccountResponse | null>(null)
  const [closingAccount, setClosingAccount] = useState<AccountResponse | null>(null)
  const [closeResult, setCloseResult] = useState<CloseMonthResult | null>(null)
  const [closeBusy, setCloseBusy] = useState(false)
  const { selectedPlanId } = usePlans()
  const [deleting, setDeleting] = useState<AccountResponse | null>(null)

  const load = useCallback(async () => {
    try {
      setAccounts(await getAccounts())
      setLoadError(false)
    } catch (error) {
      setLoadError(true)
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setLoaded(true)
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const dues = useMemo(() => upcomingDues(accounts, dayjs().format('YYYY-MM-DD')), [accounts])
  const interest = useMemo(() => accounts.reduce((s, a) => s + monthlyInterest(a), 0), [accounts])
  const debt = debtTotal(accounts)

  const closingSnapshot = (date: string, balance: number) => ({
    date,
    balance,
    statementAmount: null,
    dueDate: null,
    installmentRemaining: null,
    statementPaid: false,
    note: null,
    statementUntracked: false,
  })

  const refreshAfterClose = async () => {
    setHistoryKey((k) => k + 1)
    await load()
  }

  // Nothing changed hands: just record the closing balance. Otherwise confirm the combined transaction first.
  const continueClose = async (result: CloseMonthResult) => {
    setClosingAccount(null)
    if (result.net !== 0) {
      setCloseResult(result)
      return
    }
    setCloseBusy(true)
    try {
      await createSnapshot(result.account.id, closingSnapshot(result.date, result.closing))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setCloseBusy(false)
    }
    await refreshAfterClose()
  }

  const submitClose = async (values: TransactionFormValues) => {
    const result = closeResult
    if (!result || !selectedPlanId) return
    setCloseBusy(true)
    let transactionId: string
    try {
      transactionId = (await createTransaction(toTransactionPayload(values, selectedPlanId))).id
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
      setCloseBusy(false)
      return
    }
    // The transaction exists now: close the form either way so a retry cannot duplicate it.
    setCloseResult(null)
    try {
      await createSnapshot(result.account.id, closingSnapshot(result.date, result.closing))
    } catch (error) {
      // Compensate so the combined transaction never exists without its closing balance.
      try {
        await deleteTransaction(transactionId)
      } catch {
        // The reload below shows the real state.
      }
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setCloseBusy(false)
    }
    await refreshAfterClose()
  }

  const closePrefill: Partial<TransactionFormValues> | undefined = closeResult
    ? {
        content: `${t('accounts.closeContent')} ${closeResult.account.name} ${dayjs(closeResult.date).format('MM/YYYY')}`,
        type: closeResult.net > 0 ? 'out' : 'in',
        amount: Math.abs(closeResult.net),
        date: closeResult.date,
        paymentMethod: payWithFields(closeResult.account).paymentMethod,
        bank: payWithFields(closeResult.account).bank,
      }
    : undefined

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deleteAccount(deleting.id)
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const groups: {
    key: string
    title: string
    icon: LucideIcon
    items: AccountResponse[]
    byBank: boolean
    debt: boolean
  }[] = [
    {
      key: 'money',
      title: t('accounts.groupMoney'),
      icon: Wallet,
      items: accounts.filter((a) => ['checking', 'ewallet', 'cash'].includes(a.type)),
      byBank: true,
      debt: false,
    },
    {
      key: 'overdraft',
      title: t('accounts.groupOverdraft'),
      icon: Landmark,
      items: accounts.filter((a) => a.type === 'overdraft'),
      byBank: true,
      debt: true,
    },
    {
      key: 'credit',
      title: t('accounts.groupCredit'),
      icon: CreditCard,
      items: accounts.filter((a) => a.type === 'credit_card'),
      byBank: true,
      debt: true,
    },
  ].filter((g) => g.items.length > 0)

  const renderCard = (a: AccountResponse) => (
    <AccountCard
      key={a.id}
      account={a}
      onUpdate={() => {
        setSnapEditing(null)
        setSnapAccount(a)
      }}
      onHistory={() => setHistoryAccount(a)}
      onEdit={() => {
        setEditing(a)
        setFormOpen(true)
      }}
      onDelete={() => setDeleting(a)}
      onCloseMonth={() => setClosingAccount(a)}
    />
  )

  return (
    <div className="grid gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('accounts.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('accounts.hint')}</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t('accounts.add')}
        </Button>
      </div>

      {loadError && accounts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('error.network')}</CardContent>
        </Card>
      )}

      {!(loadError && accounts.length === 0) && (
      <div className="grid gap-3 sm:grid-cols-3">
        <Tile testId="tile-cash" label={t('accounts.cashTotal')} value={vnd(cashTotal(accounts))} icon={Wallet} valueClass="text-income" />
        <Tile
          testId="tile-debt"
          label={t('accounts.debtTotal')}
          value={vnd(debt)}
          sub={interest > 0 ? `${t('accounts.monthlyInterest')}: ${vnd(interest)}` : undefined}
          icon={CreditCard}
          valueClass="text-expense"
        />
        <Tile testId="tile-available" label={t('accounts.availableCredit')} value={vnd(availableCredit(accounts))} icon={Landmark} />
      </div>
      )}

      {dues.length > 0 && (
        <Card>
          <CardContent className="grid gap-2 p-3 sm:p-4">
            <div className="text-sm font-medium">{t('accounts.upcoming')}</div>
            {dues.map((d) => (
              <div
                key={d.account.id}
                data-testid={`due-${d.account.id}`}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm',
                  d.urgent && 'border-expense/40 bg-expense/5 text-expense',
                )}
              >
                <div className="min-w-0">
                  <div className="truncate font-medium">
                    {d.account.name}
                    {d.account.lastDigits && <span className="ml-1 text-xs font-normal">•••{d.account.lastDigits}</span>}
                  </div>
                  <div className="text-xs">
                    {d.daysLeft < 0
                      ? `${t('accounts.overdue')} ${-d.daysLeft} ${t('accounts.days')}`
                      : d.daysLeft === 0
                        ? t('accounts.dueToday')
                        : `${t('accounts.left')} ${d.daysLeft} ${t('accounts.days')}`}
                    {' · '}
                    {dayjs(d.dueDate).format('DD/MM/YYYY')}
                  </div>
                </div>
                <span className="font-bold tabular-nums">{vnd(d.amount)}</span>
                <Button size="sm" variant="outline" onClick={() => setPaying(d.account)}>
                  {t('accounts.markPaid')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loaded && !loadError && accounts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('accounts.empty')}</CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <section
          key={g.key}
          data-testid={`group-${g.key}`}
          className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:p-4"
        >
          {/* Parent level: account type (payment accounts / overdraft / credit cards) with its total. */}
          <div className="flex items-center gap-3 border-b pb-3">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                g.debt ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income',
              )}
            >
              <g.icon className="h-5 w-5" />
            </span>
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{g.title}</h2>
            <span
              data-testid="group-total"
              className={cn('text-lg font-bold tabular-nums', g.debt ? 'text-expense' : 'text-income')}
            >
              {vnd(g.items.reduce((s, a) => s + (a.latestSnapshot?.balance.amount ?? 0), 0))}
            </span>
          </div>
          {g.byBank ? (
            groupByBank(g.items).map((bg) => (
              <div key={bg.bankName ?? ''} data-testid={`bank-section-${g.key}-${bg.bankName ?? 'none'}`} className="grid gap-2">
                <div data-testid="bank-header" className="flex items-center gap-3 pt-1">
                  <BankBadge name={bg.bankName} />
                  <span className="min-w-0 flex-1 truncate text-base font-semibold">
                    {bg.bankName ?? t('accounts.noBank')}
                  </span>
                  <span
                    data-testid="bank-total"
                    className={cn('text-base font-bold tabular-nums', g.debt ? 'text-expense' : 'text-foreground')}
                  >
                    {vnd(bg.total)}
                  </span>
                </div>
                <div className="grid gap-2">{bg.accounts.map(renderCard)}</div>
              </div>
            ))
          ) : (
            <div className="grid gap-2">{g.items.map(renderCard)}</div>
          )}
        </section>
      ))}

      <AccountDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
      <CloseMonthDialog
        account={closingAccount}
        today={dayjs().format('YYYY-MM-DD')}
        busy={closeBusy}
        onClose={() => setClosingAccount(null)}
        onContinue={(r) => void continueClose(r)}
      />
      <TransactionFormModal
        open={closeResult !== null}
        editing={null}
        submitting={closeBusy}
        prefill={closePrefill}
        onSubmit={(values) => void submitClose(values)}
        onCancel={() => setCloseResult(null)}
      />
      <PayStatementDialog
        card={paying}
        accounts={accounts}
        today={dayjs().format('YYYY-MM-DD')}
        onClose={() => setPaying(null)}
        onSaved={() => {
          setHistoryKey((k) => k + 1)
          void load()
        }}
      />
      <SnapshotDialog
        account={snapAccount}
        editing={snapEditing}
        onClose={() => setSnapAccount(null)}
        onSaved={() => {
          setHistoryKey((k) => k + 1)
          void load()
        }}
      />
      <SnapshotHistoryDialog
        account={snapAccount ? null : historyAccount}
        refreshKey={historyKey}
        onClose={() => setHistoryAccount(null)}
        onEdit={(s) => {
          setSnapEditing(s)
          setSnapAccount(historyAccount)
        }}
        onChanged={() => void load()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accounts.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitDelete()}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
