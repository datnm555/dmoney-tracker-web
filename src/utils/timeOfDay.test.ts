import { describe, expect, it } from 'vitest'
import { composeTime, splitTime, twoDigits } from './timeOfDay'

describe('timeOfDay', () => {
  it('keeps at most two digits', () => {
    expect(twoDigits('8')).toBe('8')
    expect(twoDigits('17h')).toBe('17')
    expect(twoDigits('123')).toBe('12')
  })
  it('splits HH:mm and treats empty as no time', () => {
    expect(splitTime('08:30')).toEqual({ hour: '08', minute: '30' })
    expect(splitTime('')).toEqual({ hour: '', minute: '' })
  })
  it('composes a padded 24-hour time, minute 00 by default', () => {
    expect(composeTime('8', '')).toBe('08:00')
    expect(composeTime('17', '5')).toBe('17:05')
    expect(composeTime('09', '45')).toBe('09:45')
    expect(composeTime('', '30')).toBe('')
  })
  it('caps the hour at 23 and the minute at 59', () => {
    expect(composeTime('24', '00')).toBe('23:00')
    expect(composeTime('99', '75')).toBe('23:59')
  })
})
