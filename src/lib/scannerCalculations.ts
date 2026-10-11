import type { OHLCPoint, ScannedStock } from '../types/scanner'

/**
 * Calculates rolling 52-week High, Low, and percentage distance metrics
 * based on valid historical daily OHLC data.
 *
 * Distance from high (%) = ((52-week high − latest price) / 52-week high) × 100
 * Distance from low (%) = ((latest price − 52-week low) / 52-week low) × 100
 */
export function calculate52WeekMetrics(
  history: OHLCPoint[],
  metadata: {
    symbol: string
    name: string
    exchange?: 'NSE' | 'BSE'
    sector?: string
    priceType?: ScannedStock['priceType']
    latestTimestamp?: string
  },
): ScannedStock | null {
  if (!history || history.length === 0) return null

  // Sort chronological
  const sorted = [...history]
    .filter((pt) => pt && pt.date && Number.isFinite(pt.close) && pt.close > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (sorted.length === 0) return null

  // Take the latest date as anchor
  const latestPoint = sorted[sorted.length - 1]
  const latestDate = new Date(latestPoint.date)

  // 52-week rolling window: 365 days prior or maximum available
  const oneYearAgoTime = latestDate.getTime() - 365 * 24 * 60 * 60 * 1000

  const window52W = sorted.filter((pt) => {
    const ptTime = new Date(pt.date).getTime()
    return ptTime >= oneYearAgoTime
  })

  const evaluationSet = window52W.length >= 10 ? window52W : sorted

  let maxHigh = -Infinity
  let minLow = Infinity

  for (const point of evaluationSet) {
    const highVal = Number.isFinite(point.high) && point.high > 0 ? point.high : point.close
    const lowVal = Number.isFinite(point.low) && point.low > 0 ? point.low : point.close

    if (highVal > maxHigh) maxHigh = highVal
    if (lowVal < minLow) minLow = lowVal
  }

  if (!Number.isFinite(maxHigh) || !Number.isFinite(minLow) || maxHigh <= 0 || minLow <= 0) {
    return null
  }

  const latestPrice = latestPoint.close
  const high52W = Math.max(maxHigh, latestPrice)
  const low52W = Math.min(minLow, latestPrice)

  // Unrounded calculations
  const distFromHighPct = high52W > 0 ? ((high52W - latestPrice) / high52W) * 100 : 0
  const distFromLowPct = low52W > 0 ? ((latestPrice - low52W) / low52W) * 100 : 0

  return {
    id: `${metadata.exchange ?? 'NSE'}:${metadata.symbol.toUpperCase()}`,
    symbol: metadata.symbol.toUpperCase(),
    name: metadata.name,
    exchange: metadata.exchange ?? 'NSE',
    sector: metadata.sector ?? 'General',
    latestPrice,
    high52W,
    low52W,
    distFromHighPct,
    distFromLowPct,
    latestTimestamp: metadata.latestTimestamp ?? latestPoint.date,
    priceType: metadata.priceType ?? 'End-of-Day',
    volume: latestPoint.volume,
    historyCount: evaluationSet.length,
    startDate: evaluationSet[0]?.date,
    endDate: latestPoint.date,
    history: sorted,
  }
}

/**
 * Checks if stock is near 52-week high within threshold %
 */
export function isNear52WeekHigh(stock: ScannedStock, thresholdPct = 2): boolean {
  return stock.distFromHighPct >= 0 && stock.distFromHighPct <= thresholdPct
}

/**
 * Checks if stock is near 52-week low within threshold %
 */
export function isNear52WeekLow(stock: ScannedStock, thresholdPct = 2): boolean {
  return stock.distFromLowPct >= 0 && stock.distFromLowPct <= thresholdPct
}

/**
 * Parses user-uploaded CSV containing historical daily OHLC data
 * Compatible with NSE, BSE, Yahoo Finance, and broker exports
 */
export function parseOHLCCsv(
  csvText: string,
  defaults: {
    symbol?: string
    name?: string
    exchange?: 'NSE' | 'BSE'
    sector?: string
  } = {},
): ScannedStock | null {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length < 2) return null

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/["']/g, ''))

  const dateIdx = header.findIndex((h) => h.includes('date') || h === 'timestamp')
  const openIdx = header.findIndex((h) => h.includes('open'))
  const highIdx = header.findIndex((h) => h.includes('high'))
  const lowIdx = header.findIndex((h) => h.includes('low'))
  const closeIdx = header.findIndex((h) => h.includes('close') || h.includes('price') || h.includes('ltp'))
  const volIdx = header.findIndex((h) => h.includes('vol') || h.includes('qty'))

  if (dateIdx === -1 || closeIdx === -1) {
    throw new Error('CSV must contain at least "Date" and "Close" columns.')
  }

  const history: OHLCPoint[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/["']/g, ''))
    if (cols.length < 2) continue

    const dateStr = cols[dateIdx]
    const closeVal = Number(cols[closeIdx].replace(/[^0-9.-]/g, ''))
    if (!dateStr || !Number.isFinite(closeVal) || closeVal <= 0) continue

    const openVal = openIdx !== -1 ? Number(cols[openIdx].replace(/[^0-9.-]/g, '')) : closeVal
    const highVal = highIdx !== -1 ? Number(cols[highIdx].replace(/[^0-9.-]/g, '')) : closeVal
    const lowVal = lowIdx !== -1 ? Number(cols[lowIdx].replace(/[^0-9.-]/g, '')) : closeVal
    const volVal = volIdx !== -1 ? Number(cols[volIdx].replace(/[^0-9.-]/g, '')) : undefined

    history.push({
      date: dateStr,
      open: Number.isFinite(openVal) && openVal > 0 ? openVal : closeVal,
      high: Number.isFinite(highVal) && highVal > 0 ? highVal : closeVal,
      low: Number.isFinite(lowVal) && lowVal > 0 ? lowVal : closeVal,
      close: closeVal,
      volume: Number.isFinite(volVal) ? volVal : undefined,
    })
  }

  if (history.length === 0) return null

  return calculate52WeekMetrics(history, {
    symbol: defaults.symbol || 'UPLOADED_STOCK',
    name: defaults.name || defaults.symbol || 'Imported Stock Data',
    exchange: defaults.exchange || 'NSE',
    sector: defaults.sector || 'Imported',
    priceType: 'CSV Upload',
  })
}
