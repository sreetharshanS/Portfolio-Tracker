export interface MarketIndexQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  providerTimestamp: number
}

interface YahooChartResponse {
  chart?: {
    error?: { description?: string } | null
    result?: Array<{
      meta?: {
        regularMarketPrice?: number
        chartPreviousClose?: number
        previousClose?: number
        regularMarketTime?: number
      }
    }> | null
  }
}

const INDEXES = [
  { symbol: '^NSEI', name: 'NIFTY 50' },
  { symbol: '^BSESN', name: 'SENSEX' },
  { symbol: '^NSEBANK', name: 'NIFTY BANK' },
] as const

async function fetchIndexQuote(index: (typeof INDEXES)[number], signal: AbortSignal): Promise<MarketIndexQuote> {
  const encodedSymbol = encodeURIComponent(index.symbol)
  const path = `/api/finance/v8/finance/chart/${encodedSymbol}?range=1d&interval=1m`
  const response = await fetch(path, { signal, cache: 'no-store' })
  if (!response.ok) throw new Error(`Market quote request failed (${response.status}).`)

  const json = await response.json() as YahooChartResponse
  const result = json.chart?.result?.[0]
  const meta = result?.meta
  if (json.chart?.error || !meta || typeof meta.regularMarketPrice !== 'number') {
    throw new Error(json.chart?.error?.description ?? `No quote available for ${index.name}.`)
  }

  const previousClose = meta.chartPreviousClose ?? meta.previousClose
  if (typeof previousClose !== 'number' || previousClose <= 0) {
    throw new Error(`Previous close is unavailable for ${index.name}.`)
  }

  const change = meta.regularMarketPrice - previousClose
  return {
    symbol: index.symbol,
    name: index.name,
    price: meta.regularMarketPrice,
    change,
    changePercent: (change / previousClose) * 100,
    providerTimestamp: meta.regularMarketTime ?? Math.floor(Date.now() / 1000),
  }
}

export async function fetchMarketIndices(signal: AbortSignal): Promise<MarketIndexQuote[]> {
  return Promise.all(INDEXES.map((index) => fetchIndexQuote(index, signal)))
}
