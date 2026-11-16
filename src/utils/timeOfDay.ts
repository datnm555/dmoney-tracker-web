/**
 * 24-hour time-of-day entry for the transaction form ("Giờ"). The native time input follows the
 * browser locale (AM/PM on many machines), so the form uses a plain text field instead.
 */

/** Keeps up to 4 digits and inserts the colon as the user types: "083" → "08:3". */
export function maskTimeInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4)
  return digits.length > 2 ? `${digits.slice(0, 2)}:${digits.slice(2)}` : digits
}

/**
 * Normalizes typed text to "HH:mm" (00:00–23:59): "8" → "08:00", "830" → "08:30", "1745" → "17:45".
 * Returns "" for empty input and null when it is not a valid 24-hour time.
 */
export function normalizeTime(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed === '') return ''
  if (!/^\d{1,2}(:?\d{0,2})$/.test(trimmed)) return null
  const digits = trimmed.replace(':', '')
  const hasColon = trimmed.includes(':')
  let hours: string
  let minutes: string
  if (hasColon) {
    ;[hours, minutes] = trimmed.split(':')
    if (minutes.length === 1) return null
  } else if (digits.length <= 2) {
    hours = digits
    minutes = '00'
  } else {
    hours = digits.slice(0, digits.length - 2)
    minutes = digits.slice(-2)
  }
  if (minutes === '') minutes = '00'
  const h = Number(hours)
  const m = Number(minutes)
  if (h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
