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
  categoryId: string | null
  paymentMethod: string
  cardType: string | null
  bank: string | null
  isAdvance: boolean
  advanceTransactionIds: string[]
  isPrepaid: boolean
  prepaidFrom: string | null
  prepaidTo: string | null
  prepaidTransactionId: string | null
  subCategoryId: string | null
  subCategoryName: string | null
  reimbursedByTransactionId: string | null
  links: LinkedTransactionResponse[] | null
}

export interface LinkedTransactionResponse {
  id: string
  date: string // YYYY-MM-DD
  content: string
  credit: MoneyResponse
  debit: MoneyResponse
  relation: 'reimburses' | 'reimbursedBy' | 'covers' | 'coveredBy'
}

export interface AdvanceResponse {
  id: string
  date: string // YYYY-MM-DD
  content: string
  debit: MoneyResponse
}

export interface PrepaidCreditResponse {
  id: string
  date: string // YYYY-MM-DD
  content: string
  credit: MoneyResponse
  prepaidFrom: string | null
  prepaidTo: string | null
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
  categoryId: string | null
  debit: MoneyResponse
}

export interface DashboardStatsResponse {
  monthly: MonthlyStat[]
  daily: DailyStat[]
  byCategory: CategoryStat[]
}

export interface SubCategoryResponse {
  id: string
  categoryId: string
  name: string
  isDefault: boolean
  icon: string | null
}

// Mirrors Application/Categories/Data/CategoryResponse.cs on the backend.
export interface CategoryResponse {
  id: string
  name: string
  icon: string
  /** Built-in code for seeded system categories; null for user-created ones. */
  code: string | null
}
