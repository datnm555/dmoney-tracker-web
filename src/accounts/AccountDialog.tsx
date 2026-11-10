import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createAccount, updateAccount } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountInput, AccountResponse, AccountType } from '../api/types'
import { cn } from '@/lib/utils'
import { useBanks } from '../banks/BanksContext'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { MoneyInput } from './MoneyInput'
import { digitsToNumber, toDigits } from './moneyDigits'

const ACCOUNT_TYPES: AccountType[] = ['checking', 'overdraft', 'credit_card', 'ewallet', 'cash']

/** Digits with at most one dot and at most 2 decimals. */
const sanitizeRate = (v: string) => {
  const cleaned = v.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot < 0) return cleaned
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '').slice(0, 2)
}

// Deterministic avatar color per bank name (mirrors TransactionFormModal; the catalog has no color field).
const BANK_CHIP_COLORS = ['bg-red-600', 'bg-green-600', 'bg-sky-600', 'bg-violet-600', 'bg-amber-600', 'bg-rose-600']

function bankChipColor(name: string): string {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) % 997
  }
  return BANK_CHIP_COLORS[hash % BANK_CHIP_COLORS.length]
}

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
  const [bankName, setBankName] = useState<string | null>(null)
  const [customBank, setCustomBank] = useState(false)
  const [saving, setSaving] = useState(false)
  const { banks } = useBanks()
  const banksRef = useRef(banks)
  banksRef.current = banks

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setType(editing?.type ?? 'checking')
    setLastDigits(editing?.lastDigits ?? '')
    setLimit(toDigits(editing?.creditLimit?.amount))
    setStatementDay(editing?.statementDay?.toString() ?? '')
    setDueDay(editing?.dueDay?.toString() ?? '')
    setRate(editing?.interestRatePercent?.toString() ?? '')
    setBankName(editing?.bankName ?? null)
    // Ref-read so a late catalog load does not reset the user's pick mid-edit.
    setCustomBank(!!editing?.bankName && !banksRef.current.some((b) => b.name === editing.bankName))
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
      bankName: bankName?.trim() || null,
      interestRatePercent: debt && Number.isFinite(parseFloat(rate)) ? parseFloat(rate) : null,
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
          <div role="group" aria-label={t('accounts.bank')} className="grid gap-1.5">
            <Label>{t('accounts.bank')}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBankName(null)
                  setCustomBank(false)
                }}
                className={cn(
                  'rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
                  bankName === null && !customBank && 'border-primary text-primary ring-1 ring-primary/30',
                )}
              >
                {t('accounts.noBank')}
              </button>
              {banks.map((catalogBank) => (
                <button
                  key={catalogBank.id}
                  type="button"
                  onClick={() => {
                    setBankName(catalogBank.name)
                    setCustomBank(false)
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium',
                    bankName === catalogBank.name && !customBank && 'border-primary ring-1 ring-primary/30',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white',
                      bankChipColor(catalogBank.name),
                    )}
                  >
                    {catalogBank.name.charAt(0).toUpperCase()}
                  </span>
                  {catalogBank.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setCustomBank(true)
                  if (banksRef.current.some((b) => b.name === bankName)) setBankName(null)
                }}
                className={cn(
                  'rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
                  customBank && 'border-primary text-primary ring-1 ring-primary/30',
                )}
              >
                ＋ {t('payment.bank.other')}
              </button>
            </div>
            {customBank && (
              <Input
                aria-label={t('accounts.bank')}
                maxLength={100}
                value={bankName ?? ''}
                onChange={(e) => setBankName(e.target.value)}
              />
            )}
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
                  onChange={(e) => setRate(sanitizeRate(e.target.value))}
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
