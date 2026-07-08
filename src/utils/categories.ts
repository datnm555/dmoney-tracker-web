// Must stay in sync with Domain/Transactions/TransactionCategories.cs on the backend.
// Selectable categories, in display order. "transport" and "entertainment" are
// legacy-only on the backend (existing rows keep them; not offered here).
export const CATEGORY_CODES = [
  'living',
  'salary',
  'education',
  'food',
  'shopping',
  'bills',
  'other',
] as const

export type CategoryCode = (typeof CATEGORY_CODES)[number]
