import { describe, expect, it } from 'vitest'
import { maskTimeInput, normalizeTime } from './timeOfDay'

describe('maskTimeInput', () => {
  it('keeps digits only and inserts the colon after the hours', () => {
    expect(maskTimeInput('8')).toBe('8')
    expect(maskTimeInput('08')).toBe('08')
    expect(maskTimeInput('083')).toBe('08:3')
    expect(maskTimeInput('0830')).toBe('08:30')
    expect(maskTimeInput('08:305')).toBe('08:30')
    expect(maskTimeInput('ab17h45')).toBe('17:45')
  })
})

describe('normalizeTime', () => {
  it('turns shorthand into 24-hour HH:mm', () => {
    expect(normalizeTime('8')).toBe('08:00')
    expect(normalizeTime('17')).toBe('17:00')
    expect(normalizeTime('830')).toBe('08:30')
    expect(normalizeTime('1745')).toBe('17:45')
    expect(normalizeTime('17:45')).toBe('17:45')
    expect(normalizeTime('0:05')).toBe('00:05')
    expect(normalizeTime('23:59')).toBe('23:59')
    expect(normalizeTime('17:')).toBe('17:00')
  })
  it('returns empty for no time and null for invalid times', () => {
    expect(normalizeTime('  ')).toBe('')
    expect(normalizeTime('24:00')).toBeNull()
    expect(normalizeTime('12:60')).toBeNull()
    expect(normalizeTime('17:4')).toBeNull()
    expect(normalizeTime('ab')).toBeNull()
  })
})
