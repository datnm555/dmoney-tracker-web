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
import { deleteAccount, getAccounts, updateSnapshot } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { AccountCard } from '../accounts/AccountCard'
import { AccountDialog } from '../accounts/AccountDialog'
import { SnapshotDialog } from '../accounts/SnapshotDialog'
import { SnapshotHistoryDialog } from '../accounts/SnapshotHistoryDialog'
import { useI18n } from '../i18n/I18nContext'
import { availableCredit, cashTotal, debtTotal, monthlyInterest, upcomingDues } from '../utils/accounts'
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

export function AccountsPage() {
  const { t } = useI18n()
  const [accounts, setAccounts] = useState<AccountResponse[]>([])
  const [loaded, setLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<AccountResponse | null>(null)
  const [snapAccount, setSnapAccount] = useState<AccountResponse | null>(null)
  const [snapEditing, setSnapEditing] = useState<AccountSnapshotResponse | null>(null)
  const [historyAccount, setHistoryAccount] = useState<AccountResponse | null>(null)
  const [historyKey, setHistoryKey] = useState(0)
  const [deleting, setDeleting] = useState<AccountResponse | null>(null)

  const load = useCallback(async () => {
    try {
      setAccounts(await getAccounts())
    } catch (error) {
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

  const markPaid = async (account: AccountResponse) => {
    const s = account.latestSnapshot
    if (!s) return
    try {
      await updateSnapshot(s.id, {
        date: s.date,
        balance: s.balance.amount,
        statementAmount: s.statementAmount?.amount ?? null,
        dueDate: s.dueDate,
        installmentRemaining: s.installmentRemaining?.amount ?? null,
        note: s.note,
        statementPaid: true,
      })
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
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

  const groups: { title: string; items: AccountResponse[] }[] = [
    { title: t('accounts.groupMoney'), items: accounts.filter((a) => ['checking', 'ewallet', 'cash'].includes(a.type)) },
    { title: t('accounts.groupOverdraft'), items: accounts.filter((a) => a.type === 'overdraft') },
    { title: t('accounts.groupCredit'), items: accounts.filter((a) => a.type === 'credit_card') },
  ].filter((g) => g.items.length > 0)

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
                    {d.daysLeft === 0
                      ? t('accounts.dueToday')
                      : `${t('accounts.left')} ${d.daysLeft} ${t('accounts.days')}`}
                    {' · '}
                    {dayjs(d.dueDate).format('DD/MM/YYYY')}
                  </div>
                </div>
                <span className="font-bold tabular-nums">{vnd(d.amount)}</span>
                <Button size="sm" variant="outline" onClick={() => void markPaid(d.account)}>
                  {t('accounts.markPaid')}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {loaded && accounts.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">{t('accounts.empty')}</CardContent>
        </Card>
      )}

      {groups.map((g) => (
        <section key={g.title} className="grid gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {g.items.map((a) => (
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
              />
            ))}
          </div>
        </section>
      ))}

      <AccountDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
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
