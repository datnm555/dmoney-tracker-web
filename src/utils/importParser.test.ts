import { describe, expect, it } from 'vitest'
import { parseImportRows } from './importParser'

describe('parseImportRows', () => {
  it('parses DD/MM/YYYY and YYYY-MM-DD dates with signed amounts', () => {
    const { valid, invalid } = parseImportRows([
      ['07/07/2026', 'Lương tháng 7', '28.000.000', ''],
      ['2026-07-08', 'Tiền điện', '-1,200,000', 'kỳ 07'],
    ])

    expect(invalid).toHaveLength(0)
    expect(valid).toEqual([
      { date: '2026-07-07', content: 'Lương tháng 7', amount: 28_000_000, note: null },
      { date: '2026-07-08', content: 'Tiền điện', amount: -1_200_000, note: 'kỳ 07' },
    ])
  })

  it('converts Excel serial dates and numeric amounts', () => {
    // 46210 = 2026-07-07 (days since 1899-12-30)
    const { valid, invalid } = parseImportRows([[46210, 'Cà phê', -65000, null]])

    expect(invalid).toHaveLength(0)
    expect(valid).toEqual([{ date: '2026-07-07', content: 'Cà phê', amount: -65000, note: null }])
  })

  it('skips a header row automatically', () => {
    const { valid, invalid } = parseImportRows([
      ['Ngày', 'Nội dung', 'Số tiền', 'Ghi chú'],
      ['07/07/2026', 'Ăn trưa', '-50000', ''],
    ])

    expect(invalid).toHaveLength(0)
    expect(valid).toHaveLength(1)
    expect(valid[0].content).toBe('Ăn trưa')
  })

  it('flags invalid date, invalid amount and empty content with reasons', () => {
    const { valid, invalid } = parseImportRows([
      ['31/02/2026', 'Ngày sai', '1000', ''],
      ['07/07/2026', 'Tiền sai', 'abc', ''],
      ['07/07/2026', '   ', '1000', ''],
      ['07/07/2026', 'Số 0', '0', ''],
    ])

    expect(valid).toHaveLength(0)
    expect(invalid.map((r) => r.errorKey)).toEqual([
      'import.errInvalidDate',
      'import.errInvalidAmount',
      'import.errEmptyContent',
      'import.errInvalidAmount',
    ])
    expect(invalid[0].rowIndex).toBe(0)
  })

  it('ignores fully empty rows', () => {
    const { valid, invalid } = parseImportRows([
      ['07/07/2026', 'Ăn trưa', '-50000', ''],
      ['', '', '', ''],
      [null, null, null, null],
    ])

    expect(valid).toHaveLength(1)
    expect(invalid).toHaveLength(0)
  })
})
