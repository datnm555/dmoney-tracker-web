import dayjs from 'dayjs'
import type { AccountResponse, AccountType } from '../api/types'

const DEBT_TYPES: AccountType[] = ['overdraft', 'credit_card']

export function isDebtType(type: AccountType): boolean {
  return DEBT_TYPES.includes(type)
}

/** Whether anything is known about the balance: a reading, or transactions paid with the account. */
export function hasBalance(a: AccountResponse): boolean {
  return a.latestSnapshot !== null || a.transactionsSinceSnapshot > 0
}

/**
 * Whether the account counts in totals: only with a balance reading. Without one, its "balance" is
 * just the sum of linked transactions from zero, which says nothing about what it really holds.
 */
export function countsInTotals(a: AccountResponse): boolean {
  return a.latestSnapshot !== null
}

/** Latest reading plus the linked transactions recorded after it. */
export function currentBalance(a: AccountResponse): number {
  return a.currentBalance.amount
}

/**
 * What is still owed on the latest statement: the statement amount minus what was paid into the card
 * since that reading (transactions with "Chuyển vào" = the card). Deleting a payment reopens it.
 */
export function statementRemaining(a: AccountResponse): number {
  const statement = a.latestSnapshot?.statementAmount?.amount ?? 0
  return Math.max(0, statement - (a.statementPaidAmount?.amount ?? 0))
}

/** Statement settled: marked paid on the reading, or fully paid by transactions since. */
export function statementSettled(a: AccountResponse): boolean {
  const snap = a.latestSnapshot
  if (!snap) return false
  return snap.statementPaid || ((snap.statementAmount?.amount ?? 0) > 0 && statementRemaining(a) === 0)
}

export function cashTotal(accounts: AccountResponse[]): number {
  return accounts.filter((a) => !isDebtType(a.type) && countsInTotals(a)).reduce((s, a) => s + currentBalance(a), 0)
}

export function debtTotal(accounts: AccountResponse[]): number {
  return accounts.filter((a) => isDebtType(a.type) && countsInTotals(a)).reduce((s, a) => s + currentBalance(a), 0)
}

export function availableCredit(accounts: AccountResponse[]): number {
  return accounts.reduce((s, a) => {
    if (!isDebtType(a.type) || !a.creditLimit || !countsInTotals(a)) return s
    return s + Math.max(0, a.creditLimit.amount - currentBalance(a))
  }, 0)
}

export function monthlyInterest(account: AccountResponse): number {
  if (account.type !== 'overdraft' || account.interestRatePercent == null || !countsInTotals(account)) return 0
  return Math.round((currentBalance(account) * account.interestRatePercent) / 100 / 12)
}

export function upcomingDues(
  accounts: AccountResponse[],
  today: string,
): { account: AccountResponse; amount: number; dueDate: string; daysLeft: number; urgent: boolean }[] {
  const result: { account: AccountResponse; amount: number; dueDate: string; daysLeft: number; urgent: boolean }[] = []
  for (const account of accounts) {
    const snap = account.latestSnapshot
    if (account.type !== 'credit_card' || !snap || !snap.dueDate || statementSettled(account)) continue
    const amount = statementRemaining(account)
    if (amount <= 0) continue
    const daysLeft = dayjs(snap.dueDate).diff(dayjs(today), 'day')
    result.push({ account, amount, dueDate: snap.dueDate, daysLeft, urgent: daysLeft <= 3 })
  }
  return result.sort((a, b) => a.dueDate.localeCompare(b.dueDate))
}

export interface BankGroup {
  bankName: string | null
  /** Current balances of the bank's money accounts. */
  money: number
  /** Current amounts owed on the bank's overdrafts and credit cards. */
  debt: number
  accounts: AccountResponse[]
}

// Inside a bank: payment accounts first, then overdraft, then credit cards.
const TYPE_ORDER: AccountType[] = ['checking', 'ewallet', 'cash', 'overdraft', 'credit_card']

/**
 * Groups all accounts by free-text bank name (the bank is the parent; cards, overdrafts and payment
 * accounts sit inside it). Accounts without a snapshot are listed but count 0. Banks are sorted by
 * money + debt desc, then name; no-bank last.
 */
export function groupByBank(accounts: AccountResponse[]): BankGroup[] {
  const map = new Map<string | null, BankGroup>()
  for (const a of accounts) {
    const key = a.bankName?.trim() || null
    let group = map.get(key)
    if (!group) {
      group = { bankName: key, money: 0, debt: 0, accounts: [] }
      map.set(key, group)
    }
    if (countsInTotals(a)) {
      if (isDebtType(a.type)) group.debt += currentBalance(a)
      else group.money += currentBalance(a)
    }
    group.accounts.push(a)
  }
  for (const g of map.values()) {
    g.accounts.sort((x, y) => TYPE_ORDER.indexOf(x.type) - TYPE_ORDER.indexOf(y.type))
  }
  return [...map.values()].sort((x, y) => {
    if (x.bankName === null) return y.bankName === null ? 0 : 1
    if (y.bankName === null) return -1
    return y.money + y.debt - (x.money + x.debt) || x.bankName.localeCompare(y.bankName)
  })
}

/**
 * Month close for an account whose small transactions aren't recorded one by one:
 * what left the account = opening + money added − closing. Negative means more came in than went out.
 */
export function closeMonthNet(opening: number, topUps: number, closing: number): number {
  return opening + topUps - closing
}
