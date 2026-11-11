import { describe, expect, it } from 'vitest'
import { goalProgress } from './savings'

const goal = { id: 'g', targetAmount: { amount: 60_000_000, currency: 'VND' }, startPeriod: '2026-11', months: 15, initialAmount: { amount: 0, currency: 'VND' } }

describe('goalProgress', () => {
  it('first month paid: 4tr of 60tr, 14 months left at 4tr each', () => {
    expect(goalProgress(goal, 4_000_000, '2026-11')).toEqual({
      pct: 7,
      elapsed: 1,
      monthsLeft: 14,
      perMonth: 4_000_000,
      reached: false,
      endPeriod: '2028-01',
    })
  })

  it('before the start nothing has elapsed', () => {
    const p = goalProgress(goal, 0, '2026-10')
    expect(p.elapsed).toBe(0)
    expect(p.monthsLeft).toBe(15)
    expect(p.perMonth).toBe(4_000_000)
  })

  it('after the end everything still missing is due now', () => {
    const p = goalProgress(goal, 50_000_000, '2028-05')
    expect(p.monthsLeft).toBe(0)
    expect(p.perMonth).toBe(10_000_000)
  })

  it('reached caps at 100% and needs nothing more', () => {
    const p = goalProgress(goal, 61_000_000, '2027-06')
    expect(p.pct).toBe(100)
    expect(p.reached).toBe(true)
    expect(p.perMonth).toBe(0)
  })
})
