import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { GoldAcquisitionResponse } from '../api/types'
import { GoldHistoryList, type GoldHistoryRow } from './GoldHistoryList'
import { goldPricePoints } from './goldPricePoints'

vi.mock('../i18n/I18nContext', () => ({ useI18n: () => ({ t: (k: string) => k, lang: 'vi' }) }))

const vnd = (amount: number) => ({ amount, currency: 'VND' })
const acq = (id: string, date: string, unitPrice: number, quantity = 5): GoldHistoryRow => ({
  kind: 'acq',
  date,
  key: id,
  acq: {
    id,
    date,
    goldTypeId: 'g',
    goldTypeName: 'Vàng ta 9999',
    quantity,
    unitPrice: vnd(unitPrice),
    value: vnd(unitPrice * quantity),
    note: id,
    purchasePlaceId: null,
    purchasePlaceName: 'Cậu Việt',
  } as GoldAcquisitionResponse,
})

// Newest first, as the page passes them.
const rows = [
  acq('oct', '2026-10-04', 13_500_000, 4),
  acq('aug-2', '2026-08-31', 13_990_000),
  acq('aug-1', '2026-08-01', 13_500_000),
  acq('jan', '2026-01-31', 16_750_000),
]

describe('goldPricePoints', () => {
  it('lists the price per chỉ oldest first', () => {
    expect(goldPricePoints(rows).map((p) => p.price)).toEqual([16_750_000, 13_500_000, 13_990_000, 13_500_000])
  })
})

describe('GoldHistoryList', () => {
  it('groups rows by month with the month quantity', () => {
    render(<GoldHistoryList rows={rows} onEdit={() => {}} onDelete={() => {}} />)
    const months = screen.getAllByTestId('gold-history-month')
    expect(months).toHaveLength(3)
    expect(months[1]).toHaveTextContent('08/2026')
    expect(months[1]).toHaveTextContent('+10 gold.unit')
  })

  it('flags lots dearer / cheaper than the average cost', () => {
    render(<GoldHistoryList rows={rows} avgCostPerChi={14_484_211} onEdit={() => {}} onDelete={() => {}} />)
    expect(screen.getAllByTestId('gold-vs-avg-up')).toHaveLength(1) // 16.75M in January
    expect(screen.getAllByTestId('gold-vs-avg-down')).toHaveLength(3)
  })
})
