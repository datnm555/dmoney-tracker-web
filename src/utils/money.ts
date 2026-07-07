import type { MoneyResponse } from '../api/types'

const formatters = new Map<string, Intl.NumberFormat>()

export function formatMoney(money: MoneyResponse): string {
  let formatter = formatters.get(money.currency)
  if (!formatter) {
    formatter = new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: money.currency,
      maximumFractionDigits: 0,
    })
    formatters.set(money.currency, formatter)
  }
  return formatter.format(money.amount)
}
