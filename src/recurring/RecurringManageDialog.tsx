import { useCallback, useEffect, useState } from 'react'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { deleteRecurringPayment, getRecurringPayments } from '../api/recurringPaymentApi'
import type { RecurringPaymentResponse } from '../api/types'
import { CategoryIcon } from '../components/CategoryIcon'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { RecurringItemDialog } from './RecurringItemDialog'

export function RecurringManageDialog({
  open,
  onClose,
  onChanged,
}: {
  open: boolean
  onClose: () => void
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [items, setItems] = useState<RecurringPaymentResponse[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringPaymentResponse | null>(null)
  const [deleting, setDeleting] = useState<RecurringPaymentResponse | null>(null)

  const load = useCallback(async () => {
    try {
      setItems(await getRecurringPayments())
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    if (open) void load()
  }, [open, load])

  const saved = () => {
    void load()
    onChanged()
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteRecurringPayment(deleting.id)
      setDeleting(null)
      saved()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('recurring.manage')}</DialogTitle>
          </DialogHeader>
          <Button
            className="justify-self-start"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('recurring.add')}
          </Button>
          <div className="grid gap-2">
            {items.length === 0 && <p className="text-sm text-muted-foreground">{t('recurring.empty')}</p>}
            {items.map((i) => (
              <div
                key={i.id}
                data-testid={`manage-${i.id}`}
                className={cn('flex items-center gap-2 rounded-md border px-3 py-2 text-sm', !i.isActive && 'opacity-50')}
              >
                <CategoryIcon category={i.categoryId} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{i.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t('recurring.dayOfMonth')}: {i.dayOfMonth}
                    {' · '}
                    {i.isVariable && i.amount.amount === 0 ? t('recurring.enterAmount') : formatMoney(i.amount)}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t('recurring.edit')}
                  onClick={() => {
                    setEditing(i)
                    setFormOpen(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" aria-label={t('summary.delete')} onClick={() => setDeleting(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <RecurringItemDialog open={formOpen} editing={editing} onClose={() => setFormOpen(false)} onSaved={saved} />
      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('recurring.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.name}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
