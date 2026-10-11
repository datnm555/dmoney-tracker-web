import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { deletePurchasePlace, updatePurchasePlace } from '../api/purchasePlaceApi'
import type { PurchasePlaceResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreatePurchasePlaceDialog } from '../purchasePlaces/CreatePurchasePlaceDialog'
import { usePurchasePlaces } from '../purchasePlaces/PurchasePlacesContext'

export function PurchasePlaceSettingsPage() {
  const { t } = useI18n()
  const { purchasePlaces, refresh } = usePurchasePlaces()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<PurchasePlaceResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<PurchasePlaceResponse | null>(null)

  const submitRename = async () => {
    if (!editing || !editName.trim()) return
    try {
      await updatePurchasePlace(editing.id, editName.trim())
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deletePurchasePlace(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (error) {
      // Server enforces the InUse guard — surface it here.
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('purchasePlaces.title')}</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('purchasePlaces.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {purchasePlaces.map((purchasePlace) => (
            <div key={purchasePlace.id} className="flex items-center gap-3 px-4 py-3">
              {editing?.id === purchasePlace.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                  autoFocus
                  className="max-w-xs"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{purchasePlace.name}</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={`${t('purchasePlaces.rename')} ${purchasePlace.name}`}
                onClick={() => {
                  setEditing(purchasePlace)
                  setEditName(purchasePlace.name)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                aria-label={`${t('purchasePlaces.delete')} ${purchasePlace.name}`}
                onClick={() => setDeleting(purchasePlace)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <CreatePurchasePlaceDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => refresh()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('purchasePlaces.deleteConfirm')}</AlertDialogTitle>
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
