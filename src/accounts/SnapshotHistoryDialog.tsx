import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Pencil, Trash2 } from 'lucide-react'
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
import { deleteSnapshot, getSnapshots } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
import { cn } from '@/lib/utils'
import { useI18n } from '../i18n/I18nContext'
import { isDebtType } from '../utils/accounts'
import { formatMoney } from '../utils/money'

export function SnapshotHistoryDialog({
  account,
  refreshKey,
  onClose,
  onEdit,
  onChanged,
}: {
  account: AccountResponse | null
  refreshKey: number
  onClose: () => void
  onEdit: (snapshot: AccountSnapshotResponse) => void
  onChanged: () => void
}) {
  const { t } = useI18n()
  const [rows, setRows] = useState<AccountSnapshotResponse[]>([])
  const [deleting, setDeleting] = useState<AccountSnapshotResponse | null>(null)
  const accountId = account?.id

  const load = useCallback(
    async (isStale: () => boolean = () => false) => {
      if (!accountId) return
      try {
        const data = await getSnapshots(accountId)
        if (!isStale()) setRows(data)
      } catch (error) {
        if (!isStale()) toast.error(getApiErrorMessage(error, t('error.network')))
      }
    },
    [accountId, t],
  )

  useEffect(() => {
    let cancelled = false
    setRows([])
    void load(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [load, refreshKey])

  if (!account) return null
  const debt = isDebtType(account.type)

  const remove = async (id: string) => {
    try {
      await deleteSnapshot(id)
      await load()
      onChanged()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('accounts.history')} · {account.name}
          </DialogTitle>
        </DialogHeader>
        <ul className="-mx-1 max-h-[60vh] divide-y overflow-y-auto">
          {rows.map((s, i) => {
            const date = dayjs(s.date)
            const prev = rows[i + 1]
            const delta = prev ? s.balance.amount - prev.balance.amount : null
            return (
              <li key={s.id} className="flex items-center gap-3 px-1 py-2.5">
                <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-muted/60 py-1.5 leading-none">
                  <span className="text-lg font-bold tabular-nums">{date.format('DD')}</span>
                  <span className="mt-0.5 text-[10px] text-muted-foreground tabular-nums">{date.format('MM/YYYY')}</span>
                </div>
                <div className="grid min-w-0 flex-1 justify-items-end gap-0.5 text-right">
                  <span className={cn('text-sm font-bold tabular-nums', debt ? 'text-expense' : 'text-income')}>
                    {formatMoney(s.balance)}
                  </span>
                  {(delta !== null && delta !== 0) || s.note ? (
                    <span className="flex max-w-full items-center gap-1.5 text-[11px] text-muted-foreground">
                      {s.note && <span className="truncate">{s.note}</span>}
                      {delta !== null && delta !== 0 && (
                        <span className="shrink-0 tabular-nums">
                          {delta > 0 ? '+' : '−'}
                          {formatMoney({ ...s.balance, amount: Math.abs(delta) })}
                        </span>
                      )}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label={`${t('accounts.edit')} ${s.date}`}
                    onClick={() => onEdit(s)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                    aria-label={`${t('summary.delete')} ${s.date}`}
                    onClick={() => setDeleting(s)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      </DialogContent>
      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('accounts.deleteSnapshotConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${dayjs(deleting.date).format('DD/MM/YYYY')} · ${formatMoney(deleting.balance)}` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleting) void remove(deleting.id)
                setDeleting(null)
              }}
            >
              {t('summary.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
