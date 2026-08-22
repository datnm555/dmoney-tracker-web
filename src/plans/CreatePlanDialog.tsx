import { useState } from 'react'
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
import { getApiErrorMessage } from '../api/client'
import { createPlan } from '../api/planApi'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  open: boolean
  onClose: () => void
  /** Called with the new plan id after a successful create. */
  onCreated: (id: string) => Promise<void> | void
}

export function CreatePlanDialog({ open, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { id } = await createPlan(name.trim())
      toast.success(t('plans.created'))
      setName('')
      await onCreated(id)
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
          <DialogTitle>{t('plans.create')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">{t('plans.name')}</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('summary.cancel')}</Button>
          <Button disabled={saving || !name.trim()} onClick={() => void submit()}>
            {t('plans.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
