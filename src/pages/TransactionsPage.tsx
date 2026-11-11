import { useCallback, useEffect, useState, type ReactNode } from 'react'
import dayjs from 'dayjs'
import { ArrowDownRight, ArrowUpRight, CalendarDays, ChevronDown, CornerDownRight, Download, Funnel, Pencil, Plus, Trash2, Upload, RotateCcw, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '../api/client'
import {
  createTransaction,
  deleteTransaction,
  getMonthlySummary,
  updateTransaction,
} from '../api/transactionApi'
import { getSubCategories } from '../api/subCategoryApi'
import type { MonthlySummaryResponse, SubCategoryResponse, TransactionResponse } from '../api/types'
import { useBeneficiaries } from '../beneficiaries/BeneficiariesContext'
import { CategoryIcon } from '../components/CategoryIcon'
import { CategoryBar } from '../components/tremor/CategoryBar'
import { ImportTransactionsDialog } from '../components/ImportTransactionsDialog'
import { TransactionFormModal } from '../components/TransactionFormModal'
import type { SubmitOptions, TransactionFormValues } from '../components/TransactionFormModal'
import { useI18n } from '../i18n/I18nContext'
import { usePlans } from '../plans/PlanContext'
import { formatMoney } from '../utils/money'
import { paymentMethodChipLabel } from '../utils/paymentLabel'
import { formatGoldQuantity } from '../utils/gold'
import { groupTransactionsByDay } from '../utils/transactionGroups'
import { matchesSearch } from '../utils/transactionSearch'
import { exportTransactionsToExcel } from '../utils/exportExcel'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { toTransactionPayload } from '../utils/transactionPayload'

type Filter = 'all' | 'in' | 'out' | 'advance'

const FILTER_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

export function TransactionsPage() {
  const { t, lang } = useI18n()
  const { selectedPlanId } = usePlans()
  const { label: categoryLabel, visual: categoryDisplayVisual, options: categoryOptions } = useCategoryDisplay()
  const { beneficiaries } = useBeneficiaries()
  // 'YYYY-MM' for a single month, bare 'YYYY' for the whole current year.
  const [monthKey, setMonthKey] = useState<string>(() => dayjs().format('YYYY-MM'))
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [searchContent, setSearchContent] = useState('')
  const [amountFromDigits, setAmountFromDigits] = useState('')
  const [amountToDigits, setAmountToDigits] = useState('')
  const [searchNote, setSearchNote] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterSub, setFilterSub] = useState<string>('all')
  const [filterBeneficiary, setFilterBeneficiary] = useState<string>('all')
  const [filtersOpen, setFiltersOpen] = useState(false)
  // Narrowing filters in use (the period picker is not counted: it always has a value).
  const activeFilters = [
    filter !== 'all',
    searchContent.trim() !== '',
    amountFromDigits !== '',
    amountToDigits !== '',
    searchNote.trim() !== '',
    filterCategory !== 'all',
    filterSub !== 'all',
    filterBeneficiary !== 'all',
  ].filter(Boolean).length
  const [allSubCategories, setAllSubCategories] = useState<SubCategoryResponse[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionResponse | null>(null)
  const [deleting, setDeleting] = useState<TransactionResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!selectedPlanId) return
    try {
      setSummary(await getMonthlySummary(monthKey, selectedPlanId))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }, [monthKey, selectedPlanId, t])

  useEffect(() => {
    void load()
  }, [load])

  // Full sub-category list for the filter dropdown (filtered per chosen category).
  useEffect(() => {
    getSubCategories()
      .then(setAllSubCategories)
      .catch((error) => {
        setAllSubCategories([])
        toast.error(getApiErrorMessage(error, t('error.network')))
      })
  }, [t])

  const handleSubmit = async (values: TransactionFormValues, options?: SubmitOptions) => {
    const payload = toTransactionPayload(values, selectedPlanId!)
    setSubmitting(true)
    try {
      if (editing) {
        await updateTransaction(editing.id, payload)
      } else {
        await createTransaction(payload)
      }
      if (options?.keepOpen) {
        // Save & Continue: keep the dialog and its values so the user can save a tweaked clone.
        toast.success(t('form.saved'))
      } else {
        toast.success(t(editing ? 'toast.updated' : 'toast.created'))
        setModalOpen(false)
        setEditing(null)
      }
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTransaction(deleting.id)
      toast.success(t('toast.deleted'))
      setDeleting(null)
      await load()
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('error.network')))
    }
  }

  const searchCriteria = {
    content: searchContent,
    amountFrom: amountFromDigits ? Number(amountFromDigits) : null,
    amountTo: amountToDigits ? Number(amountToDigits) : null,
    note: searchNote,
  }

  const items = (summary?.items ?? []).filter((tx) => {
    if (filter === 'advance' && !tx.isAdvance) return false
    if (filter === 'in' && tx.credit.amount <= 0) return false
    if (filter === 'out' && tx.debit.amount <= 0) return false
    if (filterCategory !== 'all' && tx.categoryId !== filterCategory) return false
    if (filterCategory !== 'all' && filterSub !== 'all' && tx.subCategoryId !== filterSub) return false
    if (filterBeneficiary === 'none' && tx.beneficiaryId !== null) return false
    if (filterBeneficiary !== 'all' && filterBeneficiary !== 'none' && tx.beneficiaryId !== filterBeneficiary) return false
    return matchesSearch(tx, searchCriteria)
  })

  const subOptions = allSubCategories.filter((s) => s.categoryId === filterCategory)
  const groups = groupTransactionsByDay(items)
  const today = dayjs().format('YYYY-MM-DD')

  const isWholeYear = /^\d{4}$/.test(monthKey)
  const currentYear = dayjs().year()
  const currentMonth = dayjs().month() + 1

  // monthKey split into the two dropdowns: year + (month | whole year).
  const selYear = Number(monthKey.slice(0, 4))
  const selMonth = isWholeYear ? 'all' : monthKey.slice(5)

  const monthName = (n: number) => {
    const name = new Date(2026, n - 1, 1).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'long',
    })
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
  }

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)
  const monthOptions = [
    { value: 'all', label: t('filters.allYear'), disabled: false },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label: monthName(i + 1),
      // Future months of the current year cannot be selected.
      disabled: selYear === currentYear && i + 1 > currentMonth,
    })),
  ]

  const applyPeriod = (year: number, month: string) => {
    if (month === 'all') {
      setMonthKey(String(year))
      return
    }
    // Clamp to the current month when switching back to the current year lands on a future month.
    const clamped =
      year === currentYear && Number(month) > currentMonth ? String(currentMonth).padStart(2, '0') : month
    setMonthKey(`${year}-${clamped}`)
  }

  // New records default to the 1st of the filtered period; the current month keeps today.
  const defaultDate = isWholeYear
    ? monthKey === String(currentYear)
      ? dayjs().format('YYYY-MM-DD')
      : `${monthKey}-01-01`
    : monthKey === dayjs().format('YYYY-MM')
      ? dayjs().format('YYYY-MM-DD')
      : `${monthKey}-01`

  const rangeStart = isWholeYear ? dayjs(`${monthKey}-01-01`) : dayjs(`${monthKey}-01`).startOf('month')
  const rangeEnd = isWholeYear
    ? dayjs()
    : dayjs(`${monthKey}-01`).isSame(dayjs(), 'month')
      ? dayjs()
      : dayjs(`${monthKey}-01`).endOf('month')

  const weekdayName = (date: string) => {
    const name = new Date(`${date}T00:00:00`).toLocaleDateString(lang === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
    })
    return `${name.charAt(0).toUpperCase()}${name.slice(1)}`
  }

  // 6b mockup: card header reads "Hôm nay · 09/07" / "Thứ Năm · 02/07".
  const dayTitle = (date: string) => (date === today ? t('transactions.today') : weekdayName(date))

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('menu.transactions')}</h1>
          <p className="text-sm text-muted-foreground">
            {rangeStart.format('DD/MM')} → {rangeEnd.format('DD/MM/YYYY')} · {summary?.items.length ?? 0}{' '}
            {t('transactions.count')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-xl border bg-card p-0.5 shadow-sm">
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-lg"
            disabled={!summary || summary.items.length === 0}
            onClick={() => summary && exportTransactionsToExcel(summary.items, t, monthKey, categoryLabel)}
          >
            <Download className="mr-1 h-4 w-4" />
            {t('export.button')}
          </Button>
          <Button type="button" variant="ghost" className="h-8 rounded-lg" onClick={() => setImportOpen(true)}>
            <Upload className="mr-1 h-4 w-4" />
            {t('import.button')}
          </Button>
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            {t('summary.create')}
          </Button>
        </div>
      </div>

      {/* Collapsed: the whole card is the expand target, not just the chevron. */}
      <Card
        data-testid="filters-card"
        className={cn('rounded-2xl', !filtersOpen && 'cursor-pointer transition-colors hover:bg-muted/40')}
        onClick={filtersOpen ? undefined : () => setFiltersOpen(true)}
      >
        <CardContent className="grid gap-4 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Funnel className="h-4 w-4" />
              </span>
              {t('filters.title')}
              {activeFilters > 0 && (
                <span
                  data-testid="active-filters"
                  className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-primary-foreground"
                >
                  {activeFilters}
                </span>
              )}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={filtersOpen ? t('filters.collapse') : t('filters.expand')}
              aria-expanded={filtersOpen}
              onClick={() => setFiltersOpen((open) => !open)}
            >
              <ChevronDown className={cn('h-4 w-4 transition-transform', filtersOpen && 'rotate-180')} />
            </Button>
          </div>

          {filtersOpen && (
            <>
              <div className="grid items-end gap-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('form.content')}</span>
                  <Input className="rounded-xl" value={searchContent} onChange={(e) => setSearchContent(e.target.value)} />
                </div>

                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>
                    {t('form.amount')} ({t('filters.amountFrom')} → {t('filters.amountTo')})
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Input
                      inputMode="numeric"
                      aria-label={t('filters.amountFrom')}
                      className="flex-1 rounded-xl"
                      value={amountFromDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      onChange={(e) => setAmountFromDigits(e.target.value.replace(/\D/g, ''))}
                    />
                    <span className="text-muted-foreground">→</span>
                    <Input
                      inputMode="numeric"
                      aria-label={t('filters.amountTo')}
                      className="flex-1 rounded-xl"
                      value={amountToDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                      onChange={(e) => setAmountToDigits(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('form.note')}</span>
                  <Input className="rounded-xl" value={searchNote} onChange={(e) => setSearchNote(e.target.value)} />
                </div>
              </div>

              <div className="grid items-end gap-4 md:grid-cols-4">
                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('filters.type')}</span>
                  <Select value={filter} onValueChange={(value) => setFilter(value as Filter)}>
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('transactions.filterAll')}</SelectItem>
                      <SelectItem value="in">↑ {t('form.moneyIn')}</SelectItem>
                      <SelectItem value="out">↓ {t('form.moneyOut')}</SelectItem>
                      <SelectItem value="advance">⏳ {t('form.isAdvance')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>
                    {t('filters.month')} {t('filters.optional')}
                  </span>
                  <div className="flex items-center gap-2">
                    <Select value={selMonth} onValueChange={(value) => applyPeriod(selYear, value)}>
                      <SelectTrigger className="flex-1 rounded-xl">
                        <div className="flex min-w-0 items-center gap-2">
                          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <SelectValue />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {monthOptions.map((m) => (
                          <SelectItem key={m.value} value={m.value} disabled={m.disabled}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(selYear)} onValueChange={(value) => applyPeriod(Number(value), selMonth)}>
                      <SelectTrigger className="w-28 shrink-0 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {yearOptions.map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('form.category')}</span>
                  <Select
                    value={filterCategory}
                    onValueChange={(value) => {
                      setFilterCategory(value)
                      setFilterSub('all')
                    }}
                  >
                    <SelectTrigger className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('transactions.filterAll')}</SelectItem>
                      {categoryOptions.map((option) => (
                        <SelectItem key={option.code} value={option.code}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('filters.beneficiary')}</span>
                  <Select value={filterBeneficiary} onValueChange={setFilterBeneficiary}>
                    <SelectTrigger aria-label={t('filters.beneficiary')} className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('transactions.filterAll')}</SelectItem>
                      <SelectItem value="none">{t('beneficiaries.none')}</SelectItem>
                      {beneficiaries.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filterCategory !== 'all' && (
                  <div className="grid gap-1.5">
                    <span className={FILTER_LABEL}>{t('form.subCategory')}</span>
                    <Select value={filterSub} onValueChange={setFilterSub}>
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('transactions.filterAll')}</SelectItem>
                        {subOptions.map((sub) => (
                          <SelectItem key={sub.id} value={sub.id}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex justify-end border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setFilter('all')
                    setMonthKey(dayjs().format('YYYY-MM'))
                    setSearchContent('')
                    setAmountFromDigits('')
                    setAmountToDigits('')
                    setSearchNote('')
                    setFilterCategory('all')
                    setFilterSub('all')
                    setFilterBeneficiary('all')
                  }}
                >
                  <RotateCcw className="mr-1 h-4 w-4" />
                  {t('filters.reset')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 p-4 md:p-5">
          {(() => {
            // Totals over the filtered rows, not the raw month — the card must
            // agree with the list it sits above.
            const currency = summary?.totalCredit.currency ?? 'VND'
            // Rows flagged excludedFromStats (internal transfers, loan principal)
            // still list below but are not real income/spending.
            const counted = items.filter((tx) => !tx.excludedFromStats)
            const credit = counted.reduce((sum, tx) => sum + tx.credit.amount, 0)
            const debit = counted.reduce((sum, tx) => sum + tx.debit.amount, 0)
            const total = credit + debit
            const balance = credit - debit
            return (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <SummaryStat icon={ArrowUpRight} tone="income" label={t('summary.colCredit')}>
                    <strong className="text-income">+{summary ? formatMoney({ amount: credit, currency }) : '—'}</strong>
                  </SummaryStat>
                  <div data-testid="month-balance" className="grid justify-items-center gap-1 text-center">
                    <span className="text-xs text-muted-foreground">{t('summary.balance')} </span>
                    <strong
                      className={cn(
                        'text-base tabular-nums sm:text-xl',
                        balance >= 0 ? 'text-income' : 'text-expense',
                      )}
                    >
                      {summary ? `${balance >= 0 ? '+' : '−'}${formatMoney({ amount: Math.abs(balance), currency })}` : '—'}
                    </strong>
                  </div>
                  <SummaryStat icon={ArrowDownRight} tone="expense" label={t('summary.colDebit')} align="right">
                    <strong className="text-expense">−{summary ? formatMoney({ amount: debit, currency }) : '—'}</strong>
                  </SummaryStat>
                </div>
                <CategoryBar
                  values={total > 0 ? [credit, debit] : [1]}
                  colors={total > 0 ? ['emerald', 'rose'] : ['gray']}
                  showLabels={false}
                />
              </>
            )
          })()}
        </CardContent>
      </Card>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">{t('summary.empty')}</CardContent>
        </Card>
      )}

      {groups.map((group) => (
        <section key={group.date} className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {dayTitle(group.date)} · {dayjs(group.date).format('DD/MM')}
            </span>
            {group.net >= 0 ? (
              <span className="rounded-full bg-income/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-income">
                {t('transactions.net')} +{formatMoney({ amount: group.net, currency: 'VND' })}
              </span>
            ) : (
              <span className="rounded-full bg-expense/10 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-expense">
                −{formatMoney({ amount: Math.abs(group.net), currency: 'VND' })}
              </span>
            )}
          </div>
        <Card className="overflow-hidden rounded-2xl py-0">
          <CardContent className="divide-y p-0">
            {group.items.map((tx) => {
              const isIncome = tx.credit.amount > 0
              return (
                <div key={tx.id} className="group transition-colors hover:bg-muted/40">
                  <div className="relative flex items-center gap-3 px-4 py-3">
                  <CategoryIcon category={tx.categoryId} className="h-11 w-11 rounded-2xl" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-semibold">{tx.content}</span>
                      <span
                        className={cn(
                          'shrink-0 text-base font-bold tabular-nums',
                          isIncome ? 'text-income' : 'text-expense',
                        )}
                      >
                        {isIncome ? `+${formatMoney(tx.credit)}` : `−${formatMoney(tx.debit)}`}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px] font-medium">
                      {tx.categoryId && (
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5',
                            categoryDisplayVisual(tx.categoryId).labelClass,
                          )}
                        >
                          {categoryLabel(tx.categoryId)}
                        </span>
                      )}
                      {tx.subCategoryName && <MetaChip>{tx.subCategoryName}</MetaChip>}
                      {tx.beneficiaryName && <MetaChip>{tx.beneficiaryName}</MetaChip>}
                      {tx.goldQuantity !== null && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                          {formatGoldQuantity(tx.goldQuantity)} {t('gold.unit')}
                          {tx.goldTypeName ? ` · ${tx.goldTypeName}` : ''}
                        </span>
                      )}
                      {tx.bank && <MetaChip>{tx.bank}</MetaChip>}
                      <MetaChip>{paymentMethodChipLabel(tx, t)}</MetaChip>
                      {tx.savingsBank && <MetaChip>→ {tx.savingsBank}</MetaChip>}
                      {tx.isAdvance && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-400">
                          {t('form.isAdvance')}
                        </span>
                      )}
                      {tx.excludedFromStats && (
                        <span className="rounded-full border border-dashed px-2 py-0.5 text-muted-foreground">
                          {t('summary.excludedBadge')}
                        </span>
                      )}
                    </div>
                    {tx.note && (
                      <div className="mt-1 truncate text-xs italic text-muted-foreground">
                        {t('form.note')}: {tx.note}
                      </div>
                    )}
                  </div>
                  {/* sm+: float over the row's right edge on hover so the amount sits flush right. */}
                  <div className="flex shrink-0 items-center gap-0.5 transition-opacity sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:bg-card sm:p-0.5 sm:opacity-0 sm:shadow-md sm:ring-1 sm:ring-border sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={`${t('summary.edit')} ${tx.content}`}
                      onClick={() => {
                        setEditing(tx)
                        setModalOpen(true)
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:bg-expense/10 hover:text-expense"
                      aria-label={`${t('summary.delete')} ${tx.content}`}
                      onClick={() => setDeleting(tx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  </div>
                  {tx.links && tx.links.length > 0 && (
                    <div className="grid gap-1 px-4 pb-3 pl-[4.25rem]">
                      {tx.links.map((l) => (
                        <div
                          key={`${l.relation}-${l.id}`}
                          className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-xs"
                        >
                          <CornerDownRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                            {t(`links.${l.relation}`)}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {dayjs(l.date).format('DD/MM/YYYY')} · {l.content}
                          </span>
                          <span
                            className={l.credit.amount > 0 ? 'font-medium text-income' : 'font-medium text-expense'}
                          >
                            {l.credit.amount > 0 ? `+${formatMoney(l.credit)}` : `−${formatMoney(l.debit)}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

          </CardContent>
        </Card>
        </section>
      ))}

      <TransactionFormModal
        open={modalOpen}
        editing={editing}
        submitting={submitting}
        defaultDate={defaultDate}
        onSubmit={handleSubmit}
        onCancel={() => {
          setModalOpen(false)
          setEditing(null)
        }}
      />

      <ImportTransactionsDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={() => void load()}
      />

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('summary.deleteConfirm')}</AlertDialogTitle>
            <AlertDialogDescription>{deleting?.content}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('summary.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>{t('summary.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/** Neutral meta chip (sub-category, beneficiary, payment, bank): the category chip stays the only colour. */
function MetaChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{children}</span>
}

function SummaryStat({
  icon: Icon,
  tone,
  label,
  align = 'left',
  children,
}: {
  icon: LucideIcon
  tone: 'income' | 'expense'
  label: string
  align?: 'left' | 'right'
  children: ReactNode
}) {
  return (
    <div className={cn('grid gap-1', align === 'right' && 'justify-items-end text-right')}>
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span
          className={cn(
            'flex size-5 items-center justify-center rounded-full',
            tone === 'income' ? 'bg-income/10 text-income' : 'bg-expense/10 text-expense',
          )}
        >
          <Icon className="size-3" aria-hidden />
        </span>
        {label}
      </span>
      <span className="text-sm tabular-nums sm:text-base">{children}</span>
    </div>
  )
}
