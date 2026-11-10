import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAccount, updateAccount } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountInput, AccountResponse, AccountType } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { MoneyInput, digitsToNumber, toDigits } from './MoneyInput'

export const ACCOUNT_TYPES: AccountType[] = ['checking', 'overdraft', 'credit_card', 'ewallet', 'cash']

const onlyDigits = (v: string, max?: number) => {
  const d = v.replace(/\D/g, '')
  return max ? d.slice(0, max) : d
}

export function AccountDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: AccountResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('checking')
  const [lastDigits, setLastDigits] = useState('')
  const [limit, setLimit] = useState('')
  const [statementDay, setStatementDay] = useState('')
  const [dueDay, setDueDay] = useState('')
  const [rate, setRate] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setType(editing?.type ?? 'checking')
    setLastDigits(editing?.lastDigits ?? '')
    setLimit(toDigits(editing?.creditLimit?.amount))
    setStatementDay(editing?.statementDay?.toString() ?? '')
    setDueDay(editing?.dueDay?.toString() ?? '')
    setRate(editing?.interestRatePercent?.toString() ?? '')
  }, [open, editing])

  const debt = isDebtType(type)

  const submit = async () => {
    if (!name.trim()) return
    const input: AccountInput = {
      name: name.trim(),
      type,
      lastDigits: lastDigits || null,
      creditLimit: debt ? digitsToNumber(limit) : null,
      statementDay: debt && statementDay ? Number(statementDay) : null,
      dueDay: debt && dueDay ? Number(dueDay) : null,
      interestRatePercent: debt && rate !== '' ? Number(rate) : null,
    }
    setSaving(true)
    try {
      if (editing) await updateAccount(editing.id, input)
      else await createAccount(input)
      onSaved()
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t('accounts.edit') : t('accounts.add')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="acc-name">{t('accounts.name')}</Label>
            <Input id="acc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="acc-type">{t('accounts.type')}</Label>
            <select
              id="acc-type"
              value={type}
              onChange={(e) => setType(e.target.value as AccountType)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {ACCOUNT_TYPES.map((x) => (
                <option key={x} value={x}>
                  {t(`accounts.type.${x}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="acc-digits">{t('accounts.lastDigits')}</Label>
            <Input
              id="acc-digits"
              inputMode="numeric"
              value={lastDigits}
              onChange={(e) => setLastDigits(onlyDigits(e.target.value, 4))}
            />
          </div>
          {debt && (
            <>
              <MoneyInput id="acc-limit" label={t('accounts.creditLimit')} digits={limit} onChange={setLimit} />
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-stmt">{t('accounts.statementDay')}</Label>
                  <Input
                    id="acc-stmt"
                    inputMode="numeric"
                    value={statementDay}
                    onChange={(e) => setStatementDay(onlyDigits(e.target.value, 2))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-due">{t('accounts.dueDay')}</Label>
                  <Input
                    id="acc-due"
                    inputMode="numeric"
                    value={dueDay}
                    onChange={(e) => setDueDay(onlyDigits(e.target.value, 2))}
                  />
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="acc-rate">{t('accounts.interestRate')}</Label>
                <Input
                  id="acc-rate"
                  inputMode="decimal"
                  value={rate}
                  onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))}
                />
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button disabled={saving || !name.trim()} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
