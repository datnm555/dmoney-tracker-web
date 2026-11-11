import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Check, Coins } from 'lucide-react'
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
import { getApiErrorMessage } from '../api/client'
import { createGoldAcquisition, updateGoldAcquisition } from '../api/goldApi'
import type { GoldAcquisitionPayload, GoldAcquisitionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { usePurchasePlaces } from '../purchasePlaces/PurchasePlacesContext'
import { useGoldTypes } from './GoldTypesContext'

interface Props {
  open: boolean
  /** null creates a new acquisition; otherwise the row being edited. */
  editing: GoldAcquisitionResponse | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

/** Small muted uppercase heading, same as DialogSectionLabel, for a <Label>. */
const SECTION_LABEL = 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'

const formatThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')

export function GoldAcquisitionDialog({ open, editing, onClose, onSaved }: Props) {
  const { t } = useI18n()
  const { goldTypes } = useGoldTypes()
  const { purchasePlaces } = usePurchasePlaces()
  const [goldTypeId, setGoldTypeId] = useState<string | null>(null)
  const [purchasePlaceId, setPurchasePlaceId] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [quantityText, setQuantityText] = useState('')
  const [unitPriceDigits, setUnitPriceDigits] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    setErrors({})
    if (editing) {
      setGoldTypeId(editing.goldTypeId)
      setPurchasePlaceId(editing.purchasePlaceId)
      setDate(editing.date)
      setQuantityText(String(editing.quantity))
      setUnitPriceDigits(String(editing.unitPrice.amount))
      setNote(editing.note ?? '')
    } else {
      setGoldTypeId(null)
      setPurchasePlaceId(null)
      setDate(dayjs().format('YYYY-MM-DD'))
      setQuantityText('')
      setUnitPriceDigits('')
      setNote('')
    }
  }, [open, editing])

  const submit = async () => {
    const quantity = Number(quantityText.replace(',', '.'))
    const nextErrors: Record<string, string> = {}
    if (!date) nextErrors.date = t('form.dateRequired')
    if (goldTypeId === null) nextErrors.goldType = t('form.goldTypeRequired')
    if (quantityText === '' || Number.isNaN(quantity) || quantity <= 0) {
      nextErrors.quantity = t('form.goldQuantityRequired')
    }
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    const payload: GoldAcquisitionPayload = {
      goldTypeId: goldTypeId as string,
      date,
      quantity,
      unitPrice: Number(unitPriceDigits || '0'),
      note: note.trim() || null,
      purchasePlaceId,
    }

    setSaving(true)
    try {
      if (editing) {
        await updateGoldAcquisition(editing.id, payload)
      } else {
        await createGoldAcquisition(payload)
      }
      await onSaved()
      onClose()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSaving(false)
    }
  }

  // Live "quantity × unit price" value, shown as the dialog's headline figure.
  const quantityValue = Number(quantityText.replace(',', '.'))
  const totalValue =
    quantityText !== '' && !Number.isNaN(quantityValue) && quantityValue > 0
      ? Math.round(quantityValue * Number(unitPriceDigits || '0'))
      : 0

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-300 to-amber-600 shadow-sm shadow-amber-900/20"
            >
              <Coins className="size-4 text-amber-950" />
            </span>
            {editing ? t('goldAcq.edit') : t('goldAcq.add')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-5">
          <div className="grid gap-3 rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-card to-card p-4 dark:border-amber-500/20 dark:from-amber-500/10">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <DialogSectionLabel aria-hidden="true">{t('goldAcq.quantity')}</DialogSectionLabel>
                <div className="relative">
                  <Input
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder="0"
                    aria-label={t('goldAcq.quantity')}
                    className="h-12 rounded-xl bg-background pr-12 text-2xl font-bold tabular-nums text-amber-700 focus-visible:border-amber-400 focus-visible:ring-amber-400/30 md:text-2xl dark:text-amber-300"
                    value={quantityText}
                    onChange={(e) => setQuantityText(e.target.value.replace(/[^\d.,]/g, ''))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                    {t('gold.unit')}
                  </span>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="ga-unit-price" className={SECTION_LABEL}>
                  {t('goldAcq.unitPrice')}
                </Label>
                <div className="relative">
                  <Input
                    id="ga-unit-price"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="0"
                    className="h-12 rounded-xl bg-background pr-8 text-lg font-semibold tabular-nums focus-visible:border-amber-400 focus-visible:ring-amber-400/30 md:text-lg"
                    value={formatThousands(unitPriceDigits)}
                    onChange={(e) => setUnitPriceDigits(e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                    ₫
                  </span>
                </div>
              </div>
            </div>
            {errors.quantity && <p className="text-xs text-expense">{errors.quantity}</p>}
            <div
              data-testid="gold-acq-total"
              className="flex items-baseline justify-between gap-3 border-t border-amber-200/60 pt-3 dark:border-amber-500/20"
            >
              <span className="text-xs font-medium text-muted-foreground">{t('gold.totalSpent')}</span>
              <span className="bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-700 bg-clip-text text-2xl font-extrabold tracking-tight text-transparent tabular-nums">
                {formatMoney({ amount: totalValue, currency: 'VND' })}
              </span>
            </div>
          </div>

          <div role="radiogroup" aria-label={t('form.goldType')} className="grid gap-2">
            <DialogSectionLabel>{t('form.goldType')}</DialogSectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {goldTypes.map((g) => (
                <GoldPill
                  key={g.id}
                  label={g.name}
                  selected={goldTypeId === g.id}
                  onClick={() => setGoldTypeId(goldTypeId === g.id ? null : g.id)}
                />
              ))}
            </div>
            {errors.goldType && <p className="text-xs text-expense">{errors.goldType}</p>}
          </div>

          <div role="radiogroup" aria-label={t('form.purchasePlace')} className="grid gap-2">
            <DialogSectionLabel>{t('form.purchasePlace')}</DialogSectionLabel>
            <div className="flex flex-wrap gap-1.5">
              <GoldPill
                label="—"
                selected={purchasePlaceId === null}
                onClick={() => setPurchasePlaceId(null)}
              />
              {purchasePlaces.map((p) => (
                <GoldPill
                  key={p.id}
                  label={p.name}
                  selected={purchasePlaceId === p.id}
                  onClick={() => setPurchasePlaceId(purchasePlaceId === p.id ? null : p.id)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
            <Label htmlFor="ga-date" className={SECTION_LABEL}>
              {t('goldAcq.date')}
            </Label>
            <Input
              id="ga-date"
              type="date"
              className="rounded-xl"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            {errors.date && <p className="col-start-2 text-xs text-expense">{errors.date}</p>}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ga-note" className={SECTION_LABEL}>
              {t('goldAcq.note')}
            </Label>
            <Input id="ga-note" className="h-11 rounded-xl" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('summary.cancel')}</Button>
          <Button disabled={saving} onClick={() => void submit()}>
            {t('summary.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Soft rounded pill with a gold ring when selected (gold type / purchase place pickers). */
function GoldPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-amber-500 bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/30 dark:text-amber-200'
          : 'bg-background text-muted-foreground hover:border-amber-300 hover:text-foreground',
      )}
    >
      {selected && <Check className="size-3.5" aria-hidden="true" />}
      {label}
    </button>
  )
}
