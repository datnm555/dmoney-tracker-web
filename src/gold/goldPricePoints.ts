import type { GoldHistoryRow } from './GoldHistoryList'

/** Price per chỉ of every buy / sale / pre-owned lot, oldest first — the points of the trend line. */
export function goldPricePoints(rows: GoldHistoryRow[]): { date: string; price: number }[] {
  return rows
    .map((row) => ({
      date: row.date,
      price: row.kind === 'tx' ? row.tx.pricePerChi.amount : row.acq.unitPrice.amount,
    }))
    .filter((p) => p.price > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}
