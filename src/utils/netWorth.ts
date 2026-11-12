import type { AccountResponse, GoldSummaryResponse, SavingsSummaryResponse } from '../api/types'
import { cashTotal, debtTotal } from './accounts'

export interface NetWorth {
  /** Current balances of money accounts that have a reading. */
  money: number
  /** Savings books across every plan. */
  savings: number
  /** Gold still held, at its average cost. */
  gold: number
  /** Owed on overdrafts and credit cards that have a reading. */
  debt: number
  total: number
}

/** Gold held at cost: each type's held quantity × its average cost per chỉ. */
export function goldAtCost(gold: GoldSummaryResponse | null): number {
  return (gold?.types ?? []).reduce((s, g) => s + Math.max(0, g.heldQuantity) * g.averageCostPerChi.amount, 0)
}

/** Money + savings + gold (at cost) − debt. Every input already spans all plans. */
export function netWorth(
  accounts: AccountResponse[],
  savings: SavingsSummaryResponse | null,
  gold: GoldSummaryResponse | null,
): NetWorth {
  const money = cashTotal(accounts)
  const saved = savings?.totalBalance.amount ?? 0
  const goldValue = Math.round(goldAtCost(gold))
  const debt = debtTotal(accounts)
  return { money, savings: saved, gold: goldValue, debt, total: money + saved + goldValue - debt }
}
