import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '../accounts/MoneyInput'
import { digitsToNumber, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { deleteSavingsGoal, setSavingsGoal } from '../api/savingsApi'
import type { SavingsAccountResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'

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

  return (
    <Dialog open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('savings.goal')}: {account?.savingsBank}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <MoneyInput id="goal-target" label={t('savings.target')} digits={targetDigits} onChange={setTargetDigits} />
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="goal-start">{t('savings.startMonth')}</Label>
              <Input id="goal-start" type="month" value={startPeriod} onChange={(e) => setStartPeriod(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="goal-months">{t('savings.months')}</Label>
              <Input
                id="goal-months"
                inputMode="numeric"
                value={months}
                onChange={(e) => setMonths(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          </div>
          <MoneyInput
            id="goal-initial"
            label={t('savings.initialAmount')}
            digits={initialDigits}
            onChange={setInitialDigits}
          />
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
