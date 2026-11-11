import { useState } from 'react'
import { MapPin, Pencil, Plus, Store, Trash2 } from 'lucide-react'
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
import { getApiErrorMessage } from '../api/client'
import {
  SettingsEmpty,
  SettingsHeader,
  SettingsIconTile,
  SettingsList,
  SettingsRow,
} from '../components/settings/SettingsKit'
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
      <SettingsHeader
        icon={Store}
        title={t('purchasePlaces.title')}
        count={purchasePlaces.length}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('purchasePlaces.create')}
          </Button>
        }
      />

      {purchasePlaces.length === 0 ? (
        <SettingsEmpty icon={Store}>{t('purchasePlaces.create')}</SettingsEmpty>
      ) : (
        <SettingsList>
          {purchasePlaces.map((purchasePlace) => (
            <SettingsRow
              key={purchasePlace.id}
              leading={<SettingsIconTile icon={MapPin} className="bg-sky-500/10 text-sky-600 dark:text-sky-400" />}
              title={
                editing?.id === purchasePlace.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                    autoFocus
                    className="h-8 max-w-xs"
                  />
                ) : (
                  <span className="truncate font-medium">{purchasePlace.name}</span>
                )
              }
              actions={
                <>
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
                </>
              }
            />
          ))}
        </SettingsList>
      )}

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
