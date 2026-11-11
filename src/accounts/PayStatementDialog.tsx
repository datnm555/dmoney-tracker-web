import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { payStatement } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber, toDigits } from './moneyDigits'

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
        <div className="grid gap-3">
          <MoneyInput id="pay-amount" label={t('recurring.amount')} digits={digits} onChange={setDigits} />
          <div className="grid gap-1.5">
            <Label htmlFor="pay-date">{t('recurring.paidOn')}</Label>
            <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay-from">{t('accounts.payFrom')}</Label>
            <select
              id="pay-from"
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
            >
              <option value="">{t('accounts.payFromNone')}</option>
              {sources.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.lastDigits ? ` •••${a.lastDigits}` : ''}
                </option>
              ))}
            </select>
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
