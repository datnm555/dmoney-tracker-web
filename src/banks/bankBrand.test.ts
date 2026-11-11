import { describe, expect, it } from 'vitest'
import { bankBrand } from './bankBrand'

describe('bankBrand', () => {
  it('knows common banks regardless of case and spaces', () => {
    expect(bankBrand('VPBank')).toEqual({ short: 'VP', color: '#00a651' })
    expect(bankBrand('Techcombank').short).toBe('TCB')
    expect(bankBrand('Vietin Bank').short).toBe('VTB')
    expect(bankBrand('Momo').short).toBe('MoMo')
  })

  it('falls back to the first letters in the app colour', () => {
    expect(bankBrand('Cake by VPBank')).toEqual({ short: 'CA', color: '#6c4cf1' })
  })

  it('uses a neutral mark when there is no bank', () => {
    expect(bankBrand(null).short).toBe('?')
  })
})
