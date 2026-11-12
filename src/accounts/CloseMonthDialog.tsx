import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { AccountResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { closeMonthNet } from '../utils/accounts'
import { formatMoney } from '../utils/money'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber } from './moneyDigits'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

export interface CloseMonthResult {
  account: AccountResponse
  date: string
  closing: number
  /** Spent (> 0) or received (< 0) during the period. */
  net: number
}

/** Step 1 of "Chốt tháng": closing balance and top-ups → the combined amount to record. */
export function CloseMonthDialog({
  account,
  today,
  busy,
  onClose,
  onContinue,
}: {
  account: AccountResponse | null
  today: string
  busy: boolean
  onClose: () => void
  onContinue: (result: CloseMonthResult) => void
}) {
  const { t } = useI18n()
  const [date, setDate] = useState(today)
  const [closingDigits, setClosingDigits] = useState('')
  const [topUpDigits, setTopUpDigits] = useState('')

  useEffect(() => {
    if (!account) return
    setDate(today)
    setClosingDigits('')
    setTopUpDigits('')
  }, [account, today])

  // Opening = the current balance, so transactions already paid with the account aren't counted twice.
  const opening = account?.currentBalance.amount ?? 0
  const closing = digitsToNumber(closingDigits)
  const net = closing === null ? null : closeMonthNet(opening, digitsToNumber(topUpDigits) ?? 0, closing)
  const vnd = (amount: number) => formatMoney({ amount, currency: 'VND' })

  return (
    <Dialog open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.closeMonth')}: {account?.name}
          </DialogTitle>
        </DialogHeader>
        <p className="-mt-1 text-xs text-muted-foreground">{t('accounts.closeMonthHint')}</p>
        <div className="grid gap-5">
          <MoneyInput
            id="close-closing"
            label={t('accounts.closingBalance')}
            digits={closingDigits}
            onChange={setClosingDigits}
            variant="hero"
          />
          <div className="grid gap-3 rounded-xl bg-muted/50 p-3">
            <div className="flex items-baseline justify-between gap-3 text-sm" data-testid="close-opening">
              <span className="text-muted-foreground">
                {t('accounts.openingBalance')}
                {account?.latestSnapshot && ` (${dayjs(account.latestSnapshot.date).format('DD/MM')})`}
              </span>
              <span className="font-semibold tabular-nums">{vnd(opening)}</span>
            </div>
            <MoneyInput id="close-topups" label={t('accounts.topUps')} digits={topUpDigits} onChange={setTopUpDigits} />
            {net !== null && (
              <div
                data-testid="close-net"
                className={cn(
                  'flex items-baseline justify-between gap-3 border-t pt-3 text-sm font-medium',
                  net >= 0 ? 'text-expense' : 'text-income',
                )}
              >
                <span>{net >= 0 ? t('accounts.spent') : t('accounts.received')}</span>
                <span className="text-lg font-bold tabular-nums">{vnd(Math.abs(net))}</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-3">
            <Label htmlFor="close-date" className={SECTION_LABEL}>
              {t('accounts.date')}
            </Label>
            <Input id="close-date" type="date" className="rounded-xl" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button
            disabled={busy || !account || closing === null || net === null || !date}
            onClick={() => account && closing !== null && net !== null && onContinue({ account, date, closing, net })}
          >
            {t('accounts.continue')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
