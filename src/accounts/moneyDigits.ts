export const formatThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
export const toDigits = (n: number | null | undefined) => (n == null ? '' : String(Math.round(n)))
export const digitsToNumber = (d: string): number | null => (d === '' ? null : Number(d))
