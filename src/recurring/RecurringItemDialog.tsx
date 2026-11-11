import { useEffect, useState } from 'react'
import { Banknote, CalendarClock, CircleCheck, CreditCard, Landmark, type LucideIcon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { digitsToNumber, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { createRecurringPayment, updateRecurringPayment } from '../api/recurringPaymentApi'
import { getSubCategories } from '../api/subCategoryApi'
import type { RecurringPaymentInput, RecurringPaymentResponse, SubCategoryResponse } from '../api/types'
import { useBanks } from '../banks/BanksContext'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { useI18n } from '../i18n/I18nContext'
import { PAYMENT_METHOD_CODES, type PaymentMethodCode } from '../utils/paymentMethods'
import { AmountHero } from './AmountHero'

const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
const FIELD = 'h-11 rounded-xl'

const PAYMENT_ICONS: Record<PaymentMethodCode, LucideIcon> = {
  transfer: Landmark,
  cash: Banknote,
  card: CreditCard,
}

export function RecurringItemDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: RecurringPaymentResponse | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useI18n()
  const { banks } = useBanks()
  const { options: categoryOptions } = useCategoryDisplay()
  const [subs, setSubs] = useState<SubCategoryResponse[]>([])
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subCategoryId, setSubCategoryId] = useState('')
  const [digits, setDigits] = useState('')
  const [isVariable, setIsVariable] = useState(false)
  const [day, setDay] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [bank, setBank] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [startPeriod, setStartPeriod] = useState('')
  const [savingsBank, setSavingsBank] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(editing?.name ?? '')
    setCategoryId(editing?.categoryId ?? '')
    setSubCategoryId(editing?.subCategoryId ?? '')
    setDigits(toDigits(editing && editing.amount.amount > 0 ? editing.amount.amount : null))
    setIsVariable(editing?.isVariable ?? false)
    setDay(editing?.dayOfMonth.toString() ?? '')
    setPaymentMethod(editing?.paymentMethod ?? '')
    setBank(editing?.bank ?? null)
    setNote(editing?.note ?? '')
    setIsActive(editing?.isActive ?? true)
    setStartPeriod(editing?.startPeriod ?? '')
    setSavingsBank(editing?.savingsBank ?? '')
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    getSubCategories()
      .then(setSubs)
      .catch(() => setSubs([]))
  }, [open])

  const isSavings = subs.some((s) => s.id === subCategoryId && s.categoryId === categoryId && s.code === 'savings_book')
  const dayNumber = Number(day)
  const valid = name.trim() !== '' && dayNumber >= 1 && dayNumber <= 31

  const submit = async () => {
    if (!valid) return
    const input: RecurringPaymentInput = {
      name: name.trim(),
      categoryId: categoryId || null,
      subCategoryId: categoryId && subCategoryId ? subCategoryId : null,
      amount: digitsToNumber(digits) ?? 0,
      isVariable,
      dayOfMonth: dayNumber,
      paymentMethod: paymentMethod || null,
      bank,
      note: note.trim() || null,
      isActive,
      startPeriod: startPeriod || null,
      savingsBank: isSavings ? savingsBank.trim() || null : null,
    }
    setSaving(true)
    try {
      if (editing) await updateRecurringPayment(editing.id, input)
      else await createRecurringPayment(input)
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
          <DialogTitle>{editing ? t('recurring.edit') : t('recurring.add')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <AmountHero id="rec-amount" label={t('recurring.amount')} digits={digits} onChange={setDigits}>
            <label className="mx-auto mt-1 inline-flex cursor-pointer items-center gap-2 rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-border has-[:checked]:text-primary has-[:checked]:ring-primary/40">
              <input
                type="checkbox"
                className="size-3.5 accent-primary"
                checked={isVariable}
                onChange={(e) => setIsVariable(e.target.checked)}
              />
              {t('recurring.isVariable')}
            </label>
          </AmountHero>

          <div className="grid gap-2">
            <Label htmlFor="rec-name" className={SECTION_LABEL}>
              {t('recurring.name')}
            </Label>
            <Input id="rec-name" className={FIELD} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="grid gap-2">
            <DialogSectionLabel id="rec-category-label">{t('form.category')}</DialogSectionLabel>
            <div id="rec-category" role="radiogroup" aria-labelledby="rec-category-label" className="grid grid-cols-4 gap-2">
              {categoryOptions
                .filter((c) => c.kind !== 'income')
                .map((c) => {
                  const selected = categoryId === c.code
                  return (
                    <button
                      key={c.code}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => {
                        setCategoryId(selected ? '' : c.code)
                        setSubCategoryId('')
                      }}
                      className={cn(
                        'relative flex flex-col items-center gap-1.5 rounded-xl px-1 pb-2 pt-2.5 text-[11px] leading-tight transition-colors',
                        selected
                          ? 'bg-primary/10 font-semibold text-primary ring-2 ring-primary'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {selected && (
                        <CircleCheck className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-background fill-primary text-primary-foreground" />
                      )}
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg bg-background shadow-xs',
                          selected && 'bg-primary/15 shadow-none',
                        )}
                      >
                        <c.visual.icon className={cn('h-4 w-4', selected ? 'text-primary' : c.visual.iconClass)} />
                      </span>
                      <span className="line-clamp-2 max-w-full break-words text-center">{c.label}</span>
                    </button>
                  )
                })}
            </div>
            {categoryId && (
              <div className="grid gap-1.5">
                <span id="rec-sub-label" className="text-xs font-medium text-muted-foreground">
                  {t('form.subCategory')}
                </span>
                <div id="rec-sub" role="radiogroup" aria-labelledby="rec-sub-label" className="flex flex-wrap gap-1.5">
                  {subs
                    .filter((s) => s.categoryId === categoryId)
                    .map((s) => {
                      const selected = subCategoryId === s.id
                      return (
                        <button
                          key={s.id}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setSubCategoryId(selected ? '' : s.id)}
                          className={cn(
                            'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                            selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:border-zinc-300 hover:text-foreground',
                          )}
                        >
                          {s.name}
                        </button>
                      )
                    })}
                </div>
              </div>
            )}
            {isSavings && (
              <div className="grid gap-2 rounded-xl bg-muted/50 p-3">
                <Label htmlFor="rec-savings-bank" className={SECTION_LABEL}>
                  {t('form.savingsBank')}
                </Label>
                <Input
                  id="rec-savings-bank"
                  className={cn(FIELD, 'bg-background')}
                  value={savingsBank}
                  onChange={(e) => setSavingsBank(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="rec-day" className={SECTION_LABEL}>
                {t('recurring.dayOfMonth')}
              </Label>
              <div className="relative">
                <CalendarClock
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 left-3 my-auto size-4 text-muted-foreground"
                />
                <Input
                  id="rec-day"
                  inputMode="numeric"
                  placeholder="1–31"
                  className={cn(FIELD, 'pl-9 font-semibold tabular-nums')}
                  value={day}
                  onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="rec-start" className={SECTION_LABEL}>
                {t('recurring.startPeriod')}
              </Label>
              <Input
                id="rec-start"
                type="month"
                className={FIELD}
                value={startPeriod}
                onChange={(e) => setStartPeriod(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <DialogSectionLabel id="rec-pm-label">{t('payment.method')}</DialogSectionLabel>
            <div id="rec-pm" role="radiogroup" aria-labelledby="rec-pm-label" className="grid grid-cols-3 gap-2">
              {PAYMENT_METHOD_CODES.map((code) => {
                const Icon = PAYMENT_ICONS[code]
                const selected = paymentMethod === code
                return (
                  <button
                    key={code}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPaymentMethod(selected ? '' : code)}
                    className={cn(
                      'relative flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-sm transition-colors',
                      selected
                        ? 'bg-primary/10 text-primary ring-2 ring-primary'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {selected && (
                      <CircleCheck className="absolute -right-1.5 -top-1.5 h-4 w-4 rounded-full bg-background fill-primary text-primary-foreground" />
                    )}
                    <Icon className="h-4 w-4" aria-hidden />
                    {t(`payment.${code}`)}
                  </button>
                )
              })}
            </div>
            <div role="group" aria-label={t('accounts.bank')} className="grid gap-1.5 rounded-xl bg-muted/50 p-3">
              <Label className="text-xs font-medium text-muted-foreground">{t('accounts.bank')}</Label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setBank(null)}
                  className={cn(
                    'rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground transition-colors',
                    bank === null && 'border-primary bg-primary/10 text-primary',
                  )}
                >
                  {t('accounts.noBank')}
                </button>
                {banks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBank(b.name)}
                    className={cn(
                      'rounded-full border bg-background px-3 py-1 text-xs font-medium transition-colors hover:border-zinc-300',
                      bank === b.name && 'border-primary bg-primary/10 text-primary',
                    )}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="rec-note" className={SECTION_LABEL}>
              {t('form.note')}
            </Label>
            <Input id="rec-note" className={FIELD} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm font-medium has-[:checked]:border-emerald-500/30 has-[:checked]:bg-emerald-500/5">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden
                className={cn('size-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-muted-foreground/40')}
              />
              {t('recurring.isActive')}
            </span>
            <input
              type="checkbox"
              className="size-4 accent-emerald-600"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('summary.cancel')}
          </Button>
          <Button disabled={saving || !valid} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
