import dayjs from 'dayjs'
import {
  Banknote,
  CalendarCheck,
  Clock,
  CreditCard,
  History,
  Landmark,
  ListOrdered,
  Pencil,
  RefreshCw,
  Smartphone,
  Star,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { AccountResponse, AccountType } from '../api/types'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { useI18n } from '../i18n/I18nContext'
import { hasBalance, isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'

const TYPE_STYLE: Record<AccountType, { icon: LucideIcon; tint: string }> = {
  checking: { icon: Landmark, tint: 'bg-violet-500/10 text-violet-600 dark:text-violet-400' },
  overdraft: { icon: Landmark, tint: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
  credit_card: { icon: CreditCard, tint: 'bg-orange-500/10 text-orange-600 dark:text-orange-400' },
  ewallet: { icon: Smartphone, tint: 'bg-pink-500/10 text-pink-600 dark:text-pink-400' },
  cash: { icon: Banknote, tint: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
}

const iconBtn = 'size-8 rounded-lg text-muted-foreground hover:bg-background hover:text-foreground'

export function AccountCard({
  account,
  onUpdate,
  onHistory,
  onTransactions,
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
  /** Opens the transactions linked to the account (what moved its balance). */
  onTransactions: () => void
  onEdit: () => void
  onDelete: () => void
  /** Makes this the transaction form's preselected pay-with account, or clears it. */
  onToggleDefault: () => void
}) {
  const { t } = useI18n()
  const snap = account.latestSnapshot
  const debt = isDebtType(account.type)
  const limit = account.creditLimit?.amount ?? 0
  const known = hasBalance(account)
  const since = account.transactionsSinceSnapshot
  const owed = account.currentBalance.amount
  const pct = limit > 0 ? Math.min(100, Math.round((owed / limit) * 100)) : 0
  const { icon: TypeIcon, tint } = TYPE_STYLE[account.type] ?? TYPE_STYLE.checking

  return (
    <div
      data-testid={`account-${account.id}`}
      className="grid gap-3 rounded-xl border bg-card p-3 shadow-xs transition-shadow hover:shadow-md sm:p-4"
    >
      <div className="flex items-start gap-3">
        <span aria-hidden className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tint)}>
          <TypeIcon className="size-5" />
        </span>
        {/* The name stays the card's first .font-medium (tests read it that way). */}
        <div className="grid min-w-0 flex-1 gap-1">
          <div className="truncate font-medium leading-tight">{account.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span
              data-testid="account-type"
              className={cn(
                'rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                debt ? 'bg-expense/10 text-expense' : 'bg-income/10 text-income',
              )}
            >
              {t(`accounts.type.${account.type}`)}
            </span>
            {account.lastDigits && <span className="tabular-nums tracking-wide">•••{account.lastDigits}</span>}
            {account.isDefault && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                <Star className="size-3 fill-current" aria-hidden />
                {t('accounts.default')}
              </span>
            )}
          </div>
        </div>
        <div className="grid shrink-0 justify-items-end gap-0.5 text-right">
          {known && (
            <div
              data-testid="current-balance"
              className={cn('text-base font-bold tabular-nums sm:text-lg', debt ? 'text-expense' : 'text-income')}
            >
              {formatMoney(account.currentBalance)}
            </div>
          )}
          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="size-3" aria-hidden />
            {snap ? `${t('accounts.lastUpdated')} ${dayjs(snap.date).format('DD/MM/YYYY')}` : t('accounts.noSnapshot')}
          </div>
          {since > 0 && (
            <button
              type="button"
              data-testid="since-snapshot"
              onClick={onTransactions}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-primary hover:underline"
            >
              + {since} {t('accounts.sinceSnapshot')}
            </button>
          )}
          {account.untrackedDebtRemaining && account.untrackedDebtRemaining.amount > 0 && (
            <div data-testid="untracked-debt" className="text-[11px] text-muted-foreground">
              {t('accounts.untrackedDebtRemaining')}{' '}
              <span className="font-semibold tabular-nums text-expense">{formatMoney(account.untrackedDebtRemaining)}</span>
            </div>
          )}
          {!snap && since > 0 && (
            <div data-testid="not-in-totals" className="text-[11px] text-amber-600 dark:text-amber-400">
              {t('accounts.notInTotals')}
            </div>
          )}
        </div>
      </div>

      {debt && known && limit > 0 && (
        <div className="grid gap-1.5 rounded-lg bg-muted/50 p-2.5">
          <div data-testid="credit-split" className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-expense">
              {t('accounts.owed')} <span className="font-bold tabular-nums">{pct}%</span>
            </span>
            <span className="text-income">
              {t('accounts.available')}{' '}
              <span className="font-bold tabular-nums">
                {formatMoney({ amount: Math.max(0, limit - owed), currency: 'VND' })}
              </span>
            </span>
          </div>
          {/* One bar for the whole limit: rose = owed, emerald = still available. */}
          <CategoryBar
            data-testid="credit-bar"
            values={[Math.min(owed, limit), Math.max(0, limit - owed)]}
            colors={['rose', 'emerald']}
            showLabels={false}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-2 border-t pt-2.5">
        <Button
          variant="outline"
          size="sm"
          className="h-8 min-w-0 gap-1.5 rounded-lg"
          aria-label={`${t('accounts.updateBalance')} ${account.name}`}
          onClick={onUpdate}
        >
          <RefreshCw className="size-3.5" />
          <span className="truncate">{t('accounts.updateBalance')}</span>
        </Button>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconBtn, account.isDefault && 'text-amber-500 hover:text-amber-600 dark:hover:text-amber-400')}
            aria-label={`${t(account.isDefault ? 'accounts.clearDefault' : 'accounts.setDefault')} ${account.name}`}
            aria-pressed={account.isDefault}
            title={t(account.isDefault ? 'accounts.clearDefault' : 'accounts.setDefault')}
            onClick={onToggleDefault}
          >
            <Star className={cn('size-4', account.isDefault && 'fill-current')} />
          </Button>
          {!debt && onCloseMonth && (
            <Button
              variant="ghost"
              size="icon"
              className={iconBtn}
              aria-label={`${t('accounts.closeMonth')} ${account.name}`}
              title={t('accounts.closeMonth')}
              onClick={onCloseMonth}
            >
              <CalendarCheck className="size-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            aria-label={`${t('accounts.viewTransactions')} ${account.name}`}
            title={t('accounts.viewTransactions')}
            onClick={onTransactions}
          >
            <ListOrdered className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            aria-label={`${t('accounts.history')} ${account.name}`}
            title={t('accounts.history')}
            onClick={onHistory}
          >
            <History className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={iconBtn}
            aria-label={`${t('accounts.edit')} ${account.name}`}
            title={t('accounts.edit')}
            onClick={onEdit}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(iconBtn, 'hover:bg-expense/10 hover:text-expense')}
            aria-label={`${t('summary.delete')} ${account.name}`}
            title={t('summary.delete')}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
