import { useCallback, useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { getApiErrorMessage } from '../api/client'
import { getGoldSummary } from '../api/goldApi'
import type { GoldSummaryResponse } from '../api/types'
import { useI18n } from '../i18n/I18nContext'
import { formatGoldQuantity } from '../utils/gold'
import { formatMoney } from '../utils/money'

export function GoldPage() {
  const { t } = useI18n()
  const [summary, setSummary] = useState<GoldSummaryResponse | null>(null)

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

  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">{t('gold.title')}</h1>

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((row) => (
                <TableRow key={row.transactionId}>
                  <TableCell>{dayjs(row.date).format('DD/MM/YYYY')}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {row.debit.amount > 0 ? t('gold.buy') : t('gold.sell')}
                      </Badge>
                      <span className="font-medium">{row.content}</span>
                    </div>
                  </TableCell>
                  <TableCell>{row.goldTypeName}</TableCell>
                  <TableCell className="text-right">
                    {formatGoldQuantity(row.goldQuantity)} {t('gold.unit')}
                  </TableCell>
                  <TableCell
                    className={
                      row.debit.amount > 0
                        ? 'text-right font-medium text-expense'
                        : 'text-right font-medium text-income'
                    }
                  >
                    {row.debit.amount > 0 ? `−${formatMoney(row.debit)}` : `+${formatMoney(row.credit)}`}
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(row.pricePerChi)}</TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    {t('gold.empty')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
