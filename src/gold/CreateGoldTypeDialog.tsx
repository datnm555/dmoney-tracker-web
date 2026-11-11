import { useState } from 'react'
import { toast } from 'sonner'
import { Coins } from 'lucide-react'
import { NameCreateDialog } from '@/components/NameCreateDialog'
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
    <NameCreateDialog
      open={open}
      title={t('goldTypes.create')}
      icon={<Coins />}
      iconClassName="bg-gradient-to-br from-yellow-300 to-amber-600 text-amber-950 shadow-sm shadow-amber-900/20"
      inputId="create-gold-type-name"
      label={t('goldTypes.name')}
      value={name}
      onChange={setName}
      onSubmit={() => void submit()}
      onClose={onClose}
      submitLabel={t('goldTypes.create')}
      submitDisabled={saving || !name.trim()}
      cancelLabel={t('summary.cancel')}
    />
  )
}
