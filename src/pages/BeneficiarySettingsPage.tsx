import { useState } from 'react'
import { Pencil, Plus, Star, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { deleteBeneficiary, setDefaultBeneficiary, updateBeneficiary } from '../api/beneficiaryApi'
import type { BeneficiaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreateBeneficiaryDialog } from '../beneficiaries/CreateBeneficiaryDialog'
import { useBeneficiaries } from '../beneficiaries/BeneficiariesContext'
import { SettingsBadge, SettingsEmpty, SettingsHeader, SettingsList, SettingsRow } from '../components/settings/SettingsKit'

// Tinted avatar palette; a name always maps to the same tint.
const AVATAR_TINTS = [
  'bg-primary/10 text-primary',
  'bg-sky-500/10 text-sky-700 dark:text-sky-400',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'bg-rose-500/10 text-rose-700 dark:text-rose-400',
  'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
]

function avatarTint(name: string): string {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + (ch.codePointAt(0) ?? 0)) | 0
  return AVATAR_TINTS[Math.abs(hash) % AVATAR_TINTS.length]
}

/** First letters of the first two words, e.g. "Gia đình" → "GĐ". */
function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  return words
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function BeneficiarySettingsPage() {
  const { t } = useI18n()
  const { beneficiaries, refresh } = useBeneficiaries()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<BeneficiaryResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<BeneficiaryResponse | null>(null)

  const submitRename = async () => {
    if (!editing || !editName.trim()) return
    try {
      await updateBeneficiary(editing.id, editName.trim())
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitSetDefault = async (beneficiary: BeneficiaryResponse) => {
    try {
      await setDefaultBeneficiary(beneficiary.id)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deleteBeneficiary(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (error) {
      // Server enforces the InUse guard (and default protection) — surface it here.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <SettingsHeader
        icon={Users}
        title={t('beneficiaries.title')}
        count={beneficiaries.length}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('beneficiaries.create')}
          </Button>
        }
      />

      {beneficiaries.length === 0 ? (
        <SettingsEmpty icon={Users}>{t('beneficiaries.create')}</SettingsEmpty>
      ) : (
        <SettingsList>
          {beneficiaries.map((beneficiary) => (
            <SettingsRow
              key={beneficiary.id}
              leading={
                <span
                  aria-hidden
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                    avatarTint(beneficiary.name),
                  )}
                >
                  {initials(beneficiary.name)}
                </span>
              }
              title={
                editing?.id === beneficiary.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                    autoFocus
                    className="h-8 max-w-xs"
                  />
                ) : (
                  <span className="truncate font-medium">{beneficiary.name}</span>
                )
              }
              badges={
                beneficiary.isDefault && <SettingsBadge tone="primary">{t('beneficiaries.default')}</SettingsBadge>
              }
              actions={
                <>
                  {!beneficiary.isDefault && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                      aria-label={`${t('beneficiaries.setDefault')} ${beneficiary.name}`}
                      onClick={() => void submitSetDefault(beneficiary)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={`${t('beneficiaries.rename')} ${beneficiary.name}`}
                    onClick={() => {
                      setEditing(beneficiary)
                      setEditName(beneficiary.name)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                    aria-label={`${t('beneficiaries.delete')} ${beneficiary.name}`}
                    onClick={() => setDeleting(beneficiary)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              }
            />
          ))}
        </SettingsList>
      )}

      <CreateBeneficiaryDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => refresh()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('beneficiaries.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submitDelete()}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
