import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { Input } from '@/components/ui/input'
import { composeTime, splitTime, twoDigits } from '../../utils/timeOfDay'

interface Props {
  /** "HH:mm" or "" for no time. */
  value: string
  onChange: (value: string) => void
  hourLabel: string
  minuteLabel: string
}

type Part = 'hour' | 'minute'

const FIELD = 'w-12 shrink-0 rounded-xl px-1 text-center tabular-nums'

/**
 * 24-hour time typed as hour + minute (two digits each). The first digit typed after entering (or
 * clicking) a field replaces what was there, so the hour is changed whole; the minute defaults to 00 and an
 * empty hour means no time.
 */
export function TimeOfDayPicker({ value, onChange, hourLabel, minuteLabel }: Props) {
  const [hour, setHour] = useState(() => splitTime(value).hour)
  const [minute, setMinute] = useState(() => splitTime(value).minute)
  const fresh = useRef<Part | null>(null)

  // Follow outside changes (reset, edit another row) without fighting what is being typed.
  useEffect(() => {
    if (composeTime(hour, minute) === value) return
    const next = splitTime(value)
    setHour(next.hour)
    setMinute(next.minute)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const update = (nextHour: string, nextMinute: string) => {
    setHour(nextHour)
    setMinute(nextMinute)
    onChange(composeTime(nextHour, nextMinute))
  }

  const enter = (part: Part) => (e: FocusEvent<HTMLInputElement> | MouseEvent<HTMLInputElement>) => {
    fresh.current = part
    // Also select it (after the click lands) so touch keyboards overwrite too.
    const input = e.currentTarget
    setTimeout(() => {
      if (document.activeElement === input) input.select()
    })
  }

  const firstKey = (part: Part) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (fresh.current !== part) return
    fresh.current = null
    if (!/^\d$/.test(e.key) || e.ctrlKey || e.metaKey || e.altKey) return
    e.preventDefault()
    if (part === 'hour') update(e.key, minute)
    else update(hour, e.key)
  }

  // On leaving a field show the stored form: "8" → "08", "" minute → "00".
  const tidy = () => {
    fresh.current = null
    const next = splitTime(composeTime(hour, minute))
    setHour(next.hour)
    setMinute(next.minute)
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Input
        id="tx-time"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH"
        maxLength={2}
        aria-label={hourLabel}
        title={hourLabel}
        className={FIELD}
        value={hour}
        onFocus={enter('hour')}
        onClick={enter('hour')}
        onKeyDown={firstKey('hour')}
        onChange={(e) => update(twoDigits(e.target.value), minute)}
        onBlur={tidy}
      />
      <span aria-hidden className="text-sm font-semibold text-muted-foreground">
        :
      </span>
      <Input
        inputMode="numeric"
        autoComplete="off"
        placeholder="mm"
        maxLength={2}
        aria-label={minuteLabel}
        title={minuteLabel}
        className={FIELD}
        value={minute}
        onFocus={enter('minute')}
        onClick={enter('minute')}
        onKeyDown={firstKey('minute')}
        onChange={(e) => update(hour, twoDigits(e.target.value))}
        onBlur={tidy}
      />
    </div>
  )
}
