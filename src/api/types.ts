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
  purchasePlaceId: string | null
  purchasePlaceName: string | null
  savingsBank: string | null
  /** True when the row's category or sub-category is flagged excludeFromStats. */
  excludedFromStats: boolean
  /** The account paid with ("Trả bằng"); moves its current balance after the latest reading. */
  accountId: string | null
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

/** Inclusive day range for GET /transactions ?from=&to= (both 'YYYY-MM-DD', at most 366 days). */
export interface DayRange {
  from: string
  to: string
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
  /** Stable system code (e.g. 'savings_book' for "Sổ tiết kiệm"); null for user-made ones. */
  code: string | null
  /** Transactions under this sub-category are left out of totals and charts. */
  excludeFromStats: boolean
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
  /** Transactions under this category are left out of totals and charts. */
  excludeFromStats: boolean
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

// Mirrors Application/PurchasePlaces/Data/PurchasePlaceResponse.cs on the backend.
export interface PurchasePlaceResponse {
  id: string
  name: string
}

// Mirrors Application/Banks/Data/BankResponse.cs on the backend.
export interface BankResponse {
  id: string
  name: string
  isDefault: boolean
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
  purchasePlaceId: string | null
  purchasePlaceName: string | null
}

// Mirrors Application/GoldAcquisitions/Data/GoldAcquisitionResponse.cs on the backend.
export interface GoldAcquisitionResponse {
  id: string
  date: string // YYYY-MM-DD
  goldTypeId: string
  goldTypeName: string
  quantity: number
  unitPrice: MoneyResponse
  value: MoneyResponse
  note: string | null
  purchasePlaceId: string | null
  purchasePlaceName: string | null
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
  purchasePlaceId: string | null
}

// Mirrors Application/Savings/Data/SavingsSummaryResponse.cs on the backend.
export interface SavingsAccountResponse {
  /** Where the savings are held; null = savings rows with no account set. */
  savingsBank: string | null
  balance: MoneyResponse
  totalDeposited: MoneyResponse
  totalWithdrawn: MoneyResponse
  transactionCount: number
  goal: SavingsGoalResponse | null
}

export interface SavingsGoalResponse {
  id: string
  targetAmount: MoneyResponse
  startPeriod: string // YYYY-MM
  months: number
  /** Saved before tracking began; already included in the account balance. */
  initialAmount: MoneyResponse
}

export interface SavingsTransactionResponse {
  transactionId: string
  date: string // YYYY-MM-DD
  content: string
  savingsBank: string | null
  bank: string | null
  credit: MoneyResponse // withdrawal
  debit: MoneyResponse // deposit
  planId: string
  subCategoryName: string | null
  note: string | null
}

export interface SavingsSummaryResponse {
  /** The user's default plan (sổ mặc định) the summary is scoped to. */
  planId: string
  planName: string
  totalBalance: MoneyResponse
  accounts: SavingsAccountResponse[]
  transactions: SavingsTransactionResponse[]
}

// Mirrors Domain/Accounts/AccountTypes.cs on the backend (string codes).
export type AccountType = 'checking' | 'overdraft' | 'credit_card' | 'ewallet' | 'cash'

// Mirrors Application/Accounts/AccountSnapshotResponse.cs on the backend.
export interface AccountSnapshotResponse {
  id: string
  accountId: string
  date: string
  balance: MoneyResponse
  statementAmount: MoneyResponse | null
  dueDate: string | null
  installmentRemaining: MoneyResponse | null
  statementPaid: boolean
  note: string | null
  statementUntracked: boolean // statement spending was never recorded as transactions
}

// Mirrors Application/Accounts/AccountResponse.cs on the backend.
export interface AccountResponse {
  id: string
  name: string
  type: AccountType
  lastDigits: string | null
  creditLimit: MoneyResponse | null
  statementDay: number | null
  dueDay: number | null
  interestRatePercent: number | null
  latestSnapshot: AccountSnapshotResponse | null
  bankName: string | null
  isDefault: boolean // preselected in the transaction form's "Trả bằng"; at most one
  /** Latest reading + linked transactions recorded after it (debt types: amount owed). */
  currentBalance: MoneyResponse
  transactionsSinceSnapshot: number
}

// Request body for POST/PUT /accounts (money fields are plain numbers).
export interface AccountInput {
  name: string
  type: AccountType
  lastDigits: string | null
  creditLimit: number | null
  statementDay: number | null
  dueDay: number | null
  interestRatePercent: number | null
  bankName: string | null
}

// Request body for POST/PUT account snapshots (money fields are plain numbers).
export interface SnapshotInput {
  date: string
  balance: number
  statementAmount: number | null
  dueDate: string | null
  installmentRemaining: number | null
  statementPaid: boolean
  note: string | null
  statementUntracked: boolean // statement spending was never recorded as transactions
}

// Mirrors Application/RecurringPayments/* responses on the backend.
export interface RecurringPaymentResponse {
  id: string
  name: string
  categoryId: string | null
  subCategoryId: string | null
  amount: MoneyResponse
  isVariable: boolean
  dayOfMonth: number
  paymentMethod: string | null
  bank: string | null
  note: string | null
  isActive: boolean
  startPeriod: string | null // YYYY-MM; hidden from earlier months' schedules
  savingsBank: string | null // "Nơi gửi" prefilled for savings deposits
}

export interface RecurringPaymentRecordResponse {
  id: string
  recurringPaymentId: string
  period: string // YYYY-MM
  amount: MoneyResponse
  paidDate: string // YYYY-MM-DD
  transactionId: string | null
}

export interface RecurringScheduleItemResponse {
  item: RecurringPaymentResponse
  dueDate: string // YYYY-MM-DD
  record: RecurringPaymentRecordResponse | null
}

// Request body for POST/PUT /recurring-payments (money fields are plain numbers).
export interface RecurringPaymentInput {
  name: string
  categoryId: string | null
  subCategoryId: string | null
  amount: number
  isVariable: boolean
  dayOfMonth: number
  paymentMethod: string | null
  bank: string | null
  note: string | null
  isActive: boolean
  startPeriod: string | null // YYYY-MM; hidden from earlier months' schedules
  savingsBank: string | null // "Nơi gửi" prefilled for savings deposits
}

export interface TransactionSuggestionResponse {
  content: string
  type: 'in' | 'out'
  amount: MoneyResponse
  categoryId: string | null
  subCategoryId: string | null
  paymentMethod: string
  cardType: string | null
  bank: string | null
}
