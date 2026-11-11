export interface BankBrand {
  /** Short mark shown inside the badge. */
  short: string
  /** Brand colour for the badge background. */
  color: string
}

// Common Vietnamese banks / wallets; keys are lower-case with spaces removed.
const BRANDS: Record<string, BankBrand> = {
  vpbank: { short: 'VP', color: '#00a651' },
  techcombank: { short: 'TCB', color: '#e31e24' },
  vietinbank: { short: 'VTB', color: '#005993' },
  vietcombank: { short: 'VCB', color: '#007a33' },
  bidv: { short: 'BIDV', color: '#1e6bb8' },
  agribank: { short: 'AGR', color: '#ae1c3f' },
  mbbank: { short: 'MB', color: '#1e3a8a' },
  mb: { short: 'MB', color: '#1e3a8a' },
  acb: { short: 'ACB', color: '#0060af' },
  tpbank: { short: 'TP', color: '#6b2c91' },
  sacombank: { short: 'STB', color: '#0067ac' },
  hdbank: { short: 'HD', color: '#e2231a' },
  vib: { short: 'VIB', color: '#f58220' },
  shb: { short: 'SHB', color: '#f26f21' },
  momo: { short: 'MoMo', color: '#a50064' },
  zalopay: { short: 'ZP', color: '#0068ff' },
}

const FALLBACK_COLOR = '#6c4cf1' // app primary

/** Badge mark and colour for a bank name; unknown banks get their first letters in the app colour. */
export function bankBrand(name: string | null): BankBrand {
  if (!name) return { short: '?', color: '#a1a1aa' }
  const known = BRANDS[name.toLowerCase().replace(/\s+/g, '')]
  if (known) return known
  return { short: name.trim().slice(0, 2).toUpperCase(), color: FALLBACK_COLOR }
}
