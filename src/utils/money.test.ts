import { describe, expect, it } from 'vitest'
import { formatMoney } from './money'

// Intl uses non-breaking spaces (U+00A0); normalize before asserting.
const fmt = (amount: number) =>
  formatMoney({ amount, currency: 'VND' }).replace(/ /g, ' ')

describe('formatMoney', () => {
  it('formats VND with dot thousand separators', () => {
    expect(fmt(15_000_000)).toBe('15.000.000 ₫')
  })

  it('formats zero', () => {
    expect(fmt(0)).toBe('0 ₫')
  })

  it('formats negative balances', () => {
    expect(fmt(-500_000)).toBe('-500.000 ₫')
  })
})
