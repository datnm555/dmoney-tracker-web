import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES, splitTime, withHour, withMinute } from './timeOfDay'

describe('timeOfDay', () => {
  it('lists 24-hour hours and all minutes', () => {
    expect(HOURS[0]).toBe('00')
    expect(HOURS.at(-1)).toBe('23')
    expect(MINUTES).toHaveLength(60)
  })
  it('splits HH:mm and treats empty as no time', () => {
    expect(splitTime('08:30')).toEqual({ hour: '08', minute: '30' })
    expect(splitTime('')).toEqual({ hour: '', minute: '' })
  })
  it('changing the hour keeps the minute, 00 when there was none', () => {
    expect(withHour('08:30', '17')).toBe('17:30')
    expect(withHour('', '09')).toBe('09:00')
    expect(withHour('08:30', '')).toBe('')
  })
  it('changing the minute keeps the hour', () => {
    expect(withMinute('08:00', '45')).toBe('08:45')
    expect(withMinute('', '45')).toBe('')
  })
})
