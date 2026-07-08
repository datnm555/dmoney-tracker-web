export interface MoneyResponse {
  amount: number
  currency: string
}

export interface TransactionResponse {
  id: string
  date: string // YYYY-MM-DD
  content: string
  credit: MoneyResponse
  debit: MoneyResponse
  note: string | null
  category: string | null
  paymentMethod: string
  cardType: string | null
  bank: string | null
  isAdvance: boolean
  advanceTransactionId: string | null
}

export interface AdvanceResponse {
  id: string
  date: string // YYYY-MM-DD
  content: string
  debit: MoneyResponse
}

export interface MonthlySummaryResponse {
  items: TransactionResponse[]
  totalCredit: MoneyResponse
  totalDebit: MoneyResponse
  balance: MoneyResponse
}

export interface LoginResponse {
  token: string
  userId: string
  email: string
  username: string
  displayName: string
}

export interface MonthlyStat {
  month: string // YYYY-MM
  totalCredit: MoneyResponse
  totalDebit: MoneyResponse
  balance: MoneyResponse
}

export interface DailyStat {
  day: number
  debit: MoneyResponse
}

export interface CategoryStat {
  category: string
  debit: MoneyResponse
}

export interface DashboardStatsResponse {
  monthly: MonthlyStat[]
  daily: DailyStat[]
  byCategory: CategoryStat[]
}
