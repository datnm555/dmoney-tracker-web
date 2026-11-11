import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Target } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { digitsToNumber, formatThousands, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { deleteSavingsGoal, setSavingsGoal } from '../api/savingsApi'
import type { SavingsAccountResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { goalProgress } from '../utils/savings'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

/** Set, change or remove the goal of one savings place. */
export function SavingsGoalDialog({
  account,
  onClose,
  onSaved,
}: {
  account: SavingsAccountResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [targetDigits, setTargetDigits] = useState('')
  const [startPeriod, setStartPeriod] = useState('')
  const [months, setMonths] = useState('')
  const [initialDigits, setInitialDigits] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!account) return
    setTargetDigits(toDigits(account.goal?.targetAmount.amount))
    setStartPeriod(account.goal?.startPeriod ?? dayjs().format('YYYY-MM'))
    setMonths(account.goal ? String(account.goal.months) : '')
    setInitialDigits(toDigits(account.goal?.initialAmount.amount || null))
  }, [account])

  const target = digitsToNumber(targetDigits) ?? 0
  const monthCount = Number(months)
  const valid = target > 0 && /^\d{4}-\d{2}$/.test(startPeriod) && Number.isInteger(monthCount) && monthCount >= 1

  const run = async (action: () => Promise<unknown>) => {
    setSaving(true)
    try {
      await action()
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSaving(false)
    }
  }

  const submit = () =>
    account?.savingsBank &&
    run(() =>
      setSavingsGoal({
        savingsBank: account.savingsBank!,
        targetAmount: target,
        startPeriod,
        months: monthCount,
        initialAmount: digitsToNumber(initialDigits) ?? 0,
      }),
    )

  // Live "cần gửi mỗi tháng" preview. The account balance already includes the
  // stored goal's saved-before amount, so swap it for the one being typed.
  const preview =
    valid && account
      ? goalProgress(
          {
            id: account.goal?.id ?? '',
            targetAmount: { amount: target, currency: 'VND' },
            startPeriod,
            months: monthCount,
            initialAmount: { amount: digitsToNumber(initialDigits) ?? 0, currency: 'VND' },
          },
          account.balance.amount - (account.goal?.initialAmount.amount ?? 0) + (digitsToNumber(initialDigits) ?? 0),
          dayjs().format('YYYY-MM'),
        )
      : null

  return (
    <Dialog open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-teal-900/20"
            >
              <Target className="size-4" />
            </span>
            <span className="min-w-0 truncate">
              {t('savings.goal')}: {account?.savingsBank}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-1 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 pb-3 pt-3.5 text-center transition-colors focus-within:ring-[3px] focus-within:ring-emerald-500/15">
            <Label htmlFor="goal-target" className={cn(SECTION_LABEL, 'justify-center')}>
              {t('savings.target')}
            </Label>
            <div className="relative">
              <Input
                id="goal-target"
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                className="h-14 border-0 bg-transparent px-10 text-center text-4xl font-bold tracking-tight tabular-nums text-emerald-700 shadow-none focus-visible:ring-0 md:text-4xl dark:bg-transparent dark:text-emerald-300"
                value={formatThousands(targetDigits)}
                onChange={(e) => setTargetDigits(e.target.value.replace(/\D/g, ''))}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xl font-semibold text-muted-foreground">
                ₫
              </span>
            </div>
          </div>

          <div className="grid gap-3">
            <DialogSectionLabel>{t('savings.period')}</DialogSectionLabel>
            <div className="grid gap-3 rounded-2xl border bg-gradient-to-br from-teal-500/5 via-card to-card p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="goal-start" className="text-xs text-muted-foreground">
                    {t('savings.startMonth')}
                  </Label>
                  <Input
                    id="goal-start"
                    type="month"
                    className="rounded-xl bg-background"
                    value={startPeriod}
                    onChange={(e) => setStartPeriod(e.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="goal-months" className="text-xs text-muted-foreground">
                    {t('savings.months')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="goal-months"
                      inputMode="numeric"
                      autoComplete="off"
                      className="rounded-xl bg-background pr-14 font-semibold tabular-nums"
                      value={months}
                      onChange={(e) => setMonths(e.target.value.replace(/\D/g, ''))}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                      {t('savings.monthUnit')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="goal-initial" className="text-xs text-muted-foreground">
                  {t('savings.initialAmount')}
                </Label>
                <div className="relative">
                  <Input
                    id="goal-initial"
                    inputMode="numeric"
                    autoComplete="off"
                    className="rounded-xl bg-background pr-9 tabular-nums"
                    value={formatThousands(initialDigits)}
                    onChange={(e) => setInitialDigits(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    ₫
                  </span>
                </div>
              </div>
            </div>
          </div>

          {preview && (
            <div
              data-testid="savings-goal-preview"
              className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-700 to-cyan-900 px-4 py-3 text-white shadow-sm shadow-teal-900/20"
            >
              {preview.reached ? (
                <span className="text-sm font-semibold">{t('savings.goalReached')}</span>
              ) : (
                <>
                  <span className="text-xs text-emerald-50/80">
                    {t('savings.perMonth')}
                    {preview.monthsLeft > 0 &&
                      ` (${t('accounts.left')} ${preview.monthsLeft} ${t('savings.monthUnit')})`}
                  </span>
                  <span className="text-lg font-bold tabular-nums">
                    {formatMoney({ amount: preview.perMonth, currency: 'VND' })}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          {account?.goal ? (
            <Button
              variant="ghost"
              className="text-expense hover:bg-expense/10 hover:text-expense"
              disabled={saving}
              onClick={() => void run(() => deleteSavingsGoal(account.goal!.id))}
            >
              {t('savings.deleteGoal')}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {t('summary.cancel')}
            </Button>
            <Button disabled={saving || !valid} onClick={() => void submit()}>
              {t('summary.submit')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
