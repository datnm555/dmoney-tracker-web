import { useState } from 'react'
import { ChevronDown, ChevronUp, Landmark, Pencil, Plus, Star, Trash2 } from 'lucide-react'
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
import { deleteBank, reorderBanks, setDefaultBank, updateBank } from '../api/bankApi'
import type { BankResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { CreateBankDialog } from '../banks/CreateBankDialog'
import { bankBrand } from '../banks/bankBrand'
import { SettingsBadge, SettingsEmpty, SettingsHeader, SettingsList, SettingsRow } from '../components/settings/SettingsKit'
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
      <SettingsHeader
        icon={Landmark}
        title={t('banks.title')}
        description={t('banks.orderHint')}
        count={banks.length}
        action={
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" />
            {t('banks.create')}
          </Button>
        }
      />

      {banks.length === 0 ? (
        <SettingsEmpty icon={Landmark}>{t('banks.create')}</SettingsEmpty>
      ) : (
        <SettingsList>
          {banks.map((bank, index) => {
            const brand = bankBrand(bank.name)
            return (
              <SettingsRow
                key={bank.id}
                leading={
                  <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: brand.color }}
                  >
                    {brand.short}
                  </span>
                }
                title={
                  editing?.id === bank.id ? (
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void submitRename()}
                      autoFocus
                      className="h-8 max-w-xs"
                    />
                  ) : (
                    <span className="truncate font-medium">{bank.name}</span>
                  )
                }
                meta={<span className="tabular-nums">#{index + 1}</span>}
                badges={bank.isDefault && <SettingsBadge tone="primary">{t('banks.default')}</SettingsBadge>}
                actions={
                  <>
                    {!bank.isDefault && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-amber-500"
                        aria-label={`${t('banks.setDefault')} ${bank.name}`}
                        onClick={() => void submitSetDefault(bank)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <div className="flex rounded-lg bg-muted/60">
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
                  </>
                }
              />
            )
          })}
        </SettingsList>
      )}

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
