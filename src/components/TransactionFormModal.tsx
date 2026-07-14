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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getSubCategories } from '../api/subCategoryApi'
import { getOpenAdvances, getPrepaidCredits } from '../api/transactionApi'
import type { AdvanceResponse, PrepaidCreditResponse, SubCategoryResponse, TransactionResponse } from '../api/types'
import { formatMoney } from '../utils/money'
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
  advanceTransactionId: string | null
  isPrepaid: boolean
  prepaidFrom: string | null
  prepaidTo: string | null
  prepaidTransactionId: string | null
  subCategoryId: string | null
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
  const [reimburse, setReimburse] = useState(false)
  const [advanceId, setAdvanceId] = useState<string | null>(null)
  const [advances, setAdvances] = useState<AdvanceResponse[]>([])
  const [isPrepaid, setIsPrepaid] = useState(false)
  const [prepaidMonths, setPrepaidMonths] = useState(1)
  const [alreadyPrepaid, setAlreadyPrepaid] = useState(false)
  const [prepaidId, setPrepaidId] = useState<string | null>(null)
  const [prepaidCredits, setPrepaidCredits] = useState<PrepaidCreditResponse[]>([])
  const [subCategoryId, setSubCategoryId] = useState<string | null>(null)
  const [subCategories, setSubCategories] = useState<SubCategoryResponse[]>([])
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
      setReimburse(editing.advanceTransactionId !== null)
      setAdvanceId(editing.advanceTransactionId)
      setIsPrepaid(editing.isPrepaid)
      setPrepaidMonths(
        editing.prepaidFrom && editing.prepaidTo
          ? Math.min(
              12,
              Math.max(
                1,
                Math.round(dayjs(editing.prepaidTo).add(1, 'day').diff(dayjs(editing.prepaidFrom), 'month', true)),
              ),
            )
          : 1,
      )
      setAlreadyPrepaid(editing.prepaidTransactionId !== null)
      setPrepaidId(editing.prepaidTransactionId)
      setSubCategoryId(editing.subCategoryId)
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
      setReimburse(false)
      setAdvanceId(null)
      setIsPrepaid(false)
      setPrepaidMonths(1)
      setAlreadyPrepaid(false)
      setPrepaidId(null)
      setSubCategoryId(null)
      setNote('')
    }
  }, [open, editing])

  useEffect(() => {
    if (!open || !reimburse) return
    getOpenAdvances(editing?.id)
      .then(setAdvances)
      .catch(() => setAdvances([]))
  }, [open, reimburse, editing])

  useEffect(() => {
    if (!open || !alreadyPrepaid) return
    getPrepaidCredits()
      .then(setPrepaidCredits)
      .catch(() => setPrepaidCredits([]))
  }, [open, alreadyPrepaid])

  useEffect(() => {
    if (!open) return
    getSubCategories()
      .then(setSubCategories)
      .catch(() => setSubCategories([]))
  }, [open])

  const amount = useMemo(() => Number(amountDigits || '0'), [amountDigits])

  const validateAndBuild = (): TransactionFormValues | null => {
    const nextErrors: Record<string, string> = {}
    if (!content.trim()) nextErrors.content = t('form.contentRequired')
    const amountOptional = type === 'out' && alreadyPrepaid
    if (amount <= 0 && !amountOptional) nextErrors.amount = t('form.amountRequired')
    if (paymentMethod === 'card' && !cardType) nextErrors.cardType = t('form.cardTypeRequired')
    if (type === 'in' && reimburse && !advanceId) nextErrors.advance = t('form.advanceRequired')
    if (type === 'out' && alreadyPrepaid && !prepaidId) nextErrors.prepaid = t('form.prepaidRequired')
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
      isAdvance: type === 'out' ? isAdvance : false,
      advanceTransactionId: type === 'in' && reimburse ? advanceId : null,
      isPrepaid: type === 'in' && isPrepaid,
      prepaidFrom: type === 'in' && isPrepaid ? date : null,
      prepaidTo:
        type === 'in' && isPrepaid
          ? dayjs(date).add(prepaidMonths, 'month').subtract(1, 'day').format('YYYY-MM-DD')
          : null,
      prepaidTransactionId: type === 'out' && alreadyPrepaid ? prepaidId : null,
      subCategoryId: category !== null ? subCategoryId : null,
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
    if (!values) return
    onSubmit(values, { keepOpen: true })
    // Clone flow: keep date/type/payment method, clear the per-record fields.
    setContent('')
    setAmountDigits('')
    setNote('')
    setCategory(null)
    setSubCategoryId(null)
    setIsAdvance(false)
    setReimburse(false)
    setAdvanceId(null)
    setAlreadyPrepaid(false)
    setPrepaidId(null)
    setErrors({})
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
                onClick={() => {
                  setType(value)
                  if (value === 'in') {
                    setIsAdvance(false)
                    setAlreadyPrepaid(false)
                    setPrepaidId(null)
                  } else {
                    setReimburse(false)
                    setAdvanceId(null)
                    setIsPrepaid(false)
                  }
                }}
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

          <div className="grid grid-cols-2 items-center gap-2">
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

          {type === 'out' && (
            <>
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

              <div className="grid gap-2 rounded-lg border px-3 py-2.5">
                <label className="flex items-start gap-2.5">
                  <Checkbox
                    checked={alreadyPrepaid}
                    onCheckedChange={(checked) => {
                      setAlreadyPrepaid(checked === true)
                      if (checked !== true) setPrepaidId(null)
                    }}
                    aria-label={t('form.alreadyPrepaid')}
                    className="mt-0.5"
                  />
                  <span className="grid gap-0.5 text-sm">
                    <span className="font-medium">{t('form.alreadyPrepaid')}</span>
                    <span className="text-xs text-muted-foreground">{t('form.alreadyPrepaidHint')}</span>
                  </span>
                </label>
                {alreadyPrepaid && (
                  <>
                    <Select value={prepaidId ?? ''} onValueChange={setPrepaidId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('form.selectPrepaid')} />
                      </SelectTrigger>
                      <SelectContent>
                        {prepaidCredits.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.prepaidFrom && p.prepaidTo
                              ? `${dayjs(p.prepaidFrom).format('DD/MM')}–${dayjs(p.prepaidTo).format('DD/MM/YYYY')} · `
                              : ''}
                            {p.content} · +{formatMoney(p.credit)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.prepaid && <p className="text-xs text-expense">{errors.prepaid}</p>}
                  </>
                )}
              </div>
            </>
          )}

          {type === 'in' && (
            <div className="grid gap-2 rounded-lg border px-3 py-2.5">
              <label className="flex items-center gap-2.5">
                <Checkbox
                  checked={reimburse}
                  onCheckedChange={(checked) => {
                    setReimburse(checked === true)
                    if (checked !== true) setAdvanceId(null)
                  }}
                  aria-label={t('form.reimburseAdvance')}
                />
                <span className="text-sm font-medium">{t('form.reimburseAdvance')}</span>
              </label>
              {reimburse && (
                <>
                  <Select value={advanceId ?? ''} onValueChange={setAdvanceId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('form.selectAdvance')} />
                    </SelectTrigger>
                    <SelectContent>
                      {advances.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {dayjs(a.date).format('DD/MM/YYYY')} · {a.content} · −{formatMoney(a.debit)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.advance && <p className="text-xs text-expense">{errors.advance}</p>}
                </>
              )}
            </div>
          )}

          {type === 'in' && (
            <div className="grid gap-2 rounded-lg border px-3 py-2.5">
              <label className="flex items-start gap-2.5">
                <Checkbox
                  checked={isPrepaid}
                  onCheckedChange={(checked) => setIsPrepaid(checked === true)}
                  aria-label={t('form.isPrepaid')}
                  className="mt-0.5"
                />
                <span className="grid gap-0.5 text-sm">
                  <span className="font-medium">{t('form.isPrepaid')}</span>
                  <span className="text-xs text-muted-foreground">{t('form.isPrepaidHint')}</span>
                </span>
              </label>
              {isPrepaid && (
                <div className="grid grid-cols-2 items-end gap-2">
                  <div className="grid gap-1.5">
                    <Label className="text-xs text-muted-foreground">{t('form.prepaidMonths')}</Label>
                    <Select value={String(prepaidMonths)} onValueChange={(v) => setPrepaidMonths(Number(v))}>
                      <SelectTrigger className="w-full" aria-label={t('form.prepaidMonths')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n} {t('common.months')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="pb-2 text-xs text-muted-foreground">
                    {dayjs(date).format('DD/MM/YYYY')} →{' '}
                    {dayjs(date).add(prepaidMonths, 'month').subtract(1, 'day').format('DD/MM/YYYY')}
                  </p>
                </div>
              )}
            </div>
          )}

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
                    onClick={() => {
                      const next = selected ? null : code
                      setCategory(next)
                      // Auto-pick the default sub-category of the chosen parent, if any.
                      setSubCategoryId(
                        next !== null
                          ? (subCategories.find((s) => s.category === next && s.isDefault)?.id ?? null)
                          : null,
                      )
                    }}
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
            {category !== null && subCategories.some((s) => s.category === category) && (
              <div className="grid gap-1.5">
                <span className="text-xs text-muted-foreground">{t('form.subCategory')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {subCategories
                    .filter((s) => s.category === category)
                    .map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSubCategoryId(subCategoryId === s.id ? null : s.id)}
                        className={cn(
                          'rounded-lg border px-2.5 py-1 text-xs font-medium',
                          subCategoryId === s.id
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'text-muted-foreground hover:border-zinc-300',
                        )}
                      >
                        {s.name}
                      </button>
                    ))}
                </div>
              </div>
            )}
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
