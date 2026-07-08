import { useRef, useState } from 'react'
import { read, utils } from 'xlsx'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { importTransactions } from '../api/transactionApi'
import { useI18n } from '../i18n/I18nContext'
import { formatMoney } from '../utils/money'
import { parseImportRows } from '../utils/importParser'
import type { ParsedImport } from '../utils/importParser'

interface Props {
  open: boolean
  onClose: () => void
  onImported: () => void
}

export function ImportTransactionsDialog({ open, onClose, onImported }: Props) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const reset = () => {
    setFileName(null)
    setParsed(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleFile = async (file: File) => {
    const workbook = read(await file.arrayBuffer())
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true })
    setFileName(file.name)
    setParsed(parseImportRows(rows))
  }

  const handleImport = async () => {
    if (!parsed || parsed.valid.length === 0) return
    setSubmitting(true)
    try {
      const { imported } = await importTransactions(parsed.valid)
      toast.success(
        `${t('import.success')} ${imported} ${t('transactions.count')}` +
          (parsed.invalid.length > 0 ? ` · ${t('import.skipped')} ${parsed.invalid.length}` : ''),
      )
      reset()
      onClose()
      onImported()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const previewRows = parsed
    ? [
        ...parsed.valid.map((row) => ({ key: `v-${row.date}-${row.content}-${row.amount}`, row, errorKey: null as string | null })),
        ...parsed.invalid.map((r) => ({
          key: `i-${r.rowIndex}`,
          row: {
            date: String(r.raw[0] ?? ''),
            content: String(r.raw[1] ?? ''),
            amount: null as number | null,
            note: String(r.raw[3] ?? ''),
            rawAmount: String(r.raw[2] ?? ''),
          },
          errorKey: r.errorKey,
        })),
      ]
    : []

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          reset()
          onClose()
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t('import.hint')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              {t('import.chooseFile')}
            </Button>
            <span className="truncate text-sm text-muted-foreground">{fileName}</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              aria-label={t('import.chooseFile')}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleFile(file)
              }}
            />
          </div>

          {parsed && (
            <>
              <div className="flex gap-4 text-sm">
                <span>
                  <strong className="text-income">{parsed.valid.length}</strong> {t('import.rowsValid')}
                </span>
                {parsed.invalid.length > 0 && (
                  <span>
                    <strong className="text-expense">{parsed.invalid.length}</strong> {t('import.rowsInvalid')}
                  </span>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('form.date')}</TableHead>
                      <TableHead>{t('form.content')}</TableHead>
                      <TableHead className="text-right">{t('form.amount')}</TableHead>
                      <TableHead>{t('form.note')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map(({ key, row, errorKey }) => (
                      <TableRow key={key} className={cn(errorKey && 'bg-red-50')}>
                        <TableCell className="whitespace-nowrap">{row.date}</TableCell>
                        <TableCell>
                          <div className="max-w-56 truncate">{row.content}</div>
                          {errorKey && <div className="text-xs text-expense">{t(errorKey)}</div>}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'whitespace-nowrap text-right',
                            row.amount !== null && (row.amount >= 0 ? 'text-income' : 'text-expense'),
                          )}
                        >
                          {row.amount !== null
                            ? `${row.amount >= 0 ? '+' : '−'}${formatMoney({ amount: Math.abs(row.amount), currency: 'VND' })}`
                            : 'rawAmount' in row
                              ? row.rawAmount
                              : ''}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-40 truncate text-muted-foreground">{row.note}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            {t('summary.cancel')}
          </Button>
          <Button type="button" disabled={submitting || !parsed || parsed.valid.length === 0} onClick={handleImport}>
            {t('import.save')} ({parsed?.valid.length ?? 0})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
