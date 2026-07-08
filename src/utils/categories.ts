// Must stay in sync with Domain/Transactions/TransactionCategories.cs on the backend.
export const CATEGORY_CODES = [
  'food',
  'transport',
  'bills',
  'shopping',
  'entertainment',
  'salary',
  'education',
  'other',
] as const

export type CategoryCode = (typeof CATEGORY_CODES)[number]
