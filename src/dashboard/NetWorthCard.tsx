import { Coins, CreditCard, PiggyBank, Wallet, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import type { NetWorth } from '../utils/netWorth'

const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

/** Net worth across every plan, split into where it sits; each part links to its page. */
export function NetWorthCard({ value }: { value: NetWorth }) {
  const { t } = useI18n()
  return (
    <section data-testid="net-worth" className="grid gap-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="grid gap-0.5">
        <span className="text-sm font-semibold">{t('dashboard.netWorth')}</span>
        <strong
          data-testid="net-worth-total"
          className={cn('text-2xl font-bold tabular-nums', value.total < 0 ? 'text-expense' : 'text-foreground')}
        >
          {value.total < 0 ? '−' : ''}
          {vnd(Math.abs(value.total))}
        </strong>
        <span className="text-xs text-muted-foreground">{t('dashboard.netWorthHint')}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Part to="/app/accounts" testId="net-worth-money" icon={Wallet} label={t('dashboard.assetMoney')} amount={value.money} tone="text-income" />
        <Part to="/app/savings" testId="net-worth-savings" icon={PiggyBank} label={t('dashboard.assetSavings')} amount={value.savings} tone="text-income" />
        <Part to="/app/gold" testId="net-worth-gold" icon={Coins} label={t('dashboard.assetGold')} amount={value.gold} tone="text-amber-600 dark:text-amber-400" />
        <Part to="/app/accounts" testId="net-worth-debt" icon={CreditCard} label={t('dashboard.assetDebt')} amount={-value.debt} tone="text-expense" />
      </div>
    </section>
  )
}

function Part({
  to,
  testId,
  icon: Icon,
  label,
  amount,
  tone,
}: {
  to: string
  testId: string
  icon: LucideIcon
  label: string
  amount: number
  tone: string
}) {
  return (
    <Link
      to={to}
      data-testid={testId}
      className="grid min-w-0 gap-1 rounded-xl bg-muted/50 p-3 transition-colors hover:bg-muted"
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
      <span className={cn('truncate text-sm font-bold tabular-nums sm:text-base', tone)}>
        {amount < 0 ? '−' : ''}
        {vnd(Math.abs(amount))}
      </span>
    </Link>
  )
}
