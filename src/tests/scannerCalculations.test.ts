import { describe, expect, it } from 'vitest'
import { calculate52WeekMetrics, isNear52WeekHigh, isNear52WeekLow, parseOHLCCsv } from '../lib/scannerCalculations'
import type { OHLCPoint } from '../types/scanner'

describe('52-Week Scanner Calculations', () => {
  const sampleOHLC: OHLCPoint[] = [
    { date: '2025-10-15', open: 2400, high: 2450, low: 2380, close: 2420, volume: 1500000 },
    { date: '2026-01-10', open: 2500, high: 2600, low: 2490, close: 2580, volume: 1200000 },
    { date: '2026-05-12', open: 2900, high: 3000, low: 2850, close: 2950, volume: 2000000 },
    { date: '2026-08-01', open: 2920, high: 2980, low: 2910, close: 2970, volume: 1100000 },
  ]

  it('calculates 52-week high, low and unrounded distance percentages', () => {
    const stock = calculate52WeekMetrics(sampleOHLC, {
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd',
      exchange: 'NSE',
    })

    expect(stock).not.toBeNull()
    if (!stock) return

    expect(stock.high52W).toBe(3000)
    expect(stock.low52W).toBe(2380)
    expect(stock.latestPrice).toBe(2970)

    // Formula: ((3000 - 2970) / 3000) * 100 = 1%
    expect(stock.distFromHighPct).toBeCloseTo(1.0, 4)

    // Formula: ((2970 - 2380) / 2380) * 100 = 24.7899%
    expect(stock.distFromLowPct).toBeCloseTo(24.7899, 4)

    // Near high with 2% threshold
    expect(isNear52WeekHigh(stock, 2)).toBe(true)
    // Not near low
    expect(isNear52WeekLow(stock, 2)).toBe(false)
  })

  it('correctly classifies near-low stocks within configurable threshold', () => {
    const nearLowOHLC: OHLCPoint[] = [
      { date: '2025-11-01', open: 1500, high: 1600, low: 1480, close: 1550 },
      { date: '2026-04-10', open: 1200, high: 1220, low: 1000, close: 1050 },
      { date: '2026-09-01', open: 1020, high: 1030, low: 1005, close: 1015 },
    ]

    const stock = calculate52WeekMetrics(nearLowOHLC, {
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd',
      exchange: 'NSE',
    })

    expect(stock).not.toBeNull()
    if (!stock) return

    expect(stock.low52W).toBe(1000)
    expect(stock.latestPrice).toBe(1015)
    // ((1015 - 1000) / 1000) * 100 = 1.5%
    expect(stock.distFromLowPct).toBeCloseTo(1.5, 4)

    expect(isNear52WeekLow(stock, 2)).toBe(true)
    expect(isNear52WeekLow(stock, 1)).toBe(false) // If threshold is 1%, 1.5% is outside
  })

  it('parses OHLC CSV data and computes metrics accurately', () => {
    const csvData = `Date,Open,High,Low,Close,Volume
2025-11-01,100,120,95,110,50000
2026-03-01,115,130,110,125,60000
2026-08-15,124,128,122,126,75000`

    const parsed = parseOHLCCsv(csvData, {
      symbol: 'INFY',
      name: 'Infosys Ltd',
      exchange: 'NSE',
    })

    expect(parsed).not.toBeNull()
    if (!parsed) return

    expect(parsed.symbol).toBe('INFY')
    expect(parsed.high52W).toBe(130)
    expect(parsed.low52W).toBe(95)
    expect(parsed.latestPrice).toBe(126)
    expect(parsed.priceType).toBe('CSV Upload')
  })
})
