import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { CalendarClock, Check, Plus } from 'lucide-react'
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
import { clearDefaultAccount, createSnapshot, deleteAccount, getAccounts, setDefaultAccount } from '../api/accountApi'
import { createTransaction, deleteTransaction } from '../api/transactionApi'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { TransactionFormValues } from '../components/TransactionFormModal'
import { usePlans } from '../plans/PlanContext'
import { payWithFields } from '../utils/payWith'
import { cardPaymentPrefill } from '../utils/cardPayment'
import { toTransactionPayload } from '../utils/transactionPayload'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { AccountCard } from '../accounts/AccountCard'
import { AccountsOverview } from '../accounts/AccountsOverview'
import { bankBrand } from '../banks/bankBrand'
import { AccountDialog } from '../accounts/AccountDialog'
import { CloseMonthDialog } from '../accounts/CloseMonthDialog'
import type { CloseMonthResult } from '../accounts/CloseMonthDialog'
import { AccountTransactionsDialog } from '../accounts/AccountTransactionsDialog'
import { SnapshotDialog } from '../accounts/SnapshotDialog'
import { SnapshotHistoryDialog } from '../accounts/SnapshotHistoryDialog'
import { useI18n } from '../i18n/I18nContext'
import { availableCredit, cashTotal, debtTotal, groupByBank, monthlyInterest, upcomingDues } from '../utils/accounts'
import { formatMoney } from '../utils/money'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

function BankBadge({ name }: { name: string | null }) {
  const brand = bankBrand(name)
  return (
    <span
      aria-hidden
      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white shadow-sm ring-1 ring-black/5"
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
  const [linkedAccount, setLinkedAccount] = useState<AccountResponse | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  // Card whose statement is being paid: a transaction into the card (no reading is written).
  const [paying, setPaying] = useState<{ account: AccountResponse; amount: number } | null>(null)
  const [payBusy, setPayBusy] = useState(false)
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
        // The closed account itself, even when another account at the bank has the same payment fields.
        payWithAccountId: closeResult.account.id,
      }
    : undefined

  const payPrefill: Partial<TransactionFormValues> | undefined = paying
    ? cardPaymentPrefill(
        paying.account,
        paying.amount,
        paying.account.latestSnapshot?.statementUntracked ?? false,
        t('recurring.cardRow'),
        dayjs().format('YYYY-MM-DD'),
      )
    : undefined

  const submitPay = async (values: TransactionFormValues) => {
    if (!selectedPlanId) return
    setPayBusy(true)
    try {
      await createTransaction(toTransactionPayload(values, selectedPlanId))
      setPaying(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setPayBusy(false)
    }
    await load()
  }

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

  const banks = useMemo(() => groupByBank(accounts), [accounts])

  const toggleDefault = async (a: AccountResponse) => {
    try {
      await (a.isDefault ? clearDefaultAccount(a.id) : setDefaultAccount(a.id))
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const renderCard = (a: AccountResponse) => (
    <AccountCard
      key={a.id}
      account={a}
      onUpdate={() => {
        setSnapEditing(null)
        setSnapAccount(a)
      }}
      onHistory={() => setHistoryAccount(a)}
      onTransactions={() => setLinkedAccount(a)}
      onEdit={() => {
        setEditing(a)
        setFormOpen(true)
      }}
      onDelete={() => setDeleting(a)}
      onToggleDefault={() => void toggleDefault(a)}
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
      <AccountsOverview
        cash={cashTotal(accounts)}
        debt={debt}
        available={availableCredit(accounts)}
        interest={interest}
      />
      )}

      {dues.length > 0 && (
        <section className="grid gap-3 rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <CalendarClock className="size-4" />
            </span>
            <h2 className="flex-1 text-sm font-semibold">{t('accounts.upcoming')}</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
              {dues.length}
            </span>
          </div>
          <ul className="grid gap-2">
            {dues.map((d) => {
              const date = dayjs(d.dueDate)
              return (
                <li
                  key={d.account.id}
                  data-testid={`due-${d.account.id}`}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-2.5 sm:p-3',
                    d.urgent
                      ? 'border-rose-500/30 bg-rose-500/[0.06]'
                      : 'border-amber-500/30 bg-amber-500/[0.06]',
                  )}
                >
                  <div
                    className={cn(
                      'flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 leading-none',
                      d.urgent
                        ? 'bg-rose-500 text-white shadow-sm'
                        : 'bg-amber-400 text-amber-950 shadow-sm',
                    )}
                  >
                    <span className="text-lg font-bold tabular-nums">{date.format('DD')}</span>
                    <span className="mt-0.5 text-[10px] tabular-nums opacity-80">{date.format('MM/YYYY')}</span>
                  </div>
                  <div className="grid min-w-0 flex-1 gap-0.5">
                    <div className="truncate text-sm font-medium">
                      {d.account.name}
                      {d.account.lastDigits && (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">•••{d.account.lastDigits}</span>
                      )}
                    </div>
                    <div
                      className={cn(
                        'text-xs font-medium',
                        d.urgent ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400',
                      )}
                    >
                      {d.daysLeft < 0
                        ? `${t('accounts.overdue')} ${-d.daysLeft} ${t('accounts.days')}`
                        : d.daysLeft === 0
                          ? t('accounts.dueToday')
                          : `${t('accounts.left')} ${d.daysLeft} ${t('accounts.days')}`}
                    </div>
                  </div>
                  <div className="grid shrink-0 justify-items-end gap-1.5">
                    <span className="text-base font-bold tabular-nums text-expense">{vnd(d.amount)}</span>
                    <Button size="sm" variant="outline" className="h-7 rounded-lg px-2.5 text-xs" disabled={!selectedPlanId} onClick={() => setPaying({ account: d.account, amount: d.amount })}>
                      <Check className="size-3.5" />
                      {t('accounts.markPaid')}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {loaded && !loadError && accounts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('accounts.empty')}</CardContent>
        </Card>
      )}

      {banks.map((bg) => {
        const brand = bankBrand(bg.bankName)
        return (
          <section
            key={bg.bankName ?? ''}
            data-testid={`bank-section-${bg.bankName ?? 'none'}`}
            className="overflow-hidden rounded-2xl border bg-card shadow-sm"
          >
            {/* Parent level: the bank; its payment accounts, overdraft and cards sit inside. */}
            <div
              data-testid="bank-header"
              className="flex flex-wrap items-center gap-3 border-b px-3 py-3 sm:px-4"
              style={{ backgroundImage: `linear-gradient(90deg, ${brand.color}1f, transparent 70%)` }}
            >
              <BankBadge name={bg.bankName} />
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-base font-bold">{bg.bankName ?? t('accounts.noBank')}</h2>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5 text-xs font-semibold tabular-nums">
                {(bg.money > 0 || bg.debt === 0) && (
                  <span data-testid="bank-money" className="rounded-full bg-income/10 px-2.5 py-1 text-income ring-1 ring-income/20">
                    {vnd(bg.money)}
                  </span>
                )}
                {bg.debt > 0 && (
                  <span data-testid="bank-debt" className="rounded-full bg-expense/10 px-2.5 py-1 text-expense ring-1 ring-expense/20">
                    −{vnd(bg.debt)}
                  </span>
                )}
              </div>
            </div>
            <div className="grid gap-2.5 bg-muted/20 p-3 sm:p-4">{bg.accounts.map(renderCard)}</div>
          </section>
        )
      })}

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
      <TransactionFormModal
        open={paying !== null}
        editing={null}
        submitting={payBusy}
        prefill={payPrefill}
        onSubmit={(values) => void submitPay(values)}
        onCancel={() => setPaying(null)}
      />
      <AccountTransactionsDialog account={linkedAccount} onClose={() => setLinkedAccount(null)} />
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
