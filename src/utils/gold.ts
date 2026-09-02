const quantityFormatter = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** Formats a gold quantity in chỉ (fractions allowed, e.g. 0.5). */
export function formatGoldQuantity(quantity: number): string {
  return quantityFormatter.format(quantity)
}
