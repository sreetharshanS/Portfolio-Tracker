import { describe, expect, it } from 'vitest'
import {
  filterFundamentalScreenerStocks,
  matchesFundamentalScreenerCriteria,
  parseFundamentalScreenerCsv,
} from '../lib/fundamentalScreener'

const qualifyingRow = {
  name: 'Example Industries',
  marketCapCr: 501,
  salesGrowth3Years: 12.1,
  profitGrowth3Years: 15.1,
  roce: 15.1,
  roe: 15.1,
  peRatio: 29.9,
  debtToEquity: 0.49,
  interestCoverage: 3.1,
  promoterPledge: 0,
}

describe('fundamental stock screener', () => {
  it('requires every requested threshold to pass strictly', () => {
    expect(matchesFundamentalScreenerCriteria(qualifyingRow)).toBe(true)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, marketCapCr: 500 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, salesGrowth3Years: 12 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, profitGrowth3Years: 15 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, roce: 15 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, roe: 15 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, peRatio: 30 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, debtToEquity: 0.5 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, interestCoverage: 3 })).toBe(false)
    expect(matchesFundamentalScreenerCriteria({ ...qualifyingRow, promoterPledge: 0.01 })).toBe(false)
  })

  it('parses quoted CSV columns and returns only qualifying stocks', () => {
    const csv = [
      '"Name","Market Capitalization","Sales growth 3Years","Profit growth 3Years","ROCE %","ROE %","Stock P/E","Debt to equity","Interest Coverage","Pledged percentage"',
      '"Example, Industries","₹501.2 Cr","12.1%","15.1%","15.1%","15.1%","29.9","0.49","3.1","0%"',
      '"Fails debt","501","13","16","16","16","20","0.5","4","0"',
    ].join('\r\n')

    const stocks = parseFundamentalScreenerCsv(csv)
    expect(stocks).toHaveLength(2)
    expect(stocks[0].name).toBe('Example, Industries')
    expect(filterFundamentalScreenerStocks(stocks)).toEqual([{
      ...qualifyingRow,
      name: 'Example, Industries',
      marketCapCr: 501.2,
    }])
  })

  it('reports missing required columns instead of silently filtering incomplete data', () => {
    expect(() => parseFundamentalScreenerCsv('Name,Market Capitalization\nTest,501'))
      .toThrow(/missing required columns/i)
  })
})
