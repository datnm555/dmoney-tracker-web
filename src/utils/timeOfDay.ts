/**
 * Time of day ("Giờ") for the transaction form, kept as "HH:mm" (24-hour) or "" for no time.
 * Hour and minute are typed in two small fields; the minute defaults to 00.
 */

/** Digits only, at most 2. */
export function twoDigits(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 2)
}

export function splitTime(value: string): { hour: string; minute: string } {
  const [hour = '', minute = ''] = value ? value.split(':') : []
  return { hour, minute: hour ? minute || '00' : '' }
}

/** Hour + minute text → "HH:mm" (hour capped at 23, minute at 59, empty minute = 00); empty hour = no time. */
export function composeTime(hourText: string, minuteText: string): string {
  if (hourText === '') return ''
  const hour = Math.min(23, Number(hourText))
  const minute = minuteText === '' ? 0 : Math.min(59, Number(minuteText))
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}
