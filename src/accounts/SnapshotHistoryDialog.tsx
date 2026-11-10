import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { deleteSnapshot, getSnapshots } from '../api/accountApi'
import { getApiErrorMessage } from '../api/client'
import type { AccountResponse, AccountSnapshotResponse } from '../api/types'
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
        <div className="max-h-[60vh] divide-y overflow-y-auto">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-3 py-2">
              <span className="w-24 text-sm text-muted-foreground">{dayjs(s.date).format('DD/MM/YYYY')}</span>
              <span
                className={`flex-1 text-right text-sm font-medium tabular-nums ${isDebtType(account.type) ? 'text-expense' : 'text-income'}`}
              >
                {formatMoney(s.balance)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label={`${t('accounts.edit')} ${s.date}`}
                onClick={() => onEdit(s)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-expense"
                aria-label={`${t('summary.delete')} ${s.date}`}
                onClick={() => void remove(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
