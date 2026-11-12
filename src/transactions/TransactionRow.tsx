import type { CSSProperties, ReactNode } from 'react'
import dayjs from 'dayjs'
import {
  ArrowRight,
  Banknote,
  Coins,
  CornerDownRight,
  CreditCard,
  EyeOff,
  Hourglass,
  Landmark,
  Pencil,
  PiggyBank,
  Quote,
  Tags,
  Trash2,
  UserRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { TransactionResponse } from '../api/types'
import { bankBrand } from '../banks/bankBrand'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { useI18n } from '../i18n/I18nContext'
import { withAlpha } from '../utils/color'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'
import { paymentMethodChipLabel } from '../utils/paymentLabel'

interface Props {
  tx: TransactionResponse
  onEdit: (tx: TransactionResponse) => void
  onDelete: (tx: TransactionResponse) => void
  /** Account id → name: the row shows the account it moved instead of the bare bank. */
  accountNames?: Record<string, string>
}

const PAYMENT_STYLE: Record<string, { icon: LucideIcon; tint: string }> = {
  transfer: { icon: Landmark, tint: 'bg-violet-500/10 text-violet-700 dark:text-violet-300' },
  cash: { icon: Banknote, tint: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' },
  card: { icon: CreditCard, tint: 'bg-orange-500/10 text-orange-700 dark:text-orange-300' },
}

/**
 * One transaction in a day card: category-tinted icon tile and accent, a
 * coloured amount pill, iconed meta chips, the note and any linked rows.
 */
export function TransactionRow({ tx, onEdit, onDelete, accountNames }: Props) {
  const { t } = useI18n()
  const { label: categoryLabel, visual: categoryVisual } = useCategoryDisplay()
  const isIncome = tx.credit.amount > 0
  const v = categoryVisual(tx.categoryId)
  const payment = PAYMENT_STYLE[tx.paymentMethod] ?? PAYMENT_STYLE.transfer
  const accountName = tx.accountId ? accountNames?.[tx.accountId] : undefined
  const toAccountName = tx.toAccountId ? accountNames?.[tx.toAccountId] : undefined
  // Category colour drives the accent bar, hover wash and icon tile.
  const catStyle = {
    '--cat': v.hex,
    '--cat-wash': withAlpha(v.hex, 0.06),
  } as CSSProperties

  return (
    <div
      data-testid="transaction-row"
      style={catStyle}
      className="group relative transition-colors duration-200 hover:bg-(--cat-wash) focus-within:bg-(--cat-wash)"
    >
      <span
        aria-hidden
        className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-(--cat) opacity-40 transition-all duration-200 group-hover:inset-y-1.5 group-hover:opacity-100"
      />
      <div className="relative flex items-center gap-3 py-3 pl-5 pr-4">
        <span
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl shadow-sm transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105"
          style={{
            backgroundImage: `linear-gradient(135deg, ${withAlpha(v.hex, 0.24)}, ${withAlpha(v.hex, 0.06)})`,
            boxShadow: `inset 0 0 0 1px ${withAlpha(v.hex, 0.25)}`,
          }}
        >
          <v.icon className="size-5" style={{ color: v.hex }} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <span className="truncate font-semibold">{tx.content}</span>
            <span
              className={cn(
                'shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold tabular-nums ring-1 ring-inset sm:text-base',
                isIncome
                  ? 'bg-emerald-500/10 text-income ring-emerald-500/20 dark:text-emerald-400'
                  : 'bg-rose-500/10 text-expense ring-rose-500/20 dark:text-rose-400',
              )}
            >
              {isIncome ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px] font-medium">
            {tx.categoryId && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                style={{ backgroundColor: withAlpha(v.hex, 0.12), color: v.hex }}
              >
                <span aria-hidden className="size-1.5 rounded-full bg-(--cat)" />
                {categoryLabel(tx.categoryId)}
              </span>
            )}
            {tx.subCategoryName && (
              <Chip icon={Tags} className="bg-muted text-foreground/70">
                {tx.subCategoryName}
              </Chip>
            )}
            {tx.beneficiaryName && (
              <Chip icon={UserRound} className="bg-sky-500/10 text-sky-700 dark:text-sky-300">
                {tx.beneficiaryName}
              </Chip>
            )}
            {tx.goldQuantity !== null && (
              <Chip icon={Coins} className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {formatGoldQuantity(tx.goldQuantity)} {t('gold.unit')}
                {tx.goldTypeName ? ` · ${tx.goldTypeName}` : ''}
              </Chip>
            )}
            {tx.bank ? (
              <BankChip bank={tx.bank} label={accountName ?? tx.bank} />
            ) : (
              accountName && (
                <Chip icon={Wallet} className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  {accountName}
                </Chip>
              )
            )}
            {toAccountName && (
              <Chip icon={ArrowRight} className="bg-primary/10 text-primary">
                {toAccountName}
              </Chip>
            )}
            <Chip icon={payment.icon} className={payment.tint}>
              {paymentMethodChipLabel(tx, t)}
            </Chip>
            {tx.savingsBank && (
              <Chip icon={PiggyBank} className="bg-teal-500/10 text-teal-700 dark:text-teal-300">
                → {tx.savingsBank}
              </Chip>
            )}
            {tx.isAdvance && (
              <Chip icon={Hourglass} className="bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {t('form.isAdvance')}
              </Chip>
            )}
            {tx.excludedFromStats && (
              <Chip icon={EyeOff} className="border border-dashed text-muted-foreground">
                {t('summary.excludedBadge')}
              </Chip>
            )}
          </div>

          {tx.note && (
            <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-xs italic text-muted-foreground">
              <Quote aria-hidden className="size-3 shrink-0 text-(--cat) opacity-70" />
              <span className="truncate">
                {t('form.note')}: {tx.note}
              </span>
            </div>
          )}
        </div>

        {/* sm+: float over the row's right edge on hover so the amount sits flush right. */}
        <div className="flex shrink-0 items-center gap-0.5 transition-all duration-200 sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-1 sm:rounded-xl sm:bg-card sm:p-0.5 sm:opacity-0 sm:shadow-md sm:ring-1 sm:ring-border sm:group-focus-within:translate-x-0 sm:group-focus-within:opacity-100 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label={`${t('summary.edit')} ${tx.content}`}
            onClick={() => onEdit(tx)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
            aria-label={`${t('summary.delete')} ${tx.content}`}
            onClick={() => onDelete(tx)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {tx.links && tx.links.length > 0 && (
        <div className="grid gap-1.5 pb-3 pl-[5rem] pr-4">
          {tx.links.map((l) => {
            const linkIncome = l.credit.amount > 0
            return (
              <div
                key={`${l.relation}-${l.id}`}
                className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/40 px-3 py-2 text-xs transition-colors hover:border-solid hover:bg-muted/70"
              >
                <CornerDownRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-(--cat)" />
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">
                  {t(`links.${l.relation}`)}
                </span>
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {dayjs(l.date).format('DD/MM/YYYY')} · {l.content}
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-md px-1.5 py-0.5 font-semibold tabular-nums',
                    linkIncome
                      ? 'bg-emerald-500/10 text-income dark:text-emerald-400'
                      : 'bg-rose-500/10 text-expense dark:text-rose-400',
                  )}
                >
                  {linkIncome ? `+${formatMoney(l.credit)}` : `−${formatMoney(l.debit)}`}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Small tinted meta chip with a leading icon; text stays a direct child so it reads as one label. */
function Chip({ icon: Icon, className, children }: { icon: LucideIcon; className: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', className)}>
      <Icon aria-hidden className="size-3 shrink-0" />
      {children}
    </span>
  )
}

/** Source bank chip with the bank's brand mark, labelled with the account when it is linked. */
function BankChip({ bank, label }: { bank: string; label: string }) {
  const brand = bankBrand(bank)
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full py-0.5 pl-0.5 pr-2"
      style={{ backgroundColor: withAlpha(brand.color, 0.1) }}
    >
      <span
        aria-hidden
        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[8px] font-bold leading-none text-white"
        style={{ backgroundColor: brand.color }}
      >
        {brand.short}
      </span>
      <span className="text-foreground/80">{label}</span>
    </span>
  )
}
