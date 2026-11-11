import { useState } from 'react'
import { ChevronDown, ChevronUp, Pencil, Plus, Star, Trash2 } from 'lucide-react'
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
import { deleteBank, reorderBanks, setDefaultBank, updateBank } from '../api/bankApi'
import type { BankResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreateBankDialog } from '../banks/CreateBankDialog'
import { useBanks } from '../banks/BanksContext'

export function BankSettingsPage() {
  const { t } = useI18n()
  const { banks, refresh } = useBanks()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<BankResponse | null>(null)
  const [editName, setEditName] = useState('')
  const [deleting, setDeleting] = useState<BankResponse | null>(null)

  const submitRename = async () => {
    if (!editing || !editName.trim()) return
    try {
      await updateBank(editing.id, editName.trim())
      setEditing(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitSetDefault = async (bank: BankResponse) => {
    try {
      await setDefaultBank(bank.id)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  // Swap with the neighbour and send the whole list: the API takes the full order.
  const move = async (index: number, delta: -1 | 1) => {
    const ids = banks.map((b) => b.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    try {
      await reorderBanks(ids)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const submitDelete = async () => {
    if (!deleting) return
    try {
      await deleteBank(deleting.id)
      setDeleting(null)
      await refresh()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('banks.title')}</h1>
        <Button onClick={() => setCreating(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('banks.create')}
        </Button>
      </div>

      <p className="-mt-2 text-xs text-muted-foreground">{t('banks.orderHint')}</p>

      <Card>
        <CardContent className="divide-y p-0">
          {banks.map((bank, index) => (
            <div key={bank.id} className="flex items-center gap-3 px-4 py-3">
              <span className="w-5 shrink-0 text-center text-xs font-semibold tabular-nums text-muted-foreground">
                {index + 1}
              </span>
              {editing?.id === bank.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                  autoFocus
                  className="max-w-xs"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate font-medium">{bank.name}</span>
              )}
              {bank.isDefault && (
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10.5px] text-muted-foreground">
                  {t('banks.default')}
                </span>
              )}
              {!bank.isDefault && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  aria-label={`${t('banks.setDefault')} ${bank.name}`}
                  onClick={() => void submitSetDefault(bank)}
                >
                  <Star className="h-4 w-4" />
                </Button>
              )}
              <div className="flex">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 text-muted-foreground hover:text-foreground"
                  aria-label={`${t('banks.moveUp')} ${bank.name}`}
                  disabled={index === 0}
                  onClick={() => void move(index, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-7 text-muted-foreground hover:text-foreground"
                  aria-label={`${t('banks.moveDown')} ${bank.name}`}
                  disabled={index === banks.length - 1}
                  onClick={() => void move(index, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                aria-label={`${t('banks.rename')} ${bank.name}`}
                onClick={() => {
                  setEditing(bank)
                  setEditName(bank.name)
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                aria-label={`${t('banks.delete')} ${bank.name}`}
                onClick={() => setDeleting(bank)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <CreateBankDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={() => refresh()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('banks.deleteConfirm')}</AlertDialogTitle>
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
