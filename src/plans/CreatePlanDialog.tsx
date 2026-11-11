import { useState } from 'react'
import { toast } from 'sonner'
import { ClipboardList } from 'lucide-react'
import { NameCreateDialog } from '@/components/NameCreateDialog'
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
    <NameCreateDialog
      open={open}
      title={t('plans.create')}
      icon={<ClipboardList />}
      inputId="create-plan-name"
      label={t('plans.name')}
      value={name}
      onChange={setName}
      onSubmit={() => void submit()}
      onClose={onClose}
      submitLabel={t('plans.create')}
      submitDisabled={saving || !name.trim()}
      cancelLabel={t('summary.cancel')}
    />
  )
}
