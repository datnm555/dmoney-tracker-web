import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createSnapshot, updateSnapshot } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse, SnapshotInput } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber, toDigits } from './moneyDigits'

/** `editing` null = a fresh reading (today, empty amounts); otherwise pre-fills from that snapshot. */
export function SnapshotDialog({
  account,
  editing,
  onClose,
  onSaved,
}: {
  account: AccountResponse | null
  editing: AccountSnapshotResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [date, setDate] = useState('')
  const [balance, setBalance] = useState('')
  const [available, setAvailable] = useState('')
  const [statementAmount, setStatementAmount] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [installment, setInstallment] = useState('')
  const [paid, setPaid] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!account) return
    setDate(editing?.date ?? dayjs().format('YYYY-MM-DD'))
    setBalance(toDigits(editing?.balance.amount))
    setAvailable('')
    setStatementAmount(toDigits(editing?.statementAmount?.amount))
    setDueDate(editing?.dueDate ?? '')
    setInstallment(toDigits(editing?.installmentRemaining?.amount))
    setPaid(editing?.statementPaid ?? false)
    setNote(editing?.note ?? '')
  }, [account, editing])

  if (!account) return null
  const debt = isDebtType(account.type)
  const limit = account.creditLimit?.amount ?? null
  const card = account.type === 'credit_card'

  const onAvailable = (digits: string) => {
    setAvailable(digits)
    if (limit != null && digits !== '') setBalance(String(Math.max(0, limit - Number(digits))))
  }

  const submit = async () => {
    if (balance === '' || !date) return
    const input: SnapshotInput = {
      date,
      balance: Number(balance),
      statementAmount: card ? digitsToNumber(statementAmount) : null,
      dueDate: card && dueDate ? dueDate : null,
      installmentRemaining: card ? digitsToNumber(installment) : null,
      statementPaid: card ? paid : false,
      note: note.trim() || null,
    }
    setSaving(true)
    try {
      if (editing) await updateSnapshot(editing.id, input)
      else await createSnapshot(account.id, input)
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.updateBalance')} · {account.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="snap-date">{t('accounts.date')}</Label>
            <Input id="snap-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {debt && limit != null && (
            <MoneyInput id="snap-available" label={t('accounts.available')} digits={available} onChange={onAvailable} />
          )}
          <MoneyInput
            id="snap-balance"
            label={debt ? t('accounts.owed') : t('accounts.balance')}
            digits={balance}
            onChange={setBalance}
          />
          {card && (
            <>
              <MoneyInput
                id="snap-stmt"
                label={t('accounts.statementAmount')}
                digits={statementAmount}
                onChange={setStatementAmount}
              />
              <div className="grid gap-1.5">
                <Label htmlFor="snap-due">{t('accounts.dueDate')}</Label>
                <Input id="snap-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <MoneyInput
                id="snap-inst"
                label={t('accounts.installmentRemaining')}
                digits={installment}
                onChange={setInstallment}
              />
              <label className="flex items-center gap-2.5 text-sm">
                <Checkbox checked={paid} onCheckedChange={(c) => setPaid(c === true)} />
                {t('accounts.statementPaid')}
              </label>
            </>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="snap-note">{t('accounts.note')}</Label>
            <Input id="snap-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button disabled={saving || balance === ''} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
