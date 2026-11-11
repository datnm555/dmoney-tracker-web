import { useEffect, useState } from 'react'
import { CalendarCheck, CircleCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { digitsToNumber, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { createRecord } from '../api/recurringPaymentApi'
import type { RecurringPaymentResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { AmountHero } from './AmountHero'

/** Records a payment without creating a transaction (amount + date only). */
export function MarkPaidDialog({
  item,
  month,
  today,
  onClose,
  onSaved,
}: {
  item: RecurringPaymentResponse | null
  month: string
  today: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [digits, setDigits] = useState('')
  const [date, setDate] = useState(today)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) return
    setDigits(toDigits(item.amount.amount > 0 ? item.amount.amount : null))
    setDate(today)
  }, [item, today])

  const submit = async () => {
    if (!item) return
    const amount = digitsToNumber(digits)
    if (amount === null || !date) return
    setSaving(true)
    try {
      await createRecord(item.id, { period: month, amount, paidDate: date, transactionId: null })
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <CircleCheck className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 truncate">
              {t('recurring.markPaid')}: {item?.name}
            </span>
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <AmountHero id="rec-paid-amount" label={t('recurring.amount')} digits={digits} onChange={setDigits} tone="paid" />
          <div className="grid gap-2">
            <Label htmlFor="rec-paid-date" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('recurring.paidOn')}
            </Label>
            <div className="relative">
              <CalendarCheck
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground"
              />
              <Input
                id="rec-paid-date"
                type="date"
                className="h-11 rounded-xl pl-9"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button disabled={saving || digits === '' || !date} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
