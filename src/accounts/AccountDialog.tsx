import { useEffect, useRef, useState } from 'react'
import { Banknote, CircleCheck, CreditCard, Landmark, Smartphone, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
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

// Same icons as the account cards on the page.
const TYPE_ICON: Record<AccountType, LucideIcon> = {
  checking: Landmark,
  overdraft: Landmark,
  credit_card: CreditCard,
  ewallet: Smartphone,
  cash: Banknote,
}

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const PILL = 'rounded-full border bg-background py-1 text-xs font-medium transition-colors hover:border-primary/40'
const PILL_SELECTED = 'border-primary text-primary ring-1 ring-primary/30'

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
        <div className="grid gap-5">
          <div className="grid grid-cols-[1fr_6.5rem] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="acc-name" className={SECTION_LABEL}>
                {t('accounts.name')}
              </Label>
              <Input
                id="acc-name"
                className="h-11 rounded-xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="acc-digits" className={SECTION_LABEL}>
                {t('accounts.lastDigits')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs tracking-widest text-muted-foreground">
                  •••
                </span>
                <Input
                  id="acc-digits"
                  inputMode="numeric"
                  className="h-11 rounded-xl pl-9 font-medium tracking-widest tabular-nums"
                  value={lastDigits}
                  onChange={(e) => setLastDigits(onlyDigits(e.target.value, 4))}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <DialogSectionLabel id="acc-type-label">{t('accounts.type')}</DialogSectionLabel>
            <div id="acc-type" role="radiogroup" aria-labelledby="acc-type-label" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {ACCOUNT_TYPES.map((x) => {
                const Icon = TYPE_ICON[x]
                const selected = type === x
                return (
                  <button
                    key={x}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setType(x)}
                    className={cn(
                      'relative flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center text-xs font-medium leading-tight transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary ring-2 ring-primary'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {selected && (
                      <CircleCheck className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-background fill-primary text-primary-foreground" />
                    )}
                    <Icon className={cn('h-4 w-4', selected ? 'text-primary' : isDebtType(x) ? 'text-expense' : 'text-income')} aria-hidden />
                    {t(`accounts.type.${x}`)}
                  </button>
                )
              })}
            </div>
          </div>

          {debt && (
            <div className="grid gap-3">
              <MoneyInput
                id="acc-limit"
                label={t('accounts.creditLimit')}
                digits={limit}
                onChange={setLimit}
                variant="hero"
                tone="expense"
              />
              <div className="grid grid-cols-3 gap-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-stmt" className="text-xs text-muted-foreground">
                    {t('accounts.statementDay')}
                  </Label>
                  <Input
                    id="acc-stmt"
                    inputMode="numeric"
                    placeholder="—"
                    className="rounded-xl text-center tabular-nums"
                    value={statementDay}
                    onChange={(e) => setStatementDay(onlyDigits(e.target.value, 2))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-due" className="text-xs text-muted-foreground">
                    {t('accounts.dueDay')}
                  </Label>
                  <Input
                    id="acc-due"
                    inputMode="numeric"
                    placeholder="—"
                    className="rounded-xl text-center tabular-nums"
                    value={dueDay}
                    onChange={(e) => setDueDay(onlyDigits(e.target.value, 2))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="acc-rate" className="text-xs text-muted-foreground">
                    {t('accounts.interestRate')}
                  </Label>
                  <div className="relative">
                    <Input
                      id="acc-rate"
                      inputMode="decimal"
                      placeholder="—"
                      className="rounded-xl pr-7 text-center tabular-nums"
                      value={rate}
                      onChange={(e) => setRate(sanitizeRate(e.target.value))}
                    />
                    <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div role="group" aria-label={t('accounts.bank')} className="grid gap-2">
            <Label className={SECTION_LABEL}>{t('accounts.bank')}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setBankName(null)
                  setCustomBank(false)
                }}
                className={cn(
                  PILL,
                  'px-3 text-muted-foreground',
                  bankName === null && !customBank && PILL_SELECTED,
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
                    PILL,
                    'flex items-center gap-1.5 pl-1 pr-2.5',
                    bankName === catalogBank.name && !customBank && PILL_SELECTED,
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white',
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
                className={cn(PILL, 'px-3 text-muted-foreground', customBank && PILL_SELECTED)}
              >
                ＋ {t('payment.bank.other')}
              </button>
            </div>
            {customBank && (
              <Input
                aria-label={t('accounts.bank')}
                maxLength={100}
                className="rounded-xl"
                value={bankName ?? ''}
                onChange={(e) => setBankName(e.target.value)}
              />
            )}
          </div>
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
