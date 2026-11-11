// Tremor Date Picker [v2.0.0]
// Source: github.com/tremorlabs/tremor (Apache-2.0). Adapted for dmoney: time picker removed (drops the
// @react-aria/@react-stately/@internationalized deps — the app only filters by day); lucide-react icons instead of
// @remixicon/react; dates shown as dd/MM/yyyy; Cancel/Apply use the app's shadcn Button and theme tokens (rounded-xl
// trigger like the other filter inputs) instead of Tremor's Button + blue/gray; every built-in string (incl. the
// calendar nav and preset aria-labels) is a `translations` prop; range mode forwards `required`, `max` and
// `resetOnSelect` (react-day-picker v9) so a click on a complete range starts a new one.

"use client"

import * as React from "react"
import * as PopoverPrimitives from "@radix-ui/react-popover"
import { CalendarDays } from "lucide-react"
import { format, type Locale } from "date-fns"
import { enUS } from "date-fns/locale"
import { tv, type VariantProps } from "tailwind-variants"

import { Button } from "@/components/ui/button"
import { cx } from "./utils/cx"
import { focusInput } from "./utils/focusInput"
import { focusRing } from "./utils/focusRing"
import { hasErrorInput } from "./utils/hasErrorInput"
import {
  Calendar as CalendarPrimitive,
  type CalendarNavLabels,
  type Matcher,
} from "./Calendar"

//#region Trigger
// ============================================================================

const triggerStyles = tv({
  base: [
    // base
    "peer flex w-full cursor-pointer appearance-none items-center gap-x-2 truncate rounded-md border px-3 py-2 shadow-xs outline-hidden transition-all text-sm",
    // background color
    "bg-background",
    // border color
    "border-input",
    // text color
    "text-foreground",
    // placeholder color
    "placeholder-muted-foreground",
    // hover
    "hover:bg-muted/40",
    // disabled
    "disabled:pointer-events-none",
    "disabled:opacity-50",
    // focus
    focusInput,
  ],
  variants: {
    hasError: {
      true: hasErrorInput,
    },
  },
})

interface TriggerProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof triggerStyles> {
  placeholder?: string
}

const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  (
    { className, children, placeholder, hasError, ...props }: TriggerProps,
    forwardedRef,
  ) => {
    return (
      <PopoverPrimitives.Trigger asChild>
        <button
          ref={forwardedRef}
          type="button"
          className={cx(triggerStyles({ hasError }), className)}
          {...props}
        >
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span className="flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap tabular-nums text-foreground">
            {children ? (
              children
            ) : placeholder ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : null}
          </span>
        </button>
      </PopoverPrimitives.Trigger>
    )
  },
)

Trigger.displayName = "DatePicker.Trigger"

//#region Popover
// ============================================================================

const CalendarPopover = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitives.Content>,
  React.ComponentProps<typeof PopoverPrimitives.Content>
>(({ align, className, children, ...props }, forwardedRef) => {
  return (
    <PopoverPrimitives.Portal>
      <PopoverPrimitives.Content
        ref={forwardedRef}
        sideOffset={10}
        side="bottom"
        align={align}
        avoidCollisions
        onOpenAutoFocus={(e) => e.preventDefault()}
        className={cx(
          // base
          "relative z-50 w-fit rounded-xl border text-sm shadow-xl shadow-black/[2.5%]",
          // widths
          "max-w-[95vw] min-w-[calc(var(--radix-select-trigger-width)-2px)]",
          // border color
          "border-border",
          // background color
          "bg-popover text-popover-foreground",
          // transition
          "will-change-[transform,opacity]",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className,
        )}
        {...props}
      >
        {children}
      </PopoverPrimitives.Content>
    </PopoverPrimitives.Portal>
  )
})

CalendarPopover.displayName = "DatePicker.CalendarPopover"

//#region Preset
// ============================================================================

type DateRange = {
  from: Date | undefined
  to?: Date | undefined
}

interface Preset {
  label: string
}

interface DatePreset extends Preset {
  date: Date
}

interface DateRangePreset extends Preset {
  dateRange: DateRange
}

type PresetContainerProps<TPreset extends Preset, TValue> = {
  presets: TPreset[]
  onSelect: (value: TValue) => void
  currentValue?: TValue
}

const PresetContainer = <TPreset extends Preset, TValue>({
  // Available preset configurations
  presets,
  // Event handler when a preset is selected
  onSelect,
  // Currently selected preset
  currentValue,
}: PresetContainerProps<TPreset, TValue>) => {
  const isDateRangePresets = (preset: Preset): preset is DateRangePreset => {
    return "dateRange" in preset
  }
  const isDatePresets = (preset: Preset): preset is DatePreset => {
    return "date" in preset
  }

  const handleClick = (preset: TPreset) => {
    if (isDateRangePresets(preset)) {
      onSelect(preset.dateRange as TValue)
    } else if (isDatePresets(preset)) {
      onSelect(preset.date as TValue)
    }
  }

  const compareDates = (date1: Date, date2: Date) => {
    return (
      date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear()
    )
  }

  const compareRanges = (range1: DateRange, range2: DateRange) => {
    const from1 = range1.from
    const from2 = range2.from

    let equalFrom = false

    if (from1 && from2) {
      const sameFrom = compareDates(from1, from2)

      if (sameFrom) {
        equalFrom = true
      }
    }

    const to1 = range1.to
    const to2 = range2.to

    let equalTo = false

    if (to1 && to2) {
      const sameTo = compareDates(to1, to2)

      if (sameTo) {
        equalTo = true
      }
    }

    return equalFrom && equalTo
  }

  const matchesCurrent = (preset: TPreset) => {
    if (isDateRangePresets(preset)) {
      const value = currentValue as DateRange | undefined

      return value && compareRanges(value, preset.dateRange)
    }
    if (isDatePresets(preset)) {
      const value = currentValue as Date | undefined

      return value && compareDates(value, preset.date)
    }

    return false
  }

  return (
    <ul className="flex items-start gap-x-2 sm:flex-col">
      {presets.map((preset) => {
        return (
          <li key={`preset-${preset.label}`} className="sm:w-full sm:py-px">
            <button
              type="button"
              title={preset.label}
              className={cx(
                // base
                "relative w-full overflow-hidden rounded-lg border px-2.5 py-1.5 text-left text-base text-ellipsis whitespace-nowrap shadow-xs outline-hidden transition-all sm:border-none sm:py-2 sm:text-sm sm:shadow-none",
                // text color
                "text-foreground",
                // border color
                "border-border",
                // focus
                focusRing,
                // background color
                "focus-visible:bg-muted",
                "hover:bg-muted",
                {
                  "bg-primary/10 font-medium text-primary": matchesCurrent(preset),
                },
              )}
              onClick={() => handleClick(preset)}
            >
              <span>{preset.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

PresetContainer.displayName = "DatePicker.PresetContainer"

//#region Date Picker Shared
// ============================================================================

const formatDate = (date: Date, locale: Locale): string =>
  format(date, "dd/MM/yyyy", { locale })

type CalendarProps = {
  fromYear?: number
  toYear?: number
  fromMonth?: Date
  toMonth?: Date
  fromDay?: Date
  toDay?: Date
  fromDate?: Date
  toDate?: Date
  locale?: Locale
}

type Translations = {
  cancel?: string
  apply?: string
  range?: string
  navigation?: CalendarNavLabels
}

interface PickerProps extends CalendarProps {
  className?: string
  disabled?: boolean
  disabledDays?: Matcher | Matcher[] | undefined
  required?: boolean
  placeholder?: string
  enableYearNavigation?: boolean
  disableNavigation?: boolean
  hasError?: boolean
  id?: string
  // Customize the date picker for different languages.
  translations?: Translations
  align?: "center" | "end" | "start"
  "aria-invalid"?: boolean
  "aria-label"?: string
  "aria-labelledby"?: string
  "aria-required"?: boolean
}

//#region Single Date Picker
// ============================================================================

interface SingleProps extends Omit<PickerProps, "translations"> {
  presets?: DatePreset[]
  defaultValue?: Date
  value?: Date
  onChange?: (date: Date | undefined) => void
  translations?: Omit<Translations, "range">
}

const SingleDatePicker = ({
  defaultValue,
  value,
  onChange,
  presets,
  disabled,
  disabledDays,
  disableNavigation,
  className,
  placeholder = "Select date",
  hasError,
  translations,
  enableYearNavigation = false,
  locale = enUS,
  align = "center",
  ...props
}: SingleProps) => {
  const [open, setOpen] = React.useState(false)
  const [date, setDate] = React.useState<Date | undefined>(
    value ?? defaultValue ?? undefined,
  )
  const [month, setMonth] = React.useState<Date | undefined>(date)

  const initialDate = React.useMemo(() => {
    return date
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  React.useEffect(() => {
    setDate(value ?? defaultValue ?? undefined)
  }, [value, defaultValue])

  React.useEffect(() => {
    if (date) {
      setMonth(date)
    }
  }, [date])

  React.useEffect(() => {
    if (!open) {
      setMonth(date)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onCancel = () => {
    setDate(initialDate)
    setOpen(false)
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onCancel()
    }

    setOpen(open)
  }

  const formattedDate = React.useMemo(() => {
    if (!date) {
      return null
    }

    return formatDate(date, locale)
  }, [date, locale])

  const onApply = () => {
    setOpen(false)
    onChange?.(date)
  }

  return (
    <PopoverPrimitives.Root
      tremor-id="tremor-raw"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Trigger
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        hasError={hasError}
        aria-required={props.required || props["aria-required"]}
        aria-invalid={props["aria-invalid"]}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
      >
        {formattedDate}
      </Trigger>
      <CalendarPopover align={align}>
        <div className="flex">
          <div className="flex flex-col sm:flex-row sm:items-start">
            {presets && presets.length > 0 && (
              <div
                className={cx(
                  "relative flex h-14 w-full items-center sm:h-full sm:w-40",
                  "border-b border-border sm:border-r sm:border-b-0",
                  "overflow-auto",
                )}
              >
                <div className="absolute px-2 pr-2 sm:inset-0 sm:left-0 sm:py-2">
                  <PresetContainer
                    currentValue={date}
                    presets={presets}
                    onSelect={setDate}
                  />
                </div>
              </div>
            )}
            <div>
              <CalendarPrimitive
                mode="single"
                month={month}
                onMonthChange={setMonth}
                selected={date}
                onSelect={setDate}
                disabled={disabledDays}
                locale={locale}
                enableYearNavigation={enableYearNavigation}
                disableNavigation={disableNavigation}
                navLabels={translations?.navigation}
                autoFocus
                {...props}
              />
              <div className="flex items-center gap-x-2 border-t border-border p-3">
                <Button
                  variant="outline"
                  className="h-8 flex-1 rounded-lg"
                  type="button"
                  onClick={onCancel}
                >
                  {translations?.cancel ?? "Cancel"}
                </Button>
                <Button
                  className="h-8 flex-1 rounded-lg"
                  type="button"
                  onClick={onApply}
                >
                  {translations?.apply ?? "Apply"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CalendarPopover>
    </PopoverPrimitives.Root>
  )
}

//#region Range Date Picker
// ============================================================================

interface RangeProps extends PickerProps {
  presets?: DateRangePreset[]
  defaultValue?: DateRange
  value?: DateRange
  onChange?: (dateRange: DateRange | undefined) => void
  /** Longest selectable range, in days (react-day-picker `max`). */
  max?: number
  /** A click on a complete range starts a new one instead of moving an end (react-day-picker v9.14+). */
  resetOnSelect?: boolean
}

const RangeDatePicker = ({
  defaultValue,
  value,
  onChange,
  presets,
  disabled,
  disableNavigation,
  disabledDays,
  enableYearNavigation = false,
  locale = enUS,
  placeholder = "Select date range",
  hasError,
  translations,
  align = "center",
  className,
  ...props
}: RangeProps) => {
  const [open, setOpen] = React.useState(false)
  const [range, setRange] = React.useState<DateRange | undefined>(
    value ?? defaultValue ?? undefined,
  )
  const [month, setMonth] = React.useState<Date | undefined>(range?.from)

  const initialRange = React.useMemo(() => {
    return range
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  React.useEffect(() => {
    setRange(value ?? defaultValue ?? undefined)
  }, [value, defaultValue])

  React.useEffect(() => {
    if (range) {
      setMonth(range.from)
    }
    // Only a new start moves the view; picking the end inside the 2nd month must not shift it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range?.from?.getTime()])

  React.useEffect(() => {
    if (!open) {
      setMonth(range?.from)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onCancel = () => {
    setRange(initialRange)
    setOpen(false)
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onCancel()
    }

    setOpen(open)
  }

  const displayRange = React.useMemo(() => {
    if (!range) {
      return null
    }

    return `${range.from ? formatDate(range.from, locale) : ""} – ${
      range.to ? formatDate(range.to, locale) : ""
    }`
  }, [range, locale])

  const onApply = () => {
    setOpen(false)
    onChange?.(range)
  }

  return (
    <PopoverPrimitives.Root
      tremor-id="tremor-raw"
      open={open}
      onOpenChange={onOpenChange}
    >
      <Trigger
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        hasError={hasError}
        aria-required={props.required || props["aria-required"]}
        aria-invalid={props["aria-invalid"]}
        aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]}
      >
        {displayRange}
      </Trigger>
      <CalendarPopover align={align}>
        <div className="flex">
          <div className="flex flex-col overflow-x-auto sm:flex-row sm:items-start">
            {presets && presets.length > 0 && (
              <div
                className={cx(
                  "relative flex h-16 w-full items-center sm:h-full sm:w-40",
                  "border-b border-border sm:border-r sm:border-b-0",
                  "overflow-auto",
                )}
              >
                <div className="absolute px-3 sm:inset-0 sm:left-0 sm:p-2">
                  <PresetContainer
                    currentValue={range}
                    presets={presets}
                    onSelect={setRange}
                  />
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <CalendarPrimitive
                mode="range"
                selected={range}
                onSelect={setRange}
                month={month}
                onMonthChange={setMonth}
                numberOfMonths={2}
                disabled={disabledDays}
                disableNavigation={disableNavigation}
                enableYearNavigation={enableYearNavigation}
                navLabels={translations?.navigation}
                locale={locale}
                autoFocus
                classNames={{
                  months: "flex flex-row divide-x divide-border overflow-x-auto",
                }}
                {...props}
              />
              <div className="border-t border-border p-3 sm:flex sm:items-center sm:justify-between">
                <p className="tabular-nums text-foreground">
                  <span className="text-muted-foreground">
                    {translations?.range ?? "Range"}:
                  </span>{" "}
                  <span className="font-medium">{displayRange}</span>
                </p>
                <div className="mt-2 flex items-center gap-x-2 sm:mt-0">
                  <Button
                    variant="outline"
                    className="h-8 flex-1 rounded-lg sm:flex-none"
                    type="button"
                    onClick={onCancel}
                  >
                    {translations?.cancel ?? "Cancel"}
                  </Button>
                  <Button
                    className="h-8 flex-1 rounded-lg sm:flex-none"
                    type="button"
                    disabled={!range?.from}
                    onClick={onApply}
                  >
                    {translations?.apply ?? "Apply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CalendarPopover>
    </PopoverPrimitives.Root>
  )
}

//#region Preset Validation
// ============================================================================

const validatePresets = (
  presets: DateRangePreset[] | DatePreset[],
  rules: PickerProps,
) => {
  const { toYear, fromYear, fromMonth, toMonth, fromDay, toDay } = rules

  if (presets && presets.length > 0) {
    const fromYearToUse = fromYear
    const toYearToUse = toYear

    for (const preset of presets) {
      if ("date" in preset) {
        const presetYear = preset.date.getFullYear()

        if (fromYear && presetYear < fromYear) {
          throw new Error(
            `Preset ${preset.label} is before fromYear ${fromYearToUse}.`,
          )
        }

        if (toYear && presetYear > toYear) {
          throw new Error(
            `Preset ${preset.label} is after toYear ${toYearToUse}.`,
          )
        }

        if (fromMonth) {
          const presetMonth = preset.date.getMonth()

          if (presetMonth < fromMonth.getMonth()) {
            throw new Error(
              `Preset ${preset.label} is before fromMonth ${fromMonth}.`,
            )
          }
        }

        if (toMonth) {
          const presetMonth = preset.date.getMonth()

          if (presetMonth > toMonth.getMonth()) {
            throw new Error(
              `Preset ${preset.label} is after toMonth ${toMonth}.`,
            )
          }
        }

        if (fromDay) {
          const presetDay = preset.date.getDate()

          if (presetDay < fromDay.getDate()) {
            throw new Error(
              `Preset ${preset.label} is before fromDay ${fromDay}.`,
            )
          }
        }

        if (toDay) {
          const presetDay = preset.date.getDate()

          if (presetDay > toDay.getDate()) {
            throw new Error(
              `Preset ${preset.label} is after toDay ${format(
                toDay,
                "MMM dd, yyyy",
              )}.`,
            )
          }
        }
      }

      if ("dateRange" in preset) {
        const presetFromYear = preset.dateRange.from?.getFullYear()
        const presetToYear = preset.dateRange.to?.getFullYear()

        if (presetFromYear && fromYear && presetFromYear < fromYear) {
          throw new Error(
            `Preset ${preset.label}'s 'from' is before fromYear ${fromYearToUse}.`,
          )
        }

        if (presetToYear && toYear && presetToYear > toYear) {
          throw new Error(
            `Preset ${preset.label}'s 'to' is after toYear ${toYearToUse}.`,
          )
        }

        if (fromMonth) {
          const presetMonth = preset.dateRange.from?.getMonth()

          if (presetMonth && presetMonth < fromMonth.getMonth()) {
            throw new Error(
              `Preset ${preset.label}'s 'from' is before fromMonth ${format(
                fromMonth,
                "MMM, yyyy",
              )}.`,
            )
          }
        }

        if (toMonth) {
          const presetMonth = preset.dateRange.to?.getMonth()

          if (presetMonth && presetMonth > toMonth.getMonth()) {
            throw new Error(
              `Preset ${preset.label}'s 'to' is after toMonth ${format(
                toMonth,
                "MMM, yyyy",
              )}.`,
            )
          }
        }

        if (fromDay) {
          const presetDay = preset.dateRange.from?.getDate()

          if (presetDay && presetDay < fromDay.getDate()) {
            throw new Error(
              `Preset ${
                preset.dateRange.from
              }'s 'from' is before fromDay ${format(fromDay, "MMM dd, yyyy")}.`,
            )
          }
        }

        if (toDay) {
          const presetDay = preset.dateRange.to?.getDate()

          if (presetDay && presetDay > toDay.getDate()) {
            throw new Error(
              `Preset ${preset.label}'s 'to' is after toDay ${format(
                toDay,
                "MMM dd, yyyy",
              )}.`,
            )
          }
        }
      }
    }
  }
}

//#region Types & Exports
// ============================================================================

type SingleDatePickerProps = {
  presets?: DatePreset[]
  defaultValue?: Date
  value?: Date
  onChange?: (date: Date | undefined) => void
} & PickerProps

const DatePicker = ({ presets, ...props }: SingleDatePickerProps) => {
  if (presets) {
    validatePresets(presets, props)
  }

  return <SingleDatePicker presets={presets} {...(props as SingleProps)} />
}

DatePicker.displayName = "DatePicker"

type RangeDatePickerProps = {
  presets?: DateRangePreset[]
  defaultValue?: DateRange
  value?: DateRange
  onChange?: (dateRange: DateRange | undefined) => void
  max?: number
  resetOnSelect?: boolean
} & PickerProps

const DateRangePicker = ({ presets, ...props }: RangeDatePickerProps) => {
  if (presets) {
    validatePresets(presets, props)
  }

  return <RangeDatePicker presets={presets} {...(props as RangeProps)} />
}

DateRangePicker.displayName = "DateRangePicker"

export {
  DatePicker,
  DateRangePicker,
  type DatePreset,
  type DateRangePreset,
  type DateRange,
}
