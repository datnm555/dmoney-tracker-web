import { utils, writeFile } from 'xlsx'
import type { TransactionResponse } from '../api/types'
import { countedAmounts } from './transactionGroups'

/** Builds and downloads an Excel report for the given period's transactions. */
export function exportTransactionsToExcel(
  items: TransactionResponse[],
  t: (key: string) => string,
  periodLabel: string,
  categoryLabel?: (code: string | null) => string,
  /** Account id → name, for the "Tài khoản" / "Chuyển vào" columns. */
  accountNames: Record<string, string> = {},
): void {
  const accountName = (id: string | null) => (id ? (accountNames[id] ?? '') : '')
  const labelFor = categoryLabel ?? ((code: string | null) => (code ? t(`category.${code}`) : ''))
  const rows = items.map((tx) => ({
    [t('form.date')]: tx.date,
    [t('form.content')]: tx.content,
    [t('form.category')]: labelFor(tx.categoryId),
    [t('form.subCategory')]: tx.subCategoryName ?? '',
    [t('payment.method')]: t(`payment.${tx.paymentMethod}`),
    [t('export.colAccount')]: accountName(tx.accountId),
    [t('export.colToAccount')]: accountName(tx.toAccountId),
    [t('summary.colCredit')]: tx.credit.amount || '',
    [t('summary.colDebit')]: tx.debit.amount || '',
    [t('export.colBeneficiary')]: tx.beneficiaryName ?? '',
    [t('export.colGoldType')]: tx.goldTypeName ?? '',
    [t('export.colGoldQuantity')]: tx.goldQuantity ?? '',
    [t('export.colSavingsBank')]: tx.savingsBank ?? '',
    [t('form.isAdvance')]: tx.isAdvance ? 'x' : '',
    [t('form.note')]: tx.note ?? '',
  }))

  // Same totals as the month card: excluded rows (transfers, savings, gold, advances) don't count.
  const totalCredit = items.reduce((s, tx) => s + countedAmounts(tx).credit, 0)
  const totalDebit = items.reduce((s, tx) => s + countedAmounts(tx).debit, 0)
  rows.push({
    [t('form.date')]: '',
    [t('form.content')]: `${t('summary.colCredit')} / ${t('summary.colDebit')} / ${t('transactions.net')}`,
    [t('form.category')]: '',
    [t('form.subCategory')]: '',
    [t('payment.method')]: '',
    [t('export.colAccount')]: '',
    [t('export.colToAccount')]: '',
    [t('summary.colCredit')]: totalCredit,
    [t('summary.colDebit')]: totalDebit,
    [t('export.colBeneficiary')]: '',
    [t('export.colGoldType')]: '',
    [t('export.colGoldQuantity')]: '',
    [t('export.colSavingsBank')]: '',
    [t('form.isAdvance')]: '',
    [t('form.note')]: `${t('transactions.net')}: ${totalCredit - totalDebit}`,
  })

  const sheet = utils.json_to_sheet(rows)
  sheet['!cols'] = [
    { wch: 12 },
    { wch: 45 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 16 },
    { wch: 10 },
    { wch: 30 },
  ]
  const workbook = utils.book_new()
  utils.book_append_sheet(workbook, sheet, periodLabel.slice(0, 31))
  writeFile(workbook, `bao-cao-${periodLabel}.xlsx`)
}
