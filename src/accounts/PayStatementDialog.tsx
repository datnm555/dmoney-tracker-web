import { useEffect, useState, type ReactNode } from 'react'
import { Banknote, CircleCheck, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogSectionLabel,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { payStatement } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountType } from '../api/types'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { hasBalance, isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber, toDigits } from './moneyDigits'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

const TYPE_ICON: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  overdraft: Landmark,
  credit_card: CreditCard,
  ewallet: Smartphone,
  cash: Banknote,
}

/** "Đã trả" for a card statement: lowers the card's debt and moves the paying account's balance. */
export function PayStatementDialog({
  card,
  accounts,
  today,
  onClose,
  onSaved,
}: {
  card: AccountResponse | null
  accounts: AccountResponse[]
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [digits, setDigits] = useState('')
  const [date, setDate] = useState(today)
  const [fromId, setFromId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!card) return
    setDigits(toDigits(card.latestSnapshot?.statementAmount?.amount))
    setDate(today)
    setFromId('')
  }, [card, today])

  const sources = accounts.filter((a) => a.id !== card?.id)

  const submit = async () => {
    if (!card) return
    const amount = digitsToNumber(digits)
    if (amount === null || amount <= 0 || !date) return
    setSaving(true)
    try {
      await payStatement(card.id, { date, amount, fromAccountId: fromId || null })
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSaving(false)
      onSaved()
    }
  }

  return (
    <Dialog open={card !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.markPaid')}: {card?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <MoneyInput
            id="pay-amount"
            label={t('recurring.amount')}
            digits={digits}
            onChange={setDigits}
            variant="hero"
            tone="expense"
          />
          <div className="grid gap-2">
            <DialogSectionLabel id="pay-from-label">{t('accounts.payFrom')}</DialogSectionLabel>
            <div id="pay-from" role="radiogroup" aria-labelledby="pay-from-label" className="grid grid-cols-2 gap-2">
              <SourceTile selected={fromId === ''} onSelect={() => setFromId('')}>
                <span className="truncate text-muted-foreground">{t('accounts.payFromNone')}</span>
              </SourceTile>
              {sources.map((a) => {
                const Icon = TYPE_ICON[a.type] ?? Landmark
                const balance = hasBalance(a) ? a.currentBalance : null
                return (
                  <SourceTile key={a.id} selected={fromId === a.id} onSelect={() => setFromId(a.id)}>
                    <span className="flex min-w-0 items-center gap-1.5">
                      <Icon
                        className={cn('h-3.5 w-3.5 shrink-0', isDebtType(a.type) ? 'text-expense' : 'text-income')}
                        aria-hidden
                      />
                      <span className="truncate">
                        {a.name}
                        {a.lastDigits ? ` •••${a.lastDigits}` : ''}
                      </span>
                    </span>
                    {balance && (
                      <span
                        className={cn(
                          'text-[11px] font-normal tabular-nums',
                          isDebtType(a.type) ? 'text-expense' : 'text-muted-foreground',
                        )}
                      >
                        {formatMoney(balance)}
                      </span>
                    )}
                  </SourceTile>
                )
              })}
            </div>
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label htmlFor="pay-date" className={SECTION_LABEL}>
              {t('recurring.paidOn')}
            </Label>
            <Input id="pay-date" type="date" className="rounded-xl" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button disabled={saving || (digitsToNumber(digits) ?? 0) <= 0 || !date} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SourceTile({ selected, onSelect, children }: { selected: boolean; onSelect: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'relative grid min-w-0 content-center gap-0.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors',
        selected ? 'bg-primary/10 text-primary ring-2 ring-primary' : 'bg-muted/60 hover:bg-muted',
      )}
    >
      {selected && (
        <CircleCheck className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-background fill-primary text-primary-foreground" />
      )}
      {children}
    </button>
  )
}
