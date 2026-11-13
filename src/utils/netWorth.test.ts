import { describe, expect, it } from 'vitest'
import type { AccountResponse, GoldSummaryResponse, SavingsSummaryResponse } from '../api/types'
import { goldAtCost, netWorth } from './netWorth'

const money = (amount: number) => ({ amount, currency: 'VND' })

function account(type: AccountResponse['type'], balance: number, withReading = true): AccountResponse {
  return {
    id: Math.random().toString(36).slice(2),
    name: type,
    type,
    lastDigits: null,
    creditLimit: null,
    statementDay: null,
    dueDay: null,
    interestRatePercent: null,
    bankName: null,
    isDefault: false,
    latestSnapshot: withReading
      ? {
          id: 's',
          accountId: 'a',
          date: '2026-11-01',
          balance: money(balance),
          statementAmount: null,
          dueDate: null,
          installmentRemaining: null,
          statementPaid: false,
          note: null,
          statementUntracked: false,
        }
      : null,
    currentBalance: money(balance),
    transactionsSinceSnapshot: withReading ? 0 : 2,
    statementPaidAmount: money(0),
    untrackedDebt: null,
    untrackedDebtRemaining: null,
  }
}

const gold = {
  types: [
    { goldTypeId: 'g1', name: 'SJC', heldQuantity: 2, boughtQuantity: 3, soldQuantity: 1, totalSpent: money(0), totalReceived: money(0), averageCostPerChi: money(8_000_000) },
    { goldTypeId: 'g2', name: 'Nhẫn', heldQuantity: 0, boughtQuantity: 1, soldQuantity: 1, totalSpent: money(0), totalReceived: money(0), averageCostPerChi: money(7_000_000) },
  ],
  transactions: [],
  acquisitions: [],
} as GoldSummaryResponse

const savings = { totalBalance: money(50_000_000), accounts: [], transactions: [] } as unknown as SavingsSummaryResponse

describe('netWorth', () => {
  it('is money + savings + gold at cost − debt', () => {
    const accounts = [account('checking', 10_000_000), account('credit_card', 3_000_000), account('overdraft', 2_000_000)]
    expect(netWorth(accounts, savings, gold)).toEqual({
      money: 10_000_000,
      savings: 50_000_000,
      gold: 16_000_000,
      debt: 5_000_000,
      total: 71_000_000,
    })
  })

  it('leaves out accounts without a balance reading and missing summaries', () => {
    const accounts = [account('checking', 10_000_000), account('ewallet', -400_000, false)]
    expect(netWorth(accounts, null, null)).toEqual({ money: 10_000_000, savings: 0, gold: 0, debt: 0, total: 10_000_000 })
  })

  it('values held gold only', () => {
    expect(goldAtCost(gold)).toBe(16_000_000)
    expect(goldAtCost(null)).toBe(0)
  })
})
