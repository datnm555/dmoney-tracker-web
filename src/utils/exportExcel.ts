import { utils, writeFile } from 'xlsx'
import type { TransactionResponse } from '../api/types'

/** Builds and downloads an Excel report for the given period's transactions. */
export function exportTransactionsToExcel(
  items: TransactionResponse[],
  t: (key: string) => string,
  periodLabel: string,
  categoryLabel?: (code: string | null) => string,
): void {
  const labelFor = categoryLabel ?? ((code: string | null) => (code ? t(`category.${code}`) : ''))
  const rows = items.map((tx) => ({
    [t('form.date')]: tx.date,
    [t('form.content')]: tx.content,
    [t('form.category')]: labelFor(tx.categoryId),
    [t('form.subCategory')]: tx.subCategoryName ?? '',
    [t('payment.method')]: t(`payment.${tx.paymentMethod}`),
    [t('summary.colCredit')]: tx.credit.amount || '',
    [t('summary.colDebit')]: tx.debit.amount || '',
    [t('form.isAdvance')]: tx.isAdvance ? 'x' : '',
    [t('form.note')]: tx.note ?? '',
  }))

  const totalCredit = items.reduce((s, tx) => s + tx.credit.amount, 0)
  const totalDebit = items.reduce((s, tx) => s + tx.debit.amount, 0)
  rows.push({
    [t('form.date')]: '',
    [t('form.content')]: `${t('summary.colCredit')} / ${t('summary.colDebit')} / ${t('transactions.net')}`,
    [t('form.category')]: '',
    [t('form.subCategory')]: '',
    [t('payment.method')]: '',
    [t('summary.colCredit')]: totalCredit,
    [t('summary.colDebit')]: totalDebit,
    [t('form.isAdvance')]: '',
    [t('form.note')]: `${t('transactions.net')}: ${totalCredit - totalDebit}`,
  })

  const sheet = utils.json_to_sheet(rows)
  sheet['!cols'] = [{ wch: 12 }, { wch: 45 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 30 }]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, periodLabel.slice(0, 31))
  writeFile(workbook, `bao-cao-${periodLabel}.xlsx`)
}
