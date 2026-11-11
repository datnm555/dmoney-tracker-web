import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { createSnapshot, updateSnapshot } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse, SnapshotInput } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber, toDigits } from './moneyDigits'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const CHECK_TILE =
  'flex cursor-pointer items-center gap-2.5 rounded-xl border bg-background px-3 py-2.5 text-sm transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5'

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
  const [untracked, setUntracked] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!account) return
    setDate(editing?.date ?? dayjs().format('YYYY-MM-DD'))
    setBalance(toDigits(editing?.balance.amount))
    setAvailable('')
    // A fresh reading on a card carries the due reminder over from the latest reading, so it isn't wiped.
    const src = editing ?? (account.type === 'credit_card' ? account.latestSnapshot : null)
    setStatementAmount(toDigits(src?.statementAmount?.amount))
    setDueDate(src?.dueDate ?? '')
    setInstallment(toDigits(src?.installmentRemaining?.amount))
    setPaid(src?.statementPaid ?? false)
    setUntracked(src?.statementUntracked ?? false)
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
      statementUntracked: card ? untracked : false,
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
        <div className="grid gap-5">
          <MoneyInput
            id="snap-balance"
            label={debt ? t('accounts.owed') : t('accounts.balance')}
            digits={balance}
            onChange={setBalance}
            variant="hero"
            tone={debt ? 'expense' : 'income'}
          />
          {debt && limit != null && (
            <MoneyInput
              id="snap-available"
              label={t('accounts.available')}
              digits={available}
              onChange={onAvailable}
              variant="field"
              hint={
                <span className="tabular-nums">
                  {t('accounts.creditLimit')}: {formatMoney({ amount: limit, currency: 'VND' })}
                </span>
              }
            />
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="snap-date" className={SECTION_LABEL}>
                {t('accounts.date')}
              </Label>
              <Input
                id="snap-date"
                type="date"
                className="rounded-xl"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="snap-note" className={SECTION_LABEL}>
                {t('accounts.note')}
              </Label>
              <Input id="snap-note" className="rounded-xl" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          {card && (
            <div className="grid gap-3">
              <DialogSectionLabel>{t('accounts.type.credit_card')}</DialogSectionLabel>
              <div className="grid gap-3 rounded-xl bg-muted/50 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <MoneyInput
                    id="snap-stmt"
                    label={t('accounts.statementAmount')}
                    digits={statementAmount}
                    onChange={setStatementAmount}
                  />
                  <div className="grid gap-1.5">
                    <Label htmlFor="snap-due">{t('accounts.dueDate')}</Label>
                    <Input
                      id="snap-due"
                      type="date"
                      className="bg-background"
                      value={dueDate}
                      onChange={(e) => {
                        setDueDate(e.target.value)
                        // A different due date means a new statement: its spending is tracked unless re-ticked.
                        setUntracked(false)
                      }}
                    />
                  </div>
                </div>
                <MoneyInput
                  id="snap-inst"
                  label={t('accounts.installmentRemaining')}
                  digits={installment}
                  onChange={setInstallment}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <label className={CHECK_TILE}>
                    <Checkbox checked={paid} onCheckedChange={(c) => setPaid(c === true)} />
                    {t('accounts.statementPaid')}
                  </label>
                  <label className={CHECK_TILE}>
                    <Checkbox checked={untracked} onCheckedChange={(c) => setUntracked(c === true)} />
                    {t('accounts.statementUntracked')}
                  </label>
                </div>
              </div>
            </div>
          )}
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
