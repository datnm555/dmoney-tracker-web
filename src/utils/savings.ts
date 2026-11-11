import dayjs from 'dayjs'
import type { SavingsGoalResponse } from '../api/types'

export interface GoalProgress {
  /** 0–100, capped. */
  pct: number
  /** Months of the plan that have started, counting the current one (0 before the start). */
  elapsed: number
  monthsLeft: number
  /** What still has to go in each remaining month (all of it when no month is left). */
  perMonth: number
  reached: boolean
  /** Last month of the plan, YYYY-MM. */
  endPeriod: string
}

export function goalProgress(goal: SavingsGoalResponse, balance: number, currentMonth: string): GoalProgress {
  const target = goal.targetAmount.amount
  const start = dayjs(`${goal.startPeriod}-01`)
  const sinceStart = dayjs(`${currentMonth}-01`).diff(start, 'month')
  const elapsed = Math.min(goal.months, Math.max(0, sinceStart + 1))
  const monthsLeft = goal.months - elapsed
  const remaining = Math.max(0, target - balance)
  return {
    pct: target > 0 ? Math.min(100, Math.round((balance / target) * 100)) : 0,
    elapsed,
    monthsLeft,
    perMonth: monthsLeft > 0 ? Math.ceil(remaining / monthsLeft) : remaining,
    reached: balance >= target,
    endPeriod: start.add(goal.months - 1, 'month').format('YYYY-MM'),
  }
}
