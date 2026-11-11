import dayjs from 'dayjs'
import { CalendarCheck, History, Pencil, RefreshCw, Star, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AccountResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'

export function AccountCard({
  account,
  onUpdate,
  onHistory,
  onEdit,
  onDelete,
  onCloseMonth,
  onToggleDefault,
}: {
  account: AccountResponse
  onUpdate: () => void
  /** Money accounts only: record the month's small spending as one transaction. */
  onCloseMonth?: () => void
  onHistory: () => void
  onEdit: () => void
  onDelete: () => void
  /** Makes this the transaction form's preselected pay-with account, or clears it. */
  onToggleDefault: () => void
}) {
  const { t } = useI18n()
  const snap = account.latestSnapshot
  const debt = isDebtType(account.type)
  const limit = account.creditLimit?.amount ?? 0
  const owed = snap?.balance.amount ?? 0
  const pct = limit > 0 ? Math.min(100, Math.round((owed / limit) * 100)) : 0

  return (
    <Card data-testid={`account-${account.id}`}>
      <CardContent className="grid gap-2 p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-medium">{account.name}</div>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <span
                data-testid="account-type"
                className={cn(
                  'rounded px-1.5 py-0.5 font-medium',
                  debt ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income',
                )}
              >
                {t(`accounts.type.${account.type}`)}
              </span>
              {account.lastDigits && <span>•••{account.lastDigits}</span>}
              {account.isDefault && (
                <span className="rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  {t('accounts.default')}
                </span>
              )}
            </div>
          </div>
          {snap && (
            <div className={`text-base font-bold tabular-nums ${debt ? 'text-expense' : 'text-income'}`}>
              {formatMoney(snap.balance)}
            </div>
          )}
        </div>
        {debt && snap && limit > 0 && (
          <div className="grid gap-1">
            {/* One bar for the whole limit: red = owed, green = still available. */}
            <div data-testid="credit-bar" className="flex h-2 overflow-hidden rounded-full bg-income">
              <div className="h-full bg-expense" style={{ width: `${pct}%` }} />
            </div>
            <div data-testid="credit-split" className="flex justify-between gap-2 text-xs">
              <span className="text-expense">
                {t('accounts.owed')} <span className="font-medium tabular-nums">{pct}%</span>
              </span>
              <span className="text-income">
                {t('accounts.available')}{' '}
                <span className="font-medium tabular-nums">
                  {formatMoney({ amount: Math.max(0, limit - owed), currency: 'VND' })}
                </span>
              </span>
            </div>
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          {snap ? `${t('accounts.lastUpdated')} ${dayjs(snap.date).format('DD/MM/YYYY')}` : t('accounts.noSnapshot')}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', account.isDefault ? 'text-amber-500 hover:text-amber-600' : 'text-muted-foreground')}
            aria-label={`${t(account.isDefault ? 'accounts.clearDefault' : 'accounts.setDefault')} ${account.name}`}
            aria-pressed={account.isDefault}
            title={t(account.isDefault ? 'accounts.clearDefault' : 'accounts.setDefault')}
            onClick={onToggleDefault}
          >
            <Star className={cn('h-4 w-4', account.isDefault && 'fill-current')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`${t('accounts.updateBalance')} ${account.name}`}
            onClick={onUpdate}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          {!debt && onCloseMonth && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label={`${t('accounts.closeMonth')} ${account.name}`}
              title={t('accounts.closeMonth')}
              onClick={onCloseMonth}
            >
              <CalendarCheck className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`${t('accounts.history')} ${account.name}`}
            onClick={onHistory}
          >
            <History className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label={`${t('accounts.edit')} ${account.name}`}
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
            aria-label={`${t('summary.delete')} ${account.name}`}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
