import { HOURS, MINUTES, splitTime, withHour, withMinute } from '../../utils/timeOfDay'

interface Props {
  /** "HH:mm" or "" for no time. */
  value: string
  onChange: (value: string) => void
  hourLabel: string
  minuteLabel: string
}

const SELECT =
  'h-9 rounded-xl border border-input bg-transparent px-2 text-center text-sm tabular-nums shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50 dark:bg-input/30'

/** 24-hour hour + minute pickers; changing the hour keeps the minute (00 by default). */
export function TimeOfDayPicker({ value, onChange, hourLabel, minuteLabel }: Props) {
  const { hour, minute } = splitTime(value)
  return (
    <div className="flex shrink-0 items-center gap-1">
      <select
        id="tx-time"
        aria-label={hourLabel}
        title={hourLabel}
        className={SELECT}
        value={hour}
        onChange={(e) => onChange(withHour(value, e.target.value))}
      >
        <option value="">--</option>
        {HOURS.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <span aria-hidden className="text-sm font-semibold text-muted-foreground">
        :
      </span>
      <select
        aria-label={minuteLabel}
        title={minuteLabel}
        className={SELECT}
        value={minute}
        disabled={!hour}
        onChange={(e) => onChange(withMinute(value, e.target.value))}
      >
        {!hour && <option value="">--</option>}
        {MINUTES.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
    </div>
  )
}
