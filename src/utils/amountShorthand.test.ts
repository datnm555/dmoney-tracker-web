import { describe, expect, it } from 'vitest'
import { parseAmountShorthand } from './amountShorthand'

describe('parseAmountShorthand', () => {
  it.each([
    ['50k', 50000],
    ['1tr5', 1500000],
    ['2tr', 2000000],
    ['1.5tr', 1500000],
    ['1,5tr', 1500000],
    ['1tr250', 1250000],
    ['2m', 2000000],
    ['15', 15],
    ['1.500.000', 1500000],
    ['1,500,000', 1500000],
    ['  1 tr 5 ', 1500000],
    ['50K', 50000],
    ['2TR', 2000000],
    ['1.5k', 1500],
  ])('parses %s as %i', (input, expected) => {
    expect(parseAmountShorthand(input)).toBe(expected)
  })

  it.each(['', '  ', 'abc', 'tr', '1x', '1tr5k', '1.5tr5', '--5', '1..5', '1.5', '-5k'])('returns null for %j', (input) => {
    expect(parseAmountShorthand(input)).toBeNull()
  })
})
