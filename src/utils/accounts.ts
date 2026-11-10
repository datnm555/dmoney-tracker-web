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
