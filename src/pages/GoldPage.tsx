import { useCallback, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
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
import { getApiErrorMessage } from '../api/client'
import { deleteGoldAcquisition, getGoldSummary } from '../api/goldApi'
import type { GoldAcquisitionResponse, GoldSummaryResponse } from '../api/types'
import { GoldAcquisitionDialog } from '../gold/GoldAcquisitionDialog'
import { GoldHistoryList, type GoldHistoryRow } from '../gold/GoldHistoryList'
import { GoldMonthlyChart } from '../gold/GoldMonthlyChart'
import { GoldOverview } from '../gold/GoldOverview'
import { GoldTypeCard } from '../gold/GoldTypeCard'
import { useI18n } from '../i18n/I18nContext'

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
  const heldTypes = types.filter((type) => type.heldQuantity > 0).map((type) => type.name)

  const historyRows: GoldHistoryRow[] = [
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
      <GoldOverview
        totalHeld={totalHeld}
        heldTypes={heldTypes}
        totalBought={totalBought}
        totalSold={totalSold}
        totalSpent={totalSpent}
        totalReceived={totalReceived}
        avgCost={avgCost}
      />

      {transactions.length > 0 && <GoldMonthlyChart transactions={transactions} />}

      {types.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            {t('gold.byType')}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <GoldTypeCard key={type.goldTypeId} type={type} />
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
          <GoldHistoryList
            rows={historyRows}
            onEdit={(acq) => setDialog({ open: true, editing: acq })}
            onDelete={setDeleting}
          />
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
