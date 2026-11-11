import { useState } from 'react'
import { toast } from 'sonner'
import { Landmark } from 'lucide-react'
import { NameCreateDialog } from '@/components/NameCreateDialog'
import { getApiErrorMessage } from '../api/client'
import { createBank } from '../api/bankApi'
import { useI18n } from '../i18n/I18nContext'

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful create; there is no selection concept to update. */
  onCreated: () => Promise<void> | void
}

export function CreateBankDialog({ open, onClose, onCreated }: Props) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await createBank(name.trim())
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
      title={t('banks.create')}
      icon={<Landmark />}
      inputId="create-bank-name"
      label={t('banks.name')}
      value={name}
      onChange={setName}
      onSubmit={() => void submit()}
      onClose={onClose}
      submitLabel={t('banks.create')}
      submitDisabled={saving || !name.trim()}
      cancelLabel={t('summary.cancel')}
    />
  )
}
