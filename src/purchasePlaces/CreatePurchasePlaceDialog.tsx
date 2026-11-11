import { useState } from 'react'
import { toast } from 'sonner'
import { Store } from 'lucide-react'
import { NameCreateDialog } from '@/components/NameCreateDialog'
import { getApiErrorMessage } from '../api/client'
import { createPurchasePlace } from '../api/purchasePlaceApi'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful create; there is no selection concept to update. */
  onCreated: () => Promise<void> | void
}

export function CreatePurchasePlaceDialog({ open, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createPurchasePlace(name.trim())
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
      title={t('purchasePlaces.create')}
      icon={<Store />}
      inputId="create-purchase-place-name"
      label={t('purchasePlaces.name')}
      value={name}
      onChange={setName}
      onSubmit={() => void submit()}
      onClose={onClose}
      submitLabel={t('purchasePlaces.create')}
      submitDisabled={saving || !name.trim()}
      cancelLabel={t('summary.cancel')}
    />
  )
}
