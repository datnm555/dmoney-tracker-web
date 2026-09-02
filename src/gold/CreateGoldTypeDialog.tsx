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
import { createGoldType } from '../api/goldApi'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful create; there is no selection concept to update. */
  onCreated: () => Promise<void> | void
}

export function CreateGoldTypeDialog({ open, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createGoldType(name.trim())
      setName('')
      await onCreated()
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
          <DialogTitle>{t('goldTypes.create')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">{t('goldTypes.name')}</span>
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
            {t('goldTypes.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
