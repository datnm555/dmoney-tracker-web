import { useCallback, useEffect, useState } from 'react'
import { CalendarClock, CirclePause, Pencil, Plus, Repeat, Trash2 } from 'lucide-react'
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('recurring.manage')}</DialogTitle>
          </DialogHeader>
          <Button
            className="justify-self-start rounded-full"
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('recurring.add')}
          </Button>
          <div className="grid gap-2">
            {items.length === 0 && (
              <div className="grid justify-items-center gap-2 rounded-xl border border-dashed py-8 text-sm text-muted-foreground">
                <Repeat className="size-7 text-muted-foreground/40" aria-hidden />
                <p>{t('recurring.empty')}</p>
              </div>
            )}
            {items.map((i) => (
              <div
                key={i.id}
                data-testid={`manage-${i.id}`}
                className={cn(
                  'flex items-center gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm transition-colors hover:bg-muted/40',
                  !i.isActive && 'border-dashed bg-muted/30',
                )}
              >
                <CategoryIcon
                  category={i.categoryId}
                  className={cn('h-10 w-10 rounded-xl [&_svg]:h-5 [&_svg]:w-5', !i.isActive && 'opacity-50 grayscale')}
                />
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {i.isActive ? (
                      <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                    ) : (
                      <CirclePause aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className={cn('truncate font-semibold', !i.isActive && 'text-muted-foreground line-through')}>
                      {i.name}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    {!i.isActive && (
                      <span
                        data-testid={`paused-${i.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300"
                      >
                        <CirclePause className="size-3 shrink-0" aria-hidden />
                        {t('recurring.paused')}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 font-medium text-muted-foreground ring-1 ring-inset ring-border tabular-nums">
                      <CalendarClock className="size-3 shrink-0" aria-hidden />
                      {t('recurring.dayOfMonth')}: {i.dayOfMonth}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {i.isVariable && i.amount.amount === 0 ? (
                    <span className="text-xs font-medium italic text-muted-foreground">{t('recurring.enterAmount')}</span>
                  ) : (
                    <span className={cn('font-bold tabular-nums', !i.isActive && 'text-muted-foreground')}>
                      {formatMoney(i.amount)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                    aria-label={t('recurring.edit')}
                    onClick={() => {
                      setEditing(i)
                      setFormOpen(true)
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-expense/10 hover:text-expense"
                    aria-label={t('summary.delete')}
                    onClick={() => setDeleting(i)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
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
