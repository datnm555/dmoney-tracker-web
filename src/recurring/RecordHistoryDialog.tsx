import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
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
          <DialogTitle>
            {t('recurring.history')}: {item?.name}
          </DialogTitle>
        </DialogHeader>
        <div className="grid max-h-80 gap-2 overflow-y-auto">
          {records.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{dayjs(`${r.period}-01`).format('MM/YYYY')}</div>
                <div className="text-xs text-muted-foreground">
                  {t('recurring.paidOn')} {dayjs(r.paidDate).format('DD/MM/YYYY')}
                </div>
              </div>
              <span className="font-bold tabular-nums">{formatMoney(r.amount)}</span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
