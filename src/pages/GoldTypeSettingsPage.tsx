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
import { deleteGoldType, updateGoldType } from '../api/goldApi'
import type { GoldTypeResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreateGoldTypeDialog } from '../gold/CreateGoldTypeDialog'
import { useGoldTypes } from '../gold/GoldTypesContext'

export function GoldTypeSettingsPage() {
  const { t } = useI18n()
  const { goldTypes, refresh } = useGoldTypes()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<GoldTypeResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<GoldTypeResponse | null>(null)

  const submitRename = async () => {
    if (!editing || !editName.trim()) return
    try {
      await updateGoldType(editing.id, editName.trim())
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deleteGoldType(deleting.id)
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
        <h1 className="text-xl font-bold">{t('goldTypes.title')}</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('goldTypes.create')}
        </Button>
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {goldTypes.map((goldType) => (
            <div key={goldType.id} className="flex items-center gap-3 px-4 py-3">
              {editing?.id === goldType.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                  autoFocus
                  className="max-w-xs"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{goldType.name}</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={`${t('goldTypes.rename')} ${goldType.name}`}
                onClick={() => {
                  setEditing(goldType)
                  setEditName(goldType.name)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                aria-label={`${t('goldTypes.delete')} ${goldType.name}`}
                onClick={() => setDeleting(goldType)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <CreateGoldTypeDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => refresh()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goldTypes.deleteConfirm')}</AlertDialogTitle>
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
