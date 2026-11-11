import { useRef, useState } from 'react'
import { read, utils } from 'xlsx'
import { toast } from 'sonner'
import { BookOpen, Check, CircleAlert, CircleCheck, FileSpreadsheet, Upload } from 'lucide-react'
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
import { usePlans } from '../plans/PlanContext'
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
  const { plans, selectedPlanId } = usePlans()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [dragging, setDragging] = useState(false)

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
    if (!parsed || parsed.valid.length === 0 || !selectedPlanId) return
    setSubmitting(true)
    try {
      const { imported } = await importTransactions(parsed.valid, selectedPlanId)
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('import.title')}</DialogTitle>
          <DialogDescription>{t('import.hint')}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5">
          <div className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
            <BookOpen className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {t('import.targetPlan')}:{' '}
              <strong className="font-semibold text-foreground">
                {plans.find((p) => p.id === selectedPlanId)?.name}
              </strong>
            </span>
          </div>

          <div className="flex items-start gap-2">
            <StepBadge n={1} done={parsed !== null} className="mt-3" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                const file = e.dataTransfer.files?.[0]
                if (file) void handleFile(file)
              }}
              className={cn(
                'group flex flex-1 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
                dragging
                  ? 'border-primary bg-primary/10'
                  : fileName
                    ? 'border-primary/40 bg-primary/5 hover:border-primary/60'
                    : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5',
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-105"
              >
                {fileName ? <FileSpreadsheet className="size-5" /> : <Upload className="size-5" />}
              </span>
              {fileName ? (
                <span className="max-w-full truncate text-sm font-semibold">{fileName}</span>
              ) : (
                <span className="text-sm font-semibold text-primary">{t('import.chooseFile')}</span>
              )}
              <span className="text-xs text-muted-foreground">.csv · .xlsx</span>
            </button>
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
            <div data-testid="import-preview" className="grid gap-2">
              <div className="flex items-start gap-2">
                <StepBadge n={2} done={false} className="mt-3" />
                <div className="grid flex-1 grid-cols-2 gap-2">
                  <div className="flex items-center gap-2.5 rounded-xl border border-income/20 bg-income/5 px-3 py-2.5">
                    <CircleCheck className="size-4 shrink-0 text-income" aria-hidden="true" />
                    <span className="text-sm">
                      <strong className="text-lg font-bold tabular-nums text-income">{parsed.valid.length}</strong>{' '}
                      <span className="text-muted-foreground">{t('import.rowsValid')}</span>
                    </span>
                  </div>
                  {parsed.invalid.length > 0 && (
                    <div className="flex items-center gap-2.5 rounded-xl border border-expense/20 bg-expense/5 px-3 py-2.5">
                      <CircleAlert className="size-4 shrink-0 text-expense" aria-hidden="true" />
                      <span className="text-sm">
                        <strong className="text-lg font-bold tabular-nums text-expense">{parsed.invalid.length}</strong>{' '}
                        <span className="text-muted-foreground">{t('import.rowsInvalid')}</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                    <TableRow>
                      <TableHead>{t('form.date')}</TableHead>
                      <TableHead>{t('form.content')}</TableHead>
                      <TableHead className="text-right">{t('form.amount')}</TableHead>
                      <TableHead>{t('form.note')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map(({ key, row, errorKey }) => (
                      <TableRow key={key} className={cn(errorKey && 'bg-expense/5 hover:bg-expense/10')}>
                        <TableCell className="whitespace-nowrap tabular-nums">{row.date}</TableCell>
                        <TableCell>
                          <div className="max-w-56 truncate">{row.content}</div>
                          {errorKey && <div className="text-xs text-expense">{t(errorKey)}</div>}
                        </TableCell>
                        <TableCell
                          className={cn(
                            'whitespace-nowrap text-right font-medium tabular-nums',
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
            </div>
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
            <Upload className="size-4" aria-hidden="true" />
            {t('import.save')} ({parsed?.valid.length ?? 0})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Numbered step marker (turns into a check once the step is done). */
function StepBadge({ n, done, className }: { n: number; done: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
        done ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
        className,
      )}
    >
      {done ? <Check className="size-3" /> : n}
    </span>
  )
}
