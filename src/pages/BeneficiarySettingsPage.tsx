import { useState } from 'react'
import { Pencil, Plus, Star, Trash2 } from 'lucide-react'
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
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getApiErrorMessage } from '../api/client'
import { deleteBeneficiary, setDefaultBeneficiary, updateBeneficiary } from '../api/beneficiaryApi'
import type { BeneficiaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreateBeneficiaryDialog } from '../beneficiaries/CreateBeneficiaryDialog'
import { useBeneficiaries } from '../beneficiaries/BeneficiariesContext'

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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('beneficiaries.title')}</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('beneficiaries.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {beneficiaries.map((beneficiary) => (
            <div key={beneficiary.id} className="flex items-center gap-3 px-4 py-3">
              {editing?.id === beneficiary.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                  autoFocus
                  className="max-w-xs"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{beneficiary.name}</span>
              )}
              {beneficiary.isDefault && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {t('beneficiaries.default')}
                </span>
              )}
              {!beneficiary.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
            </div>
          ))}
        </CardContent>
      </Card>

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
