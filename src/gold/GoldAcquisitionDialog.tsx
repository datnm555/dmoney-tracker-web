import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '../api/client'
import { createGoldAcquisition, updateGoldAcquisition } from '../api/goldApi'
import type { GoldAcquisitionPayload, GoldAcquisitionResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { usePurchasePlaces } from '../purchasePlaces/PurchasePlacesContext'
import { useGoldTypes } from './GoldTypesContext'

interface Props {
  open: boolean
  /** null creates a new acquisition; otherwise the row being edited. */
  editing: GoldAcquisitionResponse | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

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

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t('goldAcq.edit') : t('goldAcq.add')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">{t('form.goldType')}</span>
            <Select
              value={goldTypeId ?? 'none'}
              onValueChange={(value) => setGoldTypeId(value === 'none' ? null : value)}
            >
              <SelectTrigger aria-label={t('form.goldType')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {goldTypes.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.goldType && <p className="text-xs text-expense">{errors.goldType}</p>}
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">{t('form.purchasePlace')}</span>
            <Select
              value={purchasePlaceId ?? 'none'}
              onValueChange={(value) => setPurchasePlaceId(value === 'none' ? null : value)}
            >
              <SelectTrigger aria-label={t('form.purchasePlace')} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {purchasePlaces.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ga-date">{t('goldAcq.date')}</Label>
            <Input id="ga-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            {errors.date && <p className="text-xs text-expense">{errors.date}</p>}
          </div>

          <div className="grid gap-1.5">
            <span className="text-xs text-muted-foreground">{t('goldAcq.quantity')}</span>
            <Input
              inputMode="decimal"
              aria-label={t('goldAcq.quantity')}
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value.replace(/[^\d.,]/g, ''))}
            />
            {errors.quantity && <p className="text-xs text-expense">{errors.quantity}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ga-unit-price">{t('goldAcq.unitPrice')}</Label>
            <div className="relative">
              <Input
                id="ga-unit-price"
                inputMode="numeric"
                className="pr-9"
                value={formatThousands(unitPriceDigits)}
                onChange={(e) => setUnitPriceDigits(e.target.value.replace(/\D/g, ''))}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
                ₫
              </span>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="ga-note">{t('goldAcq.note')}</Label>
            <Input id="ga-note" value={note} onChange={(e) => setNote(e.target.value)} />
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
