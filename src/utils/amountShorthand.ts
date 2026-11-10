const UNIT_MULTIPLIER: Record<string, number> = { k: 1_000, tr: 1_000_000, m: 1_000_000 }

/**
 * Parses a typed amount: plain digits (optionally with thousand separators, `1.500.000`)
 * or shorthand — `k` = ×1,000, `tr`/`m` = ×1,000,000, with the fractional part written
 * either as a decimal (`1.5tr`, `1,5tr`) or as trailing digits (`1tr5` = 1.5tr, `1tr250` = 1.25tr).
 * Returns null for anything else.
 */
export function parseAmountShorthand(input: string): number | null {
  const s = input.toLowerCase().replace(/\s+/g, '')
  if (s === '') return null
  if (/^\d+$/.test(s)) return Number(s)
  if (/^\d{1,3}([.,]\d{3})+$/.test(s)) return Number(s.replace(/[.,]/g, ''))

  // Before a unit, a dot/comma followed by exactly 3 digits is a thousand separator
  // (1.200k = 1,200,000; 1.500tr = 1,500,000,000); a single dot/comma followed by 1-2 digits is a
  // decimal (1.5tr, 1,5tr, 2.25m).
  const grouped = /^(\d{1,3}(?:[.,]\d{3})+)(k|tr|m)$/.exec(s)
  if (grouped) return Number(grouped[1].replace(/[.,]/g, '')) * UNIT_MULTIPLIER[grouped[2]]

  const match = /^(\d+)(?:[.,](\d{1,2}))?(k|tr|m)(\d+)?$/.exec(s)
  if (!match) return null
  const [, whole, decimals, unit, trailing] = match
  if (decimals !== undefined && trailing !== undefined) return null
  const fraction = decimals ?? trailing ?? '0'
  return Math.round(Number(`${whole}.${fraction}`) * UNIT_MULTIPLIER[unit])
}
