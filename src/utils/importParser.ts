export interface ImportRow {
  date: string // YYYY-MM-DD
  content: string
  amount: number // signed: negative = money out, positive = money in
  note: string | null
}

export interface InvalidImportRow {
  rowIndex: number
  raw: unknown[]
  errorKey: string
}

export interface ParsedImport {
  valid: ImportRow[]
  invalid: InvalidImportRow[]
}

const CONTENT_MAX = 500
const NOTE_MAX = 1000
// Excel serial dates count days from 1899-12-30.
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30)
const MS_PER_DAY = 86_400_000

const pad = (n: number) => String(n).padStart(2, '0')

const toIso = (year: number, month: number, day: number): string | null => {
  const date = new Date(Date.UTC(year, month - 1, day))
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return roundTrips ? `${year}-${pad(month)}-${pad(day)}` : null
}

function parseDateCell(cell: unknown): string | null {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return `${cell.getFullYear()}-${pad(cell.getMonth() + 1)}-${pad(cell.getDate())}`
  }
  if (typeof cell === 'number' && Number.isFinite(cell) && cell > 0) {
    const date = new Date(EXCEL_EPOCH_MS + Math.round(cell) * MS_PER_DAY)
    return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
  }
  if (typeof cell === 'string') {
    const value = cell.trim()
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
    if (dmy) return toIso(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]))
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
    if (iso) return toIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }
  return null
}

function parseAmountCell(cell: unknown): number | null {
  if (typeof cell === 'number') {
    return Number.isFinite(cell) && cell !== 0 ? cell : null
  }
  if (typeof cell === 'string') {
    const value = cell.trim().replace(/\s/g, '')
    if (!/^-?\d[\d.,]*$/.test(value)) return null
    const negative = value.startsWith('-')
    const digits = value.replace(/[-.,]/g, '')
    if (digits.length === 0) return null
    const amount = Number(digits)
    if (!Number.isFinite(amount) || amount === 0) return null
    return negative ? -amount : amount
  }
  return null
}

const cellText = (cell: unknown): string =>
  cell === null || cell === undefined ? '' : String(cell).trim()

const isRowEmpty = (row: unknown[]): boolean => row.every((cell) => cellText(cell) === '')

export function parseImportRows(rows: unknown[][]): ParsedImport {
  const valid: ImportRow[] = []
  const invalid: InvalidImportRow[] = []

  rows.forEach((row, rowIndex) => {
    if (isRowEmpty(row)) return

    const date = parseDateCell(row[0])
    const amount = parseAmountCell(row[2])

    // First row is a header when neither its date nor its amount cell parses.
    if (rowIndex === 0 && date === null && amount === null) return

    if (date === null) {
      invalid.push({ rowIndex, raw: row, errorKey: 'import.errInvalidDate' })
      return
    }
    if (amount === null) {
      invalid.push({ rowIndex, raw: row, errorKey: 'import.errInvalidAmount' })
      return
    }
    const content = cellText(row[1]).slice(0, CONTENT_MAX)
    if (content === '') {
      invalid.push({ rowIndex, raw: row, errorKey: 'import.errEmptyContent' })
      return
    }
    const note = cellText(row[3]).slice(0, NOTE_MAX)

    valid.push({ date, content, amount, note: note === '' ? null : note })
  })

  return { valid, invalid }
}
