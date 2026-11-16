/**
 * Time of day ("Giờ") for the transaction form, kept as "HH:mm" (24-hour) or "" for no time.
 * Hour and minute are picked separately: changing the hour keeps the minute (00 by default).
 */

export const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
export const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export function splitTime(value: string): { hour: string; minute: string } {
  const [hour = '', minute = ''] = value ? value.split(':') : []
  return { hour, minute: hour ? minute || '00' : '' }
}

/** New hour, same minute ("00" when there was no time yet); "" hour clears the time. */
export function withHour(value: string, hour: string): string {
  if (!hour) return ''
  return `${hour}:${splitTime(value).minute || '00'}`
}

/** Same hour, new minute; ignored while there is no hour. */
export function withMinute(value: string, minute: string): string {
  const { hour } = splitTime(value)
  return hour ? `${hour}:${minute}` : ''
}
