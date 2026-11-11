// Tremor Calendar [v1.0.0]
// Source: github.com/tremorlabs/tremor (Apache-2.0). Adapted for dmoney: react-day-picker v9 (v8 does not support
// React 19 — its Caption/useNavigation/useDayRender API is gone, so the caption + nav buttons and the day button are
// rebuilt on useDayPicker/MonthCaption/DayButton with Tremor's markup and classes); lucide-react icons instead of
// @remixicon/react; app theme tokens (primary/muted/border) instead of blue/gray; nav aria-labels via `labels` prop.

"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, type LucideIcon } from "lucide-react"
import { addYears, format, type Locale } from "date-fns"
import {
  DayPicker,
  useDayPicker,
  type DayButtonProps,
  type DayPickerProps,
  type Matcher,
  type MonthCaptionProps,
  type PropsBase,
  type PropsRange,
  type PropsSingle,
} from "react-day-picker"

import { cx } from "./utils/cx"
import { focusRing } from "./utils/focusRing"

interface NavigationButtonProps
  extends React.HTMLAttributes<HTMLButtonElement> {
  onClick: () => void
  icon: LucideIcon
  disabled?: boolean
}

const NavigationButton = React.forwardRef<
  HTMLButtonElement,
  NavigationButtonProps
>(
  (
    { onClick, icon, disabled, ...props }: NavigationButtonProps,
    forwardedRef,
  ) => {
    const Icon = icon
    return (
      <button
        ref={forwardedRef}
        type="button"
        disabled={disabled}
        className={cx(
          "flex size-8 shrink-0 select-none items-center justify-center rounded-lg border p-1 outline-hidden transition sm:size-[30px]",
          // text color
          "text-muted-foreground hover:text-foreground",
          // border color
          "border-border",
          // background color
          "hover:bg-muted/60 active:bg-muted",
          // disabled
          "disabled:pointer-events-none disabled:opacity-40",
          focusRing,
        )}
        onClick={onClick}
        {...props}
      >
        <Icon className="size-full shrink-0" />
      </button>
    )
  },
)

NavigationButton.displayName = "NavigationButton"

/** Accessible names for the caption's navigation buttons (Tremor hardcodes English). */
type CalendarNavLabels = {
  previousMonth?: string
  nextMonth?: string
  previousYear?: string
  nextYear?: string
}

type CalendarOptions = {
  enableYearNavigation: boolean
  navLabels?: CalendarNavLabels
}

const CalendarOptionsContext = React.createContext<CalendarOptions>({
  enableYearNavigation: false,
})

// v8's Caption component, rebuilt on v9's useDayPicker: month title flanked by the nav buttons.
const MonthCaption = ({ calendarMonth, displayIndex }: MonthCaptionProps) => {
  const { months, goToMonth, nextMonth, previousMonth, dayPickerProps } =
    useDayPicker()
  const { enableYearNavigation, navLabels } = React.useContext(
    CalendarOptionsContext,
  )
  const { numberOfMonths = 1, startMonth, endMonth, disableNavigation, locale } =
    dayPickerProps
  const currentMonth = months[0]?.date ?? calendarMonth.date

  const isFirst = displayIndex === 0
  const isLast = displayIndex === months.length - 1

  const hideNextButton = numberOfMonths > 1 && (isFirst || !isLast)
  const hidePreviousButton = numberOfMonths > 1 && (isLast || !isFirst)

  const goToPreviousYear = () => {
    const targetMonth = addYears(currentMonth, -1)
    if (
      previousMonth &&
      (!startMonth || targetMonth.getTime() >= startMonth.getTime())
    ) {
      goToMonth(targetMonth)
    }
  }

  const goToNextYear = () => {
    const targetMonth = addYears(currentMonth, 1)
    if (nextMonth && (!endMonth || targetMonth.getTime() <= endMonth.getTime())) {
      goToMonth(targetMonth)
    }
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        {enableYearNavigation && !hidePreviousButton && (
          <NavigationButton
            disabled={
              disableNavigation ||
              !previousMonth ||
              (startMonth &&
                addYears(currentMonth, -1).getTime() < startMonth.getTime())
            }
            aria-label={navLabels?.previousYear ?? "Go to previous year"}
            onClick={goToPreviousYear}
            icon={ChevronsLeft}
          />
        )}
        {!hidePreviousButton && (
          <NavigationButton
            disabled={disableNavigation || !previousMonth}
            aria-label={navLabels?.previousMonth ?? "Go to previous month"}
            onClick={() => previousMonth && goToMonth(previousMonth)}
            icon={ChevronLeft}
          />
        )}
      </div>

      <div
        role="presentation"
        aria-live="polite"
        className="text-sm font-medium capitalize tabular-nums text-foreground"
      >
        {format(calendarMonth.date, "LLLL yyy", { locale: locale as Locale | undefined })}
      </div>

      <div className="flex items-center gap-1">
        {!hideNextButton && (
          <NavigationButton
            disabled={disableNavigation || !nextMonth}
            aria-label={navLabels?.nextMonth ?? "Go to next month"}
            onClick={() => nextMonth && goToMonth(nextMonth)}
            icon={ChevronRight}
          />
        )}
        {enableYearNavigation && !hideNextButton && (
          <NavigationButton
            disabled={
              disableNavigation ||
              !nextMonth ||
              (endMonth &&
                addYears(currentMonth, 1).getTime() > endMonth.getTime())
            }
            aria-label={navLabels?.nextYear ?? "Go to next year"}
            onClick={goToNextYear}
            icon={ChevronsRight}
          />
        )}
      </div>
    </div>
  )
}

// v8's Day component (useDayRender), rebuilt as a v9 DayButton: same classes + the "today" underline.
const DayButton = ({ day, modifiers, className, children, ...buttonProps }: DayButtonProps) => {
  void day
  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  const { selected, today, disabled, outside, range_middle, range_start, range_end } =
    modifiers

  return (
    <button
      ref={ref}
      {...buttonProps}
      type="button"
      className={cx(
        "relative size-9 rounded-lg text-sm tabular-nums focus:z-10",
        "text-foreground",
        "hover:bg-muted",
        focusRing,
        today && "font-semibold",
        outside && "text-muted-foreground/60",
        selected && "bg-primary text-primary-foreground hover:bg-primary",
        range_middle && "rounded-none! bg-primary/10! text-foreground! hover:bg-primary/20!",
        range_start && !range_end && "rounded-r-none",
        range_end && !range_start && "rounded-l-none",
        disabled &&
          "text-muted-foreground/40! line-through disabled:hover:bg-transparent",
        className,
      )}
    >
      {children}
      {today && (
        <span
          className={cx(
            "absolute inset-x-1/2 bottom-1.5 h-0.5 w-4 -translate-x-1/2 rounded-[2px]",
            {
              "bg-primary": !selected,
              "bg-primary-foreground!": selected,
              "bg-primary/60!": selected && range_middle,
              "bg-muted-foreground": disabled,
            },
          )}
        />
      )}
    </button>
  )
}

type KeysToOmit = "showWeekNumber" | "captionLayout" | "mode"

// `required` widened to boolean: v9 splits it into separate *Required prop types.
type SingleProps = Omit<PropsBase, KeysToOmit> &
  Omit<PropsSingle, "mode" | "required"> & { required?: boolean }
type RangeProps = Omit<PropsBase, KeysToOmit> &
  Omit<PropsRange, "mode" | "required"> & { required?: boolean }

type CalendarProps =
  | ({
      mode: "single"
    } & SingleProps)
  | ({
      mode?: undefined
    } & SingleProps)
  | ({
      mode: "range"
    } & RangeProps)

const Calendar = ({
  mode = "single",
  weekStartsOn = 1,
  numberOfMonths = 1,
  enableYearNavigation = false,
  navLabels,
  disableNavigation,
  locale,
  className,
  classNames,
  ...props
}: CalendarProps & {
  enableYearNavigation?: boolean
  navLabels?: CalendarNavLabels
}) => {
  const options = React.useMemo(
    () => ({ enableYearNavigation, navLabels }),
    [enableYearNavigation, navLabels],
  )
  return (
    <CalendarOptionsContext.Provider value={options}>
      <DayPicker
        {...({ ...props, mode } as DayPickerProps)}
        weekStartsOn={weekStartsOn}
        numberOfMonths={numberOfMonths}
        locale={locale}
        disableNavigation={disableNavigation}
        hideNavigation
        showOutsideDays={numberOfMonths === 1}
        className={cx(className)}
        classNames={{
          months: "flex space-y-0",
          month: "space-y-4 p-3",
          month_grid: "w-full border-collapse space-y-1",
          weekday:
            "w-9 font-medium text-sm sm:text-xs text-center text-muted-foreground pb-2",
          week: "w-full mt-0.5",
          day: cx("relative p-0 text-center focus-within:relative", "text-foreground"),
          hidden: "invisible",
          ...classNames,
        }}
        components={{ MonthCaption, DayButton }}
      />
    </CalendarOptionsContext.Provider>
  )
}

Calendar.displayName = "Calendar"

export { Calendar, type CalendarNavLabels, type Matcher }
