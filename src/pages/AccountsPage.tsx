import { useCallback, useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
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
import { toTransactionPayload } from '../utils/transactionPayload'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { AccountCard } from '../accounts/AccountCard'
import { AccountsOverview } from '../accounts/AccountsOverview'
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

      {banks.map((bg) => (
        <section
          key={bg.bankName ?? ''}
          data-testid={`bank-section-${bg.bankName ?? 'none'}`}
          className="grid gap-3 rounded-xl border bg-muted/30 p-3 sm:p-4"
        >
          {/* Parent level: the bank; its payment accounts, overdraft and cards sit inside. */}
          <div data-testid="bank-header" className="flex items-center gap-3 border-b pb-3">
            <BankBadge name={bg.bankName} />
            <h2 className="min-w-0 flex-1 truncate text-lg font-bold">{bg.bankName ?? t('accounts.noBank')}</h2>
            <div className="grid justify-items-end text-sm font-bold tabular-nums">
              {(bg.money > 0 || bg.debt === 0) && (
                <span data-testid="bank-money" className="text-income">
                  {vnd(bg.money)}
                </span>
              )}
              {bg.debt > 0 && (
                <span data-testid="bank-debt" className="text-expense">
                  −{vnd(bg.debt)}
                </span>
              )}
            </div>
          </div>
          <div className="grid gap-2">{bg.accounts.map(renderCard)}</div>
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
