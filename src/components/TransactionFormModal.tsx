import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import dayjs from 'dayjs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  note: string | null
}

interface Props {
  open: boolean
  editing: TransactionResponse | null
  submitting: boolean
  onSubmit: (values: TransactionFormValues) => void
  onCancel: () => void
}

const formatThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

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
      setNote('')
    }
  }, [open, editing])

  const amount = useMemo(() => Number(amountDigits || '0'), [amountDigits])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!content.trim()) nextErrors.content = t('form.contentRequired')
    if (amount <= 0) nextErrors.amount = t('form.amountRequired')
    if (paymentMethod === 'card' && !cardType) nextErrors.cardType = t('form.cardTypeRequired')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSubmit({
      date,
      content: content.trim(),
      type,
      amount,
      category,
      paymentMethod,
      cardType: paymentMethod === 'card' ? cardType : null,
      bank: paymentMethod === 'card' ? (bank?.trim() || null) : null,
      note: note.trim() || null,
    })
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
                  'rounded-md px-3 py-1.5 text-sm font-medium',
                  type === value
                    ? value === 'out'
                      ? 'bg-white text-expense shadow-sm'
                      : 'bg-white text-income shadow-sm'
                    : 'text-muted-foreground',
                )}
              >
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

          <div className="grid gap-2">
            <Label>{t('form.category')}</Label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_CODES.map((code) => (
                <button key={code} type="button" onClick={() => setCategory(category === code ? null : code)}>
                  <Badge variant={category === code ? 'default' : 'outline'}>{t(`category.${code}`)}</Badge>
                </button>
              ))}
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
              {PAYMENT_METHOD_CODES.map((code) => (
                <Label
                  key={code}
                  htmlFor={`tx-pm-${code}`}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-2 rounded-md border px-2 py-2 text-sm',
                    paymentMethod === code && 'border-primary bg-primary/5 text-primary',
                  )}
                >
                  <RadioGroupItem id={`tx-pm-${code}`} value={code} className="sr-only" />
                  {t(`payment.${code}`)}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {paymentMethod === 'card' && (
            <>
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
                        'flex cursor-pointer items-center justify-center rounded-md border px-2 py-2 text-sm uppercase',
                        cardType === code && 'border-primary bg-primary/5 text-primary',
                      )}
                    >
                      <RadioGroupItem id={`tx-ct-${code}`} value={code} className="sr-only" />
                      {t(`payment.cardType.${code}`)}
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
                    >
                      <Badge variant={bank === preset && !customBank ? 'default' : 'outline'}>{preset}</Badge>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setCustomBank(true)
                      setBank(null)
                    }}
                  >
                    <Badge variant={customBank ? 'default' : 'outline'}>＋ {t('payment.bank.other')}</Badge>
                  </button>
                </div>
                {customBank && (
                  <Input
                    aria-label={t('payment.bank')}
                    maxLength={100}
                    value={bank ?? ''}
                    onChange={(e) => setBank(e.target.value)}
                  />
                )}
              </div>
            </>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('summary.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t('summary.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
