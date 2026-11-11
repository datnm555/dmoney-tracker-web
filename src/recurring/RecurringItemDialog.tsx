import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { MoneyInput } from '../accounts/MoneyInput'
import { digitsToNumber, toDigits } from '../accounts/moneyDigits'
import { getApiErrorMessage } from '../api/client'
import { createRecurringPayment, updateRecurringPayment } from '../api/recurringPaymentApi'
import { getSubCategories } from '../api/subCategoryApi'
import type { RecurringPaymentInput, RecurringPaymentResponse, SubCategoryResponse } from '../api/types'
import { useBanks } from '../banks/BanksContext'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { useI18n } from '../i18n/I18nContext'
import { PAYMENT_METHOD_CODES } from '../utils/paymentMethods'

const selectClass = 'h-9 rounded-md border border-input bg-transparent px-3 text-sm'

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
  }, [open, editing])

  useEffect(() => {
    if (!open) return
    getSubCategories()
      .then(setSubs)
      .catch(() => setSubs([]))
  }, [open])

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
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t('recurring.edit') : t('recurring.add')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="rec-name">{t('recurring.name')}</Label>
            <Input id="rec-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-category">{t('form.category')}</Label>
            <select
              id="rec-category"
              className={selectClass}
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value)
                setSubCategoryId('')
              }}
            >
              <option value="" />
              {categoryOptions
                .filter((c) => c.kind !== 'income')
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
            </select>
          </div>
          {categoryId && (
            <div className="grid gap-1.5">
              <Label htmlFor="rec-sub">{t('form.subCategory')}</Label>
              <select
                id="rec-sub"
                className={selectClass}
                value={subCategoryId}
                onChange={(e) => setSubCategoryId(e.target.value)}
              >
                <option value="" />
                {subs
                  .filter((s) => s.categoryId === categoryId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
          <MoneyInput id="rec-amount" label={t('recurring.amount')} digits={digits} onChange={setDigits} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isVariable} onChange={(e) => setIsVariable(e.target.checked)} />
            {t('recurring.isVariable')}
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-day">{t('recurring.dayOfMonth')}</Label>
            <Input
              id="rec-day"
              inputMode="numeric"
              value={day}
              onChange={(e) => setDay(e.target.value.replace(/\D/g, '').slice(0, 2))}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-pm">{t('payment.method')}</Label>
            <select
              id="rec-pm"
              className={selectClass}
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="" />
              {PAYMENT_METHOD_CODES.map((code) => (
                <option key={code} value={code}>
                  {t(`payment.${code}`)}
                </option>
              ))}
            </select>
          </div>
          <div role="group" aria-label={t('accounts.bank')} className="grid gap-1.5">
            <Label>{t('accounts.bank')}</Label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setBank(null)}
                className={cn(
                  'rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground',
                  bank === null && 'border-primary text-primary ring-1 ring-primary/30',
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
                    'rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium',
                    bank === b.name && 'border-primary text-primary ring-1 ring-primary/30',
                  )}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-note">{t('form.note')}</Label>
            <Input id="rec-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rec-start">{t('recurring.startPeriod')}</Label>
            <Input id="rec-start" type="month" value={startPeriod} onChange={(e) => setStartPeriod(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t('recurring.isActive')}
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
