import dayjs from 'dayjs'
import type { AccountResponse, AccountType } from '../api/types'

const DEBT_TYPES: AccountType[] = ['overdraft', 'credit_card']

export function isDebtType(type: AccountType): boolean {
  return DEBT_TYPES.includes(type)
}

function latestBalance(a: AccountResponse): number {
  return a.latestSnapshot?.balance.amount ?? 0
}

export function cashTotal(accounts: AccountResponse[]): number {
  return accounts.filter((a) => !isDebtType(a.type)).reduce((s, a) => s + latestBalance(a), 0)
}

export function debtTotal(accounts: AccountResponse[]): number {
  return accounts.filter((a) => isDebtType(a.type)).reduce((s, a) => s + latestBalance(a), 0)
}

export function availableCredit(accounts: AccountResponse[]): number {
  return accounts.reduce((s, a) => {
    if (!isDebtType(a.type) || !a.creditLimit || !a.latestSnapshot) return s
    return s + Math.max(0, a.creditLimit.amount - a.latestSnapshot.balance.amount)
  }, 0)
}

export function monthlyInterest(account: AccountResponse): number {
  if (account.type !== 'overdraft' || account.interestRatePercent == null || !account.latestSnapshot) return 0
  return Math.round((latestBalance(account) * account.interestRatePercent) / 100 / 12)
}

export function upcomingDues(
  accounts: AccountResponse[],
  today: string,
): { account: AccountResponse; amount: number; dueDate: string; daysLeft: number; urgent: boolean }[] {
  const result: { account: AccountResponse; amount: number; dueDate: string; daysLeft: number; urgent: boolean }[] = []
  for (const account of accounts) {
    const snap = account.latestSnapshot
    if (account.type !== 'credit_card' || !snap || !snap.dueDate || snap.statementPaid) continue
    const amount = snap.statementAmount?.amount ?? 0
    if (amount <= 0) continue
    const daysLeft = dayjs(snap.dueDate).diff(dayjs(today), 'day')
    result.push({ account, amount, dueDate: snap.dueDate, daysLeft, urgent: daysLeft <= 3 })
  }
  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export interface BankGroup {
  bankName: string | null
  total: number
  accounts: AccountResponse[]
}

/**
 * Groups accounts by free-text bank name. total = sum of latest balances (for credit cards that is the amount
 * owed); accounts without a snapshot are listed but count 0. Sorted by total desc, then name; no-bank last.
 * Callers pass only the accounts of one page group (money types, or credit cards).
 */
export function groupByBank(accounts: AccountResponse[]): BankGroup[] {
  const map = new Map<string | null, BankGroup>()
  for (const a of accounts) {
    const key = a.bankName?.trim() || null
    let group = map.get(key)
    if (!group) {
      group = { bankName: key, total: 0, accounts: [] }
      map.set(key, group)
    }
    group.total += latestBalance(a)
    group.accounts.push(a)
  }
  return [...map.values()].sort((x, y) => {
    if (x.bankName === null) return y.bankName === null ? 0 : 1
    if (y.bankName === null) return -1
    return y.total - x.total || x.bankName.localeCompare(y.bankName)
  })
}

/**
 * Month close for an account whose small transactions aren't recorded one by one:
 * what left the account = opening + money added − closing. Negative means more came in than went out.
 */
export function closeMonthNet(opening: number, topUps: number, closing: number): number {
  return opening + topUps - closing
}
