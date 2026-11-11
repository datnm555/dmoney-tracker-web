import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { CircleCheck, History } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getApiErrorMessage } from '../api/client'
import { getRecords } from '../api/recurringPaymentApi'
import type { RecurringPaymentRecordResponse, RecurringPaymentResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'

export function RecordHistoryDialog({
  item,
  onClose,
}: {
  item: RecurringPaymentResponse | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const [records, setRecords] = useState<RecurringPaymentRecordResponse[]>([])

  useEffect(() => {
    if (!item) return
    setRecords([])
    getRecords(item.id)
      .then((r) => setRecords([...r].sort((a, b) => b.period.localeCompare(a.period))))
      .catch((error) => toast.error(getApiErrorMessage(error, t('error.network'))))
  }, [item, t])

  return (
    <Dialog open={item !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <History className="size-4" aria-hidden />
            </span>
            <span className="min-w-0 truncate">
              {t('recurring.history')}: {item?.name}
            </span>
          </DialogTitle>
        </DialogHeader>
        <ul className="-mx-2 grid max-h-80 overflow-y-auto">
          {records.map((r) => {
            const paid = dayjs(r.paidDate)
            return (
              <li
                key={r.id}
                className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-emerald-500/10 py-1.5 leading-none text-emerald-700 dark:text-emerald-300">
                  <span className="text-lg font-bold tabular-nums">{paid.format('DD')}</span>
                  <span className="mt-0.5 text-[10px] tabular-nums opacity-70">{paid.format('MM/YYYY')}</span>
                </div>
                <div className="grid min-w-0 flex-1 gap-1">
                  <div className="font-semibold tabular-nums">{dayjs(`${r.period}-01`).format('MM/YYYY')}</div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-300">
                      <CircleCheck className="size-3 shrink-0" aria-hidden />
                      {t('recurring.paid')}
                    </span>
                    <span className="tabular-nums">
                      {t('recurring.paidOn')} {paid.format('DD/MM/YYYY')}
                    </span>
                  </div>
                </div>
                <span className="shrink-0 text-right font-bold tabular-nums">{formatMoney(r.amount)}</span>
              </li>
            )
          })}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
