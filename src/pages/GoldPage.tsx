import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getApiErrorMessage } from '../api/client'
import { deleteGoldAcquisition, getGoldSummary } from '../api/goldApi'
import type { GoldAcquisitionResponse, GoldSummaryResponse } from '../api/types'
import { GoldAcquisitionDialog } from '../gold/GoldAcquisitionDialog'
import { useI18n } from '../i18n/I18nContext'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

type HistoryRow =
  | { kind: 'tx'; date: string; key: string; tx: GoldSummaryResponse['transactions'][number] }
  | { kind: 'acq'; date: string; key: string; acq: GoldAcquisitionResponse }

export function GoldPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<GoldSummaryResponse | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; editing: GoldAcquisitionResponse | null }>({
    open: false,
    editing: null,
  })
  const [deleting, setDeleting] = useState<GoldAcquisitionResponse | null>(null)

  const load = useCallback(async () => {
    try {
      setSummary(await getGoldSummary())
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [t])

  useEffect(() => {
    void load()
  }, [load])

  const types = summary?.types ?? []
  const transactions = summary?.transactions ?? []
  const acquisitions = summary?.acquisitions ?? []

  const historyRows: HistoryRow[] = [
    ...transactions.map((tx) => ({ kind: 'tx' as const, date: tx.date, key: tx.transactionId, tx })),
    ...acquisitions.map((acq) => ({ kind: 'acq' as const, date: acq.date, key: acq.id, acq })),
  ].sort((x, y) => y.date.localeCompare(x.date))

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteGoldAcquisition(deleting.id)
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t('gold.title')}</h1>
        <Button onClick={() => setDialog({ open: true, editing: null })}>
          <Plus className="mr-1 h-4 w-4" />
          {t('goldAcq.add')}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {types.map((type) => (
          <Card key={type.goldTypeId}>
            <CardContent className="grid gap-1.5 p-4">
              <div className="font-semibold">{type.name}</div>
              <div className="text-2xl font-bold">
                {formatGoldQuantity(type.heldQuantity)} {t('gold.unit')}
              </div>
              <div className="grid gap-0.5 text-xs text-muted-foreground">
                <span>
                  {t('gold.bought')}: {formatGoldQuantity(type.boughtQuantity)} · {t('gold.sold')}:{' '}
                  {formatGoldQuantity(type.soldQuantity)}
                </span>
                <span>
                  {t('gold.avgCost')}: {formatMoney(type.averageCostPerChi)}
                </span>
                <span>
                  {t('gold.totalSpent')}: {formatMoney(type.totalSpent)} · {t('gold.totalReceived')}:{' '}
                  {formatMoney(type.totalReceived)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="px-4 pt-4 font-semibold">{t('gold.history')}</div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('form.date')}</TableHead>
                <TableHead>{t('form.content')}</TableHead>
                <TableHead>{t('form.goldType')}</TableHead>
                <TableHead className="text-right">{t('form.goldQuantity')}</TableHead>
                <TableHead className="text-right">{t('form.amount')}</TableHead>
                <TableHead className="text-right">{t('gold.pricePerChi')}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((row) =>
                row.kind === 'tx' ? (
                  <TableRow key={row.key}>
                    <TableCell>{dayjs(row.tx.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {row.tx.debit.amount > 0 ? t('gold.buy') : t('gold.sell')}
                        </Badge>
                        <span className="font-medium">{row.tx.content}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.tx.goldTypeName}
                      {row.tx.purchasePlaceName && (
                        <span className="text-xs text-muted-foreground"> · {row.tx.purchasePlaceName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatGoldQuantity(row.tx.goldQuantity)} {t('gold.unit')}
                    </TableCell>
                    <TableCell
                      className={
                        row.tx.debit.amount > 0
                          ? 'text-right font-medium text-expense'
                          : 'text-right font-medium text-income'
                      }
                    >
                      {row.tx.debit.amount > 0
                        ? `−${formatMoney(row.tx.debit)}`
                        : `+${formatMoney(row.tx.credit)}`}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(row.tx.pricePerChi)}</TableCell>
                    <TableCell />
                  </TableRow>
                ) : (
                  <TableRow key={row.key}>
                    <TableCell>{dayjs(row.acq.date).format('DD/MM/YYYY')}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{t('goldAcq.badge')}</Badge>
                        <span className="font-medium">{row.acq.note || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.acq.goldTypeName}
                      {row.acq.purchasePlaceName && (
                        <span className="text-xs text-muted-foreground"> · {row.acq.purchasePlaceName}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatGoldQuantity(row.acq.quantity)} {t('gold.unit')}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatMoney(row.acq.value)}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(row.acq.unitPrice)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={t('goldAcq.edit')}
                          onClick={() => setDialog({ open: true, editing: row.acq })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                          aria-label={t('goldAcq.deleteConfirm')}
                          onClick={() => setDeleting(row.acq)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              )}
              {historyRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    {t('gold.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <GoldAcquisitionDialog
        open={dialog.open}
        editing={dialog.editing}
        onClose={() => setDialog({ open: false, editing: null })}
        onSaved={load}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('goldAcq.deleteConfirm')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
