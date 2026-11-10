import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '../accounts/MoneyInput'
import { digitsToNumber, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { createRecord } from '../api/recurringPaymentApi'
import type { RecurringPaymentResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'

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
          <DialogTitle>
            {t('recurring.markPaid')}: {item?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <MoneyInput id="rec-paid-amount" label={t('recurring.amount')} digits={digits} onChange={setDigits} />
          <div className="grid gap-1.5">
            <Label htmlFor="rec-paid-date">{t('recurring.paidOn')}</Label>
            <Input id="rec-paid-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
