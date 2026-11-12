import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { ArrowDownLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getAccountTransactions } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountTransactionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'

/**
 * The transactions linked to an account (paid with it or into it, every plan), newest first, with
 * what each did to the balance. Rows after the latest reading make up "+ N giao dịch ghi sau đó".
 */
export function AccountTransactionsDialog({ account, onClose }: { account: AccountResponse | null; onClose: () => void }) {
  const { t } = useI18n()
  const [rows, setRows] = useState<AccountTransactionResponse[] | null>(null)
  const accountId = account?.id

  useEffect(() => {
    if (!accountId) return
    let cancelled = false
    setRows(null)
    getAccountTransactions(accountId)
      .then((data) => {
        if (!cancelled) setRows(data)
      })
      .catch((error) => {
        if (cancelled) return
        setRows([])
        toast.error(getApiErrorMessage(error, t('error.network')))
      })
    return () => {
      cancelled = true
    }
  }, [accountId, t])

  // Debt types: "+" owes more, which is bad news; money types: "+" holds more.
  const debt = account ? isDebtType(account.type) : false
  const good = (effect: number) => (debt ? effect < 0 : effect > 0)

  return (
    <Dialog open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.linkedTitle')}: {account?.name}
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-xs text-muted-foreground">{t('accounts.linkedHint')}</p>
        {rows !== null && rows.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('accounts.linkedEmpty')}</p>
        )}
        {rows !== null && rows.length > 0 && (
          <ul className="grid max-h-[60vh] gap-1 overflow-y-auto">
            {rows.map((r) => (
              <li
                key={r.id}
                data-testid={`linked-${r.id}`}
                data-after={r.afterSnapshot}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm',
                  r.afterSnapshot ? 'bg-primary/5 font-medium' : 'text-muted-foreground',
                )}
              >
                <span className="w-12 shrink-0 text-xs tabular-nums">{dayjs(r.date).format('DD/MM')}</span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5">
                  {r.incoming && <ArrowDownLeft className="size-3.5 shrink-0 text-primary" aria-hidden />}
                  <span className="truncate">{r.content}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 tabular-nums',
                    r.afterSnapshot && (good(r.effect.amount) ? 'text-income' : 'text-expense'),
                  )}
                >
                  {r.effect.amount > 0 ? '+' : r.effect.amount < 0 ? '−' : ''}
                  {formatMoney({ amount: Math.abs(r.effect.amount), currency: r.effect.currency })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
