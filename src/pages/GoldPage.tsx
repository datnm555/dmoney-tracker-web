import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, Coins, Pencil, Plus, Scale, Trash2 } from 'lucide-react'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

  const currency = types[0]?.totalSpent.currency ?? 'VND'
  const totalHeld = types.reduce((sum, type) => sum + type.heldQuantity, 0)
  const totalBought = types.reduce((sum, type) => sum + type.boughtQuantity, 0)
  const totalSold = types.reduce((sum, type) => sum + type.soldQuantity, 0)
  const totalSpent = { amount: types.reduce((sum, type) => sum + type.totalSpent.amount, 0), currency }
  const totalReceived = {
    amount: types.reduce((sum, type) => sum + type.totalReceived.amount, 0),
    currency,
  }
  const avgCost = { amount: totalBought > 0 ? totalSpent.amount / totalBought : 0, currency }
  const heldBreakdown = types
    .filter((type) => type.heldQuantity > 0)
    .map((type) => `${type.name} ${formatGoldQuantity(type.heldQuantity)}`)
    .join(' · ')

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

      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {t('gold.overview')}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('gold.held')}</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
              <Coins className="h-4 w-4 text-amber-500" />
            </span>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold">
              {formatGoldQuantity(totalHeld)}{' '}
              <span className="text-sm font-medium text-muted-foreground">{t('gold.unit')}</span>
            </div>
            {heldBreakdown && <p className="text-xs text-muted-foreground">{heldBreakdown}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('gold.totalSpent')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-expense/10">
              <ArrowDownRight className="h-4 w-4 text-expense" />
            </span>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold text-expense">−{formatMoney(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {t('gold.bought')} {formatGoldQuantity(totalBought)} {t('gold.unit')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('gold.totalReceived')}
            </CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-income/10">
              <ArrowUpRight className="h-4 w-4 text-income" />
            </span>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold text-income">+{formatMoney(totalReceived)}</div>
            <p className="text-xs text-muted-foreground">
              {t('gold.sold')} {formatGoldQuantity(totalSold)} {t('gold.unit')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('gold.avgCost')}</CardTitle>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Scale className="h-4 w-4 text-primary" />
            </span>
          </CardHeader>
          <CardContent className="grid gap-1.5">
            <div className="text-2xl font-bold">{formatMoney(avgCost)}</div>
            <p className="text-xs text-muted-foreground">
              {t('gold.bought')} {formatGoldQuantity(totalBought)} · {t('gold.sold')}{' '}
              {formatGoldQuantity(totalSold)}
            </p>
          </CardContent>
        </Card>
      </div>

      {types.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('gold.byType')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <Card key={type.goldTypeId}>
                <CardContent className="grid gap-3 p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">{type.name}</div>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                      <Coins className="h-4 w-4 text-amber-500" />
                    </span>
                  </div>
                  <div className="text-2xl font-bold">
                    {formatGoldQuantity(type.heldQuantity)} {t('gold.unit')}
                  </div>
                  <dl className="grid gap-1.5 border-t pt-3 text-xs">
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('gold.bought')}</dt>
                      <dd className="font-medium">
                        {formatGoldQuantity(type.boughtQuantity)} {t('gold.unit')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('gold.sold')}</dt>
                      <dd className="font-medium">
                        {formatGoldQuantity(type.soldQuantity)} {t('gold.unit')}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('gold.avgCost')}</dt>
                      <dd className="font-medium">{formatMoney(type.averageCostPerChi)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('gold.totalSpent')}</dt>
                      <dd className="font-medium text-expense">{formatMoney(type.totalSpent)}</dd>
                    </div>
                    <div className="flex items-center justify-between">
                      <dt className="text-muted-foreground">{t('gold.totalReceived')}</dt>
                      <dd className="font-medium text-income">{formatMoney(type.totalReceived)}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0 py-4">
          <CardTitle className="text-base">{t('gold.history')}</CardTitle>
          <Badge variant="secondary">{historyRows.length}</Badge>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs uppercase tracking-wider">{t('form.date')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">{t('form.content')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">{t('form.goldType')}</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">
                  {t('form.purchasePlace')}
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider">
                  {t('form.goldQuantity')}
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider">
                  {t('form.amount')}
                </TableHead>
                <TableHead className="text-right text-xs uppercase tracking-wider">
                  {t('gold.pricePerChi')}
                </TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyRows.map((row) =>
                row.kind === 'tx' ? (
                  <TableRow key={row.key}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dayjs(row.tx.date).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            row.tx.debit.amount > 0
                              ? 'border-transparent bg-primary/10 text-primary'
                              : 'border-transparent bg-income/10 text-income'
                          }
                        >
                          {row.tx.debit.amount > 0 ? t('gold.buy') : t('gold.sell')}
                        </Badge>
                        <span className="font-medium">{row.tx.content}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.tx.goldTypeName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.tx.purchasePlaceName ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatGoldQuantity(row.tx.goldQuantity)}{' '}
                      <span className="text-muted-foreground">{t('gold.unit')}</span>
                    </TableCell>
                    <TableCell
                      className={
                        row.tx.debit.amount > 0
                          ? 'whitespace-nowrap text-right font-medium tabular-nums text-expense'
                          : 'whitespace-nowrap text-right font-medium tabular-nums text-income'
                      }
                    >
                      {row.tx.debit.amount > 0
                        ? `−${formatMoney(row.tx.debit)}`
                        : `+${formatMoney(row.tx.credit)}`}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatMoney(row.tx.pricePerChi)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                ) : (
                  <TableRow key={row.key}>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dayjs(row.acq.date).format('DD/MM/YYYY')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-transparent bg-amber-500/10 text-amber-600"
                        >
                          {t('goldAcq.badge')}
                        </Badge>
                        <span className="font-medium">{row.acq.note || '—'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{row.acq.goldTypeName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.acq.purchasePlaceName ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatGoldQuantity(row.acq.quantity)}{' '}
                      <span className="text-muted-foreground">{t('gold.unit')}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-muted-foreground tabular-nums">
                      {formatMoney(row.acq.value)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatMoney(row.acq.unitPrice)}
                    </TableCell>
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
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <div className="grid justify-items-center gap-2">
                      <Coins className="h-8 w-8 text-muted-foreground/40" />
                      {t('gold.empty')}
                    </div>
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
