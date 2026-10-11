export interface OHLCPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export type PriceDataSource = 'Real-time' | 'Delayed (15m)' | 'End-of-Day' | 'CSV Upload'

export interface ScannedStock {
  id: string
  symbol: string
  name: string
  exchange: 'NSE' | 'BSE'
  sector?: string
  latestPrice: number
  high52W: number
  low52W: number
  distFromHighPct: number // ((high52W - latestPrice) / high52W) * 100
  distFromLowPct: number // ((latestPrice - low52W) / low52W) * 100
  latestTimestamp: string
  priceType: PriceDataSource
  volume?: number
  historyCount: number
  startDate?: string
  endDate?: string
  history: OHLCPoint[]
}

export interface ScannerFilters {
  exchange: 'ALL' | 'NSE' | 'BSE'
  thresholdPct: number
  minPrice: string
  maxPrice: string
  searchQuery: string
  sector: string
  minVolume: string
  onlyOwned: boolean
  onlyWatchlist: boolean
  sortBy: 'latestPrice' | 'distFromHigh' | 'distFromLow' | 'volume' | 'name'
  sortDirection: 'asc' | 'desc'
}
