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
  planId: string
  reimbursedByTransactionId: string | null
  links: LinkedTransactionResponse[] | null
  beneficiaryId: string | null
  beneficiaryName: string | null
  goldTypeId: string | null
  goldTypeName: string | null
  goldQuantity: number | null
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
  refreshToken: string
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

// Mirrors Application/Transactions/Data/CreditResponse.cs on the backend.
export interface CreditResponse {
  id: string
  date: string
  content: string
  credit: MoneyResponse
}

// Mirrors Application/Categories/Data/CategoryResponse.cs on the backend.
export interface CategoryResponse {
  id: string
  name: string
  icon: string
  /** Built-in code for seeded system categories; null for user-created ones. */
  code: string | null
  /** Which transaction direction the category applies to: 'expense' | 'income' | 'both'. */
  kind: string
}

// Mirrors Application/Plans/Data/PlanResponse.cs on the backend.
export interface PlanResponse {
  id: string
  name: string
  isDefault: boolean
}

// Mirrors Application/Beneficiaries/Data/BeneficiaryResponse.cs on the backend.
export interface BeneficiaryResponse {
  id: string
  name: string
  isDefault: boolean
}

// Mirrors Application/GoldTypes/Data/GoldTypeResponse.cs on the backend.
export interface GoldTypeResponse {
  id: string
  name: string
}

// Mirrors Application/Gold/Data/GoldSummaryResponse.cs on the backend.
export interface GoldTypeSummaryResponse {
  goldTypeId: string
  name: string
  heldQuantity: number
  boughtQuantity: number
  soldQuantity: number
  totalSpent: MoneyResponse
  totalReceived: MoneyResponse
  averageCostPerChi: MoneyResponse
}

export interface GoldTransactionResponse {
  transactionId: string
  date: string // YYYY-MM-DD
  content: string
  goldTypeId: string
  goldTypeName: string
  goldQuantity: number
  credit: MoneyResponse
  debit: MoneyResponse
  pricePerChi: MoneyResponse
}

// Mirrors Application/Gold/Data/GoldAcquisitionResponse.cs on the backend.
export interface GoldAcquisitionResponse {
  id: string
  date: string // YYYY-MM-DD
  goldTypeId: string
  goldTypeName: string
  quantity: number
  unitPrice: MoneyResponse
  value: MoneyResponse
  note: string | null
}

export interface GoldSummaryResponse {
  types: GoldTypeSummaryResponse[]
  transactions: GoldTransactionResponse[]
  acquisitions: GoldAcquisitionResponse[]
}

// Mirrors the request body for POST/PUT /gold/acquisitions on the backend.
export interface GoldAcquisitionPayload {
  goldTypeId: string
  date: string // YYYY-MM-DD
  quantity: number
  unitPrice: number
  note: string | null
}
