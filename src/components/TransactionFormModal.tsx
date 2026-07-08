import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import dayjs from 'dayjs'
import { ArrowDown, ArrowUp, Banknote, CircleCheck, CreditCard, Landmark } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import type { TransactionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CATEGORY_CODES } from '../utils/categories'
import { categoryVisual } from '../utils/categoryIcons'
import {
  BANK_PRESETS,
  CARD_TYPE_CODES,
  PAYMENT_METHOD_CODES,
} from '../utils/paymentMethods'
import type { CardTypeCode, PaymentMethodCode } from '../utils/paymentMethods'

export interface TransactionFormValues {
  date: string // YYYY-MM-DD
  content: string
  type: 'in' | 'out'
  amount: number
  category: string | null
  paymentMethod: PaymentMethodCode
  cardType: CardTypeCode | null
  bank: string | null
  isAdvance: boolean
  note: string | null
}

export interface SubmitOptions {
  /** Keep the dialog open with the current values so the user can save a tweaked clone. */
  keepOpen: boolean
}

interface Props {
  open: boolean
  editing: TransactionResponse | null
  submitting: boolean
  onSubmit: (values: TransactionFormValues, options?: SubmitOptions) => void
  onCancel: () => void
}

const formatThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

const PAYMENT_ICONS: Record<PaymentMethodCode, LucideIcon> = {
  transfer: Landmark,
  cash: Banknote,
  card: CreditCard,
}

export function TransactionFormModal({ open, editing, submitting, onSubmit, onCancel }: Props) {
  const { t } = useI18n()
  const [type, setType] = useState<'in' | 'out'>('out')
  const [date, setDate] = useState('')
  const [content, setContent] = useState('')
  const [amountDigits, setAmountDigits] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodCode>('transfer')
  const [cardType, setCardType] = useState<CardTypeCode | null>(null)
  const [bank, setBank] = useState<string | null>(null)
  const [customBank, setCustomBank] = useState(false)
  const [isAdvance, setIsAdvance] = useState(false)
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    setCustomBank(false)
    if (editing) {
      const isIncome = editing.credit.amount > 0
      setType(isIncome ? 'in' : 'out')
      setDate(editing.date)
      setContent(editing.content)
      setAmountDigits(String(isIncome ? editing.credit.amount : editing.debit.amount))
      setCategory(editing.category)
      setPaymentMethod((editing.paymentMethod as PaymentMethodCode) ?? 'transfer')
      setCardType((editing.cardType as CardTypeCode) ?? null)
      setBank(editing.bank)
      setIsAdvance(editing.isAdvance)
      setCustomBank(editing.bank !== null && !BANK_PRESETS.includes(editing.bank as (typeof BANK_PRESETS)[number]))
      setNote(editing.note ?? '')
    } else {
      setType('out')
      setDate(dayjs().format('YYYY-MM-DD'))
      setContent('')
      setAmountDigits('')
      setCategory(null)
      setPaymentMethod('transfer')
      setCardType(null)
      setBank(null)
      setIsAdvance(false)
      setNote('')
    }
  }, [open, editing])

  const amount = useMemo(() => Number(amountDigits || '0'), [amountDigits])

  const validateAndBuild = (): TransactionFormValues | null => {
    const nextErrors: Record<string, string> = {}
    if (!content.trim()) nextErrors.content = t('form.contentRequired')
    if (amount <= 0) nextErrors.amount = t('form.amountRequired')
    if (paymentMethod === 'card' && !cardType) nextErrors.cardType = t('form.cardTypeRequired')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return null

    return {
      date,
      content: content.trim(),
      type,
      amount,
      category,
      paymentMethod,
      cardType: paymentMethod === 'card' ? cardType : null,
      bank: paymentMethod === 'card' ? (bank?.trim() || null) : null,
      isAdvance,
      note: note.trim() || null,
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const values = validateAndBuild()
    if (values) onSubmit(values)
  }

  const handleSaveAndContinue = () => {
    const values = validateAndBuild()
    if (values) onSubmit(values, { keepOpen: true })
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t('summary.editTitle') : t('summary.createTitle')}</DialogTitle>
          <DialogDescription>{t('summary.createTitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
            {(['out', 'in'] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setType(value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium',
                  type === value ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground',
                )}
              >
                {value === 'out' ? (
                  <ArrowDown className={cn('h-3.5 w-3.5', type === value ? '' : 'text-expense')} />
                ) : (
                  <ArrowUp className={cn('h-3.5 w-3.5', type === value ? '' : 'text-income')} />
                )}
                {value === 'out' ? t('form.moneyOut') : t('form.moneyIn')}
              </button>
            ))}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-date">{t('form.date')}</Label>
            <Input id="tx-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tx-content">{t('form.content')}</Label>
            <Input id="tx-content" maxLength={500} value={content} onChange={(e) => setContent(e.target.value)} />
            {errors.content && <p className="text-xs text-expense">{errors.content}</p>}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div className="grid gap-2">
              <Label htmlFor="tx-amount">{t('form.amount')}</Label>
              <Input
                id="tx-amount"
                inputMode="numeric"
                value={formatThousands(amountDigits)}
                onChange={(e) => setAmountDigits(e.target.value.replace(/\D/g, ''))}
              />
              {errors.amount && <p className="text-xs text-expense">{errors.amount}</p>}
            </div>
            <div className="grid gap-2">
              <Label>{t('form.currency')}</Label>
              <div className="flex h-9 items-center rounded-md border px-3 text-sm text-muted-foreground">₫ VND</div>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5">
            <Checkbox
              checked={isAdvance}
              onCheckedChange={(checked) => setIsAdvance(checked === true)}
              aria-label={t('form.isAdvance')}
              className="mt-0.5"
            />
            <span className="grid gap-0.5 text-sm">
              <span className="font-medium">{t('form.isAdvance')}</span>
              <span className="text-xs text-muted-foreground">{t('form.isAdvanceHint')}</span>
            </span>
          </label>

          <div className="grid gap-2">
            <Label>{t('form.category')}</Label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORY_CODES.map((code) => {
                const visual = categoryVisual(code)
                const selected = category === code
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCategory(selected ? null : code)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border px-1.5 py-2.5 text-xs',
                      selected
                        ? 'border-primary bg-primary/5 font-medium text-primary'
                        : 'text-muted-foreground hover:border-zinc-300',
                    )}
                  >
                    <visual.icon className={cn('h-4 w-4', selected ? 'text-primary' : visual.iconClass)} />
                    <span className="truncate">{t(`category.${code}`)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>{t('payment.method')}</Label>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value as PaymentMethodCode)
                if (value !== 'card') {
                  setCardType(null)
                  setBank(null)
                  setCustomBank(false)
                }
              }}
              className="grid grid-cols-3 gap-2"
            >
              {PAYMENT_METHOD_CODES.map((code) => {
                const Icon = PAYMENT_ICONS[code]
                const selected = paymentMethod === code
                return (
                  <Label
                    key={code}
                    htmlFor={`tx-pm-${code}`}
                    className={cn(
                      'relative flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-sm',
                      selected ? 'border-primary bg-primary/5 text-primary' : 'text-muted-foreground',
                    )}
                  >
                    <RadioGroupItem id={`tx-pm-${code}`} value={code} className="sr-only" />
                    {selected && (
                      <CircleCheck className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-background fill-primary text-primary-foreground" />
                    )}
                    <Icon className="h-4 w-4" />
                    {t(`payment.${code}`)}
                  </Label>
                )
              })}
            </RadioGroup>
          </div>

          {paymentMethod === 'card' && (
            <div className="grid gap-3 rounded-lg bg-zinc-50 p-3">
              <div className="grid gap-2">
                <Label>{t('payment.cardType')}</Label>
                <RadioGroup
                  value={cardType ?? ''}
                  onValueChange={(value) => setCardType(value as CardTypeCode)}
                  className="grid grid-cols-2 gap-2"
                >
                  {CARD_TYPE_CODES.map((code) => (
                    <Label
                      key={code}
                      htmlFor={`tx-ct-${code}`}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm',
                        cardType === code && 'border-primary ring-1 ring-primary/30',
                      )}
                    >
                      <RadioGroupItem id={`tx-ct-${code}`} value={code} />
                      {code === 'visa' ? (
                        <span className="text-[13px] font-extrabold italic tracking-tight text-primary">
                          {t(`payment.cardType.${code}`)}
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <span className="h-3 w-3 rounded-full bg-red-500" />
                          <span className="-ml-1 h-3 w-3 rounded-full bg-amber-400 opacity-90" />
                          <span className="ml-1.5">{t(`payment.cardType.${code}`)}</span>
                        </span>
                      )}
                    </Label>
                  ))}
                </RadioGroup>
                {errors.cardType && <p className="text-xs text-expense">{errors.cardType}</p>}
              </div>
              <div className="grid gap-2">
                <Label>{t('payment.bank')}</Label>
                <div className="flex flex-wrap gap-1.5">
                  {BANK_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        setBank(preset)
                        setCustomBank(false)
                      }}
                      className={cn(
                        'flex items-center gap-1.5 rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium',
                        bank === preset && !customBank && 'border-primary ring-1 ring-primary/30',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold text-white',
                          preset === 'Techcombank' ? 'bg-red-600' : 'bg-green-600',
                        )}
                      >
                        {preset.charAt(0)}
                      </span>
                      {preset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomBank(true)
                      setBank(null)
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
                    aria-label={t('payment.bank')}
                    maxLength={100}
                    className="bg-background"
                    value={bank ?? ''}
                    onChange={(e) => setBank(e.target.value)}
                  />
                )}
              </div>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="tx-note">{t('form.note')}</Label>
            <textarea
              id="tx-note"
              rows={2}
              maxLength={1000}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('summary.cancel')}
            </Button>
            {!editing && (
              <Button type="button" variant="secondary" disabled={submitting} onClick={handleSaveAndContinue}>
                {t('form.saveAndContinue')}
              </Button>
            )}
            <Button type="submit" disabled={submitting}>
              {t('summary.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
