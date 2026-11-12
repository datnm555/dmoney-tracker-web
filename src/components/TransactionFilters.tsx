import { useEffect, useId, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { enUS, vi } from 'date-fns/locale'
import { ChevronDown, Funnel, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '../api/client'
import { getSubCategories } from '../api/subCategoryApi'
import type { AccountResponse, SubCategoryResponse } from '../api/types'
import { useBeneficiaries } from '../beneficiaries/BeneficiariesContext'
import { useCategoryDisplay } from '../categories/useCategoryDisplay'
import { useI18n } from '../i18n/I18nContext'
import { currentMonthRange, currentYearRange, lastMonthRange, MAX_RANGE_DAYS } from '../utils/dateRange'
import {
  countActiveFilters,
  defaultTransactionFilters,
  type TransactionFilterState,
  type TypeFilter,
} from '../utils/transactionFilters'
import { DateRangePicker, type DateRange, type DateRangePreset } from './tremor/DatePicker'

const FILTER_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted-foreground'

const toDate = (day: string) => dayjs(day).toDate()
const toDay = (date: Date) => dayjs(date).format('YYYY-MM-DD')

interface TransactionFiltersProps {
  value: TransactionFilterState
  onChange: (next: TransactionFilterState) => void
  /** The owner's accounts, for the account filter (hidden when there are none). */
  accounts?: AccountResponse[]
}

/** Collapsible "Bộ lọc" card of the Transactions page: date range (API) + client-side narrowing filters. */
export function TransactionFilters({ value, onChange, accounts = [] }: TransactionFiltersProps) {
  const { t, lang } = useI18n()
  const { options: categoryOptions } = useCategoryDisplay()
  const { beneficiaries } = useBeneficiaries()
  const [open, setOpen] = useState(false)
  const [allSubCategories, setAllSubCategories] = useState<SubCategoryResponse[]>([])
  const panelId = useId()

  // Full sub-category list for the filter dropdown (filtered per chosen category).
  useEffect(() => {
    getSubCategories()
      .then(setAllSubCategories)
      .catch((error) => {
        setAllSubCategories([])
        toast.error(getApiErrorMessage(error, t('error.network')))
      })
  }, [t])

  const set = <K extends keyof TransactionFilterState>(key: K, next: TransactionFilterState[K]) =>
    onChange({ ...value, [key]: next })

  const activeFilters = countActiveFilters(value)
  const subOptions = allSubCategories.filter((s) => s.categoryId === value.category)

  // Stable identity: the picker resets its draft whenever `value` changes.
  const pickerValue = useMemo<DateRange>(
    () => ({ from: toDate(value.range.from), to: toDate(value.range.to) }),
    [value.range.from, value.range.to],
  )
  const presets = useMemo<DateRangePreset[]>(() => {
    const preset = (label: string, range: { from: string; to: string }) => ({
      label,
      dateRange: { from: toDate(range.from), to: toDate(range.to) },
    })
    return [
      preset(t('filters.thisMonth'), currentMonthRange()),
      preset(t('filters.lastMonth'), lastMonthRange()),
      preset(t('filters.allYear'), currentYearRange()),
    ]
  }, [t])
  const navigation = useMemo(
    () => ({
      previousMonth: t('calendar.prevMonth'),
      nextMonth: t('calendar.nextMonth'),
      previousYear: t('calendar.prevYear'),
      nextYear: t('calendar.nextYear'),
    }),
    [t],
  )

  const applyRange = (range: DateRange | undefined) => {
    if (!range?.from) return
    // A single click picks one day.
    set('range', { from: toDay(range.from), to: toDay(range.to ?? range.from) })
  }

  return (
    // Collapsed: the whole card is the expand target, not just the header.
    <Card
      data-testid="filters-card"
      className={cn('rounded-2xl', !open && 'cursor-pointer transition-colors hover:bg-muted/40')}
      onClick={open ? undefined : () => setOpen(true)}
    >
      <CardContent className="grid gap-4 p-4 md:p-5">
        {/* The whole header row (icon + title + chevron) is one toggle, open or closed. */}
        <button
          type="button"
          className="-m-1 flex cursor-pointer items-center justify-between rounded-xl p-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={open ? t('filters.collapse') : t('filters.expand')}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="flex items-center gap-2.5 text-sm font-semibold">
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
          </span>
          <span
            data-testid="filters-chevron"
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
          </span>
        </button>

        {open && (
          <div id={panelId} className="grid gap-4">
            <div className="grid items-end gap-4 md:grid-cols-3">
              <div className="grid gap-1.5">
                <span className={FILTER_LABEL}>{t('form.content')}</span>
                <Input className="rounded-xl" value={value.content} onChange={(e) => set('content', e.target.value)} />
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
                    value={value.amountFromDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    onChange={(e) => set('amountFromDigits', e.target.value.replace(/\D/g, ''))}
                  />
                  <span className="text-muted-foreground">→</span>
                  <Input
                    inputMode="numeric"
                    aria-label={t('filters.amountTo')}
                    className="flex-1 rounded-xl"
                    value={value.amountToDigits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                    onChange={(e) => set('amountToDigits', e.target.value.replace(/\D/g, ''))}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <span className={FILTER_LABEL}>{t('form.note')}</span>
                <Input className="rounded-xl" value={value.note} onChange={(e) => set('note', e.target.value)} />
              </div>
            </div>

            <div className="grid items-end gap-4 md:grid-cols-4">
              <div className="grid gap-1.5">
                <span className={FILTER_LABEL}>{t('filters.type')}</span>
                <Select value={value.type} onValueChange={(next) => set('type', next as TypeFilter)}>
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
                <span className={FILTER_LABEL}>{t('filters.dateRange')}</span>
                <DateRangePicker
                  value={pickerValue}
                  onChange={applyRange}
                  presets={presets}
                  locale={lang === 'vi' ? vi : enUS}
                  enableYearNavigation
                  required
                  resetOnSelect
                  max={MAX_RANGE_DAYS - 1}
                  align="start"
                  placeholder={t('filters.pickRange')}
                  aria-label={t('filters.dateRange')}
                  translations={{
                    cancel: t('summary.cancel'),
                    apply: t('filters.apply'),
                    range: t('filters.dateRange'),
                    navigation,
                  }}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="grid gap-1.5">
                <span className={FILTER_LABEL}>{t('form.category')}</span>
                <Select
                  value={value.category}
                  onValueChange={(next) => onChange({ ...value, category: next, subCategory: 'all' })}
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
                <Select value={value.beneficiary} onValueChange={(next) => set('beneficiary', next)}>
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

              {accounts.length > 0 && (
                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('transactions.filterAccount')}</span>
                  <Select value={value.account} onValueChange={(next) => set('account', next)}>
                    <SelectTrigger aria-label={t('transactions.filterAccount')} className="w-full rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('transactions.allAccounts')}</SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                          {a.lastDigits ? ` •••${a.lastDigits}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {value.category !== 'all' && (
                <div className="grid gap-1.5">
                  <span className={FILTER_LABEL}>{t('form.subCategory')}</span>
                  <Select value={value.subCategory} onValueChange={(next) => set('subCategory', next)}>
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
                onClick={() => onChange(defaultTransactionFilters())}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                {t('filters.reset')}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
