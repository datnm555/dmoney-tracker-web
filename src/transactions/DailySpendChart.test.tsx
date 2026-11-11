import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DailySpendChart } from './DailySpendChart'

vi.mock('../i18n/I18nContext', () => ({
  useI18n: () => ({ t: (key: string) => key, lang: 'vi' }),
}))

const vnd = (amount: number) => ({ amount, currency: 'VND' })
const row = (date: string, debit: number, credit = 0, excludedFromStats = false) => ({
  date,
  debit: vnd(debit),
  credit: vnd(credit),
  excludedFromStats,
})

// Recharts' ResponsiveContainer renders nothing in jsdom — assert on the wrapper only.
describe('DailySpendChart', () => {
  it('renders one bar slot per day of the period with the peak day total', () => {
    render(
      <DailySpendChart
        items={[row('2026-11-03', 40_000), row('2026-11-03', 10_000), row('2026-11-10', 20_000)]}
        from="2026-11-01"
        to="2026-11-30"
        currency="VND"
      />,
    )
    const chart = screen.getByTestId('daily-spend-chart')
    expect(chart).toHaveAttribute('data-days', '30')
    expect(chart).toHaveAttribute('data-peak', '50000')
  })

  it('is hidden when the period has no counted spending', () => {
    render(
      <DailySpendChart
        items={[row('2026-11-03', 0, 5_000_000), row('2026-11-04', 300_000, 0, true)]}
        from="2026-11-01"
        to="2026-11-30"
        currency="VND"
      />,
    )
    expect(screen.queryByTestId('daily-spend-chart')).not.toBeInTheDocument()
  })
})
