import { useMemo, useState } from 'react'
import {
  HiOutlineStar,
  HiStar,
  HiOutlineMagnifyingGlass,
  HiOutlineFunnel,
  HiOutlineArrowUpTray,
  HiOutlineQuestionMarkCircle,
  HiOutlineXMark,
  HiOutlineCheckCircle,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowTrendingDown,
  HiOutlinePlus,
  HiOutlineInformationCircle,
} from 'react-icons/hi2'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCompactCurrency, formatCurrency, formatDate } from '../lib/format'
import { parseOHLCCsv } from '../lib/scannerCalculations'
import type { Holding } from '../types/portfolio'
import type { ScannedStock, ScannerFilters } from '../types/scanner'

interface StockScannerViewProps {
  stocks: ScannedStock[]
  holdings: Holding[]
  watchlist: Set<string>
  onToggleWatchlist: (symbol: string) => void
  onAddStockToHoldings: (stock: ScannedStock) => void
  onCustomStockUploaded: (stock: ScannedStock) => void
}

type ScannerTab = 'nearHigh' | 'nearLow' | 'all'

export function StockScannerView({
  stocks,
  holdings,
  watchlist,
  onToggleWatchlist,
  onAddStockToHoldings,
  onCustomStockUploaded,
}: StockScannerViewProps) {
  const [activeTab, setActiveTab] = useState<ScannerTab>('nearHigh')
  const [selectedStock, setSelectedStock] = useState<ScannedStock | null>(null)
  const [showSetupModal, setShowSetupModal] = useState(false)
  const [csvUploadError, setCsvUploadError] = useState('')
  const [csvUploadSuccess, setCsvUploadSuccess] = useState('')

  // Filter state
  const [filters, setFilters] = useState<ScannerFilters>({
    exchange: 'ALL',
    thresholdPct: 2, // Default 2%
    minPrice: '',
    maxPrice: '',
    searchQuery: '',
    sector: 'ALL',
    minVolume: '',
    onlyOwned: false,
    onlyWatchlist: false,
    sortBy: 'distFromHigh',
    sortDirection: 'asc',
  })

  // Set of owned symbols for instant cross-referencing
  const ownedSymbolsMap = useMemo(() => {
    const map = new Map<string, Holding>()
    for (const h of holdings) {
      if (h.symbol) {
        // Strip .NS or .BO suffix if present
        const clean = h.symbol.replace(/\.(NS|BO|BSE)$/i, '').toUpperCase()
        map.set(clean, h)
      }
      map.set(h.name.toUpperCase(), h)
    }
    return map
  }, [holdings])

  // Unique sectors available in dataset
  const availableSectors = useMemo(() => {
    const s = new Set<string>()
    for (const stock of stocks) {
      if (stock.sector) s.add(stock.sector)
    }
    return Array.from(s).sort()
  }, [stocks])

  // Filter & classify stocks
  const filteredStocks = useMemo(() => {
    return stocks
      .filter((stock) => {
        // Tab classification based on configurable threshold
        const isNearHigh = stock.distFromHighPct >= 0 && stock.distFromHighPct <= filters.thresholdPct
        const isNearLow = stock.distFromLowPct >= 0 && stock.distFromLowPct <= filters.thresholdPct

        if (activeTab === 'nearHigh' && !isNearHigh) return false
        if (activeTab === 'nearLow' && !isNearLow) return false

        // Exchange filter
        if (filters.exchange !== 'ALL' && stock.exchange !== filters.exchange) return false

        // Search query (symbol or name)
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase()
          const matches = stock.symbol.toLowerCase().includes(q) || stock.name.toLowerCase().includes(q)
          if (!matches) return false
        }

        // Sector filter
        if (filters.sector !== 'ALL' && stock.sector !== filters.sector) return false

        // Price range
        const minP = Number(filters.minPrice)
        const maxP = Number(filters.maxPrice)
        if (Number.isFinite(minP) && minP > 0 && stock.latestPrice < minP) return false
        if (Number.isFinite(maxP) && maxP > 0 && stock.latestPrice > maxP) return false

        // Min Volume
        const minVol = Number(filters.minVolume)
        if (Number.isFinite(minVol) && minVol > 0 && (!stock.volume || stock.volume < minVol)) return false

        // Watchlist filter
        if (filters.onlyWatchlist && !watchlist.has(stock.symbol)) return false

        // Owned filter
        if (filters.onlyOwned && !ownedSymbolsMap.has(stock.symbol.toUpperCase())) return false

        return true
      })
      .sort((a, b) => {
        let diff = 0
        switch (filters.sortBy) {
          case 'latestPrice':
            diff = a.latestPrice - b.latestPrice
            break
          case 'distFromHigh':
            diff = a.distFromHighPct - b.distFromHighPct
            break
          case 'distFromLow':
            diff = a.distFromLowPct - b.distFromLowPct
            break
          case 'volume':
            diff = (a.volume ?? 0) - (b.volume ?? 0)
            break
          case 'name':
            diff = a.name.localeCompare(b.name)
            break
        }
        return filters.sortDirection === 'asc' ? diff : -diff
      })
  }, [stocks, activeTab, filters, watchlist, ownedSymbolsMap])

  // Count metrics for tabs
  const tabCounts = useMemo(() => {
    let nearHighCount = 0
    let nearLowCount = 0
    for (const s of stocks) {
      if (s.distFromHighPct >= 0 && s.distFromHighPct <= filters.thresholdPct) nearHighCount++
      if (s.distFromLowPct >= 0 && s.distFromLowPct <= filters.thresholdPct) nearLowCount++
    }
    return {
      nearHigh: nearHighCount,
      nearLow: nearLowCount,
      all: stocks.length,
    }
  }, [stocks, filters.thresholdPct])

  // CSV upload handler for historical OHLC files
  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvUploadError('')
    setCsvUploadSuccess('')

    try {
      const text = await file.text()
      // Extract symbol from filename (e.g. RELIANCE.csv -> RELIANCE)
      const baseName = file.name.replace(/\.[^/.]+$/, '').toUpperCase()
      const parsedStock = parseOHLCCsv(text, {
        symbol: baseName,
        name: `${baseName} (CSV Import)`,
        exchange: 'NSE',
      })

      if (!parsedStock) {
        throw new Error('Unable to extract valid historical OHLC rows from the uploaded CSV file.')
      }

      onCustomStockUploaded(parsedStock)
      setCsvUploadSuccess(`Successfully scanned ${parsedStock.symbol} (${parsedStock.historyCount} trading days)!`)
      setSelectedStock(parsedStock)
    } catch (err: unknown) {
      setCsvUploadError(err instanceof Error ? err.message : 'Failed to parse CSV.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-400">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" /> Daily Technical Screener
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">NSE &amp; BSE Rolling 52-Week</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            52W High / Low Scanner
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <HiOutlineArrowUpTray className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Upload OHLC CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          </label>

          <button
            type="button"
            onClick={() => setShowSetupModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <HiOutlineQuestionMarkCircle className="h-4 w-4 text-sky-500" /> Data Provider Setup
          </button>
        </div>
      </div>

      {/* CSV feedback banner */}
      {csvUploadSuccess && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-center justify-between">
          <span>{csvUploadSuccess}</span>
          <button type="button" onClick={() => setCsvUploadSuccess('')}>
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}
      {csvUploadError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 flex items-center justify-between">
          <span>{csvUploadError}</span>
          <button type="button" onClick={() => setCsvUploadError('')}>
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 3 Main Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('nearHigh')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'nearHigh'
              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <HiOutlineArrowTrendingUp className="h-4 w-4 text-emerald-500" />
          <span>Near 52-Week High</span>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            {tabCounts.nearHigh}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('nearLow')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'nearLow'
              ? 'border-rose-600 text-rose-600 dark:border-rose-400 dark:text-rose-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <HiOutlineArrowTrendingDown className="h-4 w-4 text-rose-500" />
          <span>Near 52-Week Low</span>
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] text-rose-800 dark:bg-rose-950 dark:text-rose-300">
            {tabCounts.nearLow}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-xs font-bold transition ${
            activeTab === 'all'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <span>All Scanned Stocks</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {tabCounts.all}
          </span>
        </button>
      </div>

      {/* Comprehensive Filter & Control Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Query */}
          <div className="relative">
            <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company or ticker…"
              value={filters.searchQuery}
              onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
          </div>

          {/* Exchange Filter */}
          <select
            value={filters.exchange}
            onChange={(e) => setFilters({ ...filters, exchange: e.target.value as any })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Exchanges (NSE &amp; BSE)</option>
            <option value="NSE">NSE Only</option>
            <option value="BSE">BSE Only</option>
          </select>

          {/* Sector Filter */}
          <select
            value={filters.sector}
            onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
          >
            <option value="ALL">All Sectors ({availableSectors.length})</option>
            {availableSectors.map((sec) => (
              <option key={sec} value={sec}>
                {sec}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="flex gap-2">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="distFromHigh">Sort: Distance from 52W High</option>
              <option value="distFromLow">Sort: Distance from 52W Low</option>
              <option value="latestPrice">Sort: Latest Price (₹)</option>
              <option value="volume">Sort: Trading Volume</option>
              <option value="name">Sort: Company Name</option>
            </select>
            <button
              type="button"
              onClick={() =>
                setFilters({
                  ...filters,
                  sortDirection: filters.sortDirection === 'asc' ? 'desc' : 'asc',
                })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Toggle sort direction"
            >
              {filters.sortDirection === 'asc' ? '↑ Asc' : '↓ Desc'}
            </button>
          </div>
        </div>

        {/* Second Row: Threshold & Toggles */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
          {/* Threshold Slider */}
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Proximity Threshold:
            </span>
            <input
              type="range"
              min={0.5}
              max={10}
              step={0.5}
              value={filters.thresholdPct}
              onChange={(e) => setFilters({ ...filters, thresholdPct: Number(e.target.value) })}
              className="h-2 w-32 cursor-pointer appearance-none rounded-lg bg-slate-200 accent-emerald-600 dark:bg-slate-700"
            />
            <span className="rounded-lg bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
              {filters.thresholdPct.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-400">
              (default 2.0%)
            </span>
          </div>

          {/* Quick Checkbox Toggles */}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filters.onlyWatchlist}
                onChange={(e) => setFilters({ ...filters, onlyWatchlist: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <HiStar className="h-4 w-4 text-amber-500" />
              <span>Watchlist Only ({watchlist.size})</span>
            </label>

            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={filters.onlyOwned}
                onChange={(e) => setFilters({ ...filters, onlyOwned: e.target.checked })}
                className="h-4 w-4 rounded accent-emerald-600"
              />
              <HiOutlineCheckCircle className="h-4 w-4 text-emerald-600" />
              <span>In My Portfolio Only</span>
            </label>

            <button
              type="button"
              onClick={() =>
                setFilters({
                  exchange: 'ALL',
                  thresholdPct: 2,
                  minPrice: '',
                  maxPrice: '',
                  searchQuery: '',
                  sector: 'ALL',
                  minVolume: '',
                  onlyOwned: false,
                  onlyWatchlist: false,
                  sortBy: 'distFromHigh',
                  sortDirection: 'asc',
                })
              }
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* Main Stock Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              {activeTab === 'nearHigh'
                ? `Stocks within ${filters.thresholdPct}% of 52-Week High`
                : activeTab === 'nearLow'
                ? `Stocks within ${filters.thresholdPct}% of 52-Week Low`
                : 'All Scanned Stocks'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Displaying {filteredStocks.length} matching securities. Click any row to open the interactive historical price chart.
            </p>
          </div>
        </div>

        {filteredStocks.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <HiOutlineFunnel className="mx-auto mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">No stocks matched current criteria</p>
            <p className="mt-1">
              Try adjusting the proximity threshold percentage, clearing filters, or uploading custom OHLC data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50/70 text-slate-500 dark:bg-slate-950/40 dark:text-slate-400 font-semibold">
                <tr>
                  <th className="py-3.5 pl-5 pr-2 w-10 text-center">★</th>
                  <th className="py-3.5 px-3">Company &amp; Symbol</th>
                  <th className="py-3.5 px-3">Exchange</th>
                  <th className="py-3.5 px-3 text-right">Latest Price</th>
                  <th className="py-3.5 px-3 text-right">52W High</th>
                  <th className="py-3.5 px-3 text-right">52W Low</th>
                  <th className="py-3.5 px-3 text-right">Dist. from High</th>
                  <th className="py-3.5 px-3 text-right">Dist. from Low</th>
                  <th className="py-3.5 px-3">Data Timestamp</th>
                  <th className="py-3.5 pr-5 pl-3 text-center">Portfolio Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredStocks.map((stock) => {
                  const isWatchlisted = watchlist.has(stock.symbol)
                  const ownedHolding = ownedSymbolsMap.get(stock.symbol.toUpperCase())

                  const isNearHigh = stock.distFromHighPct >= 0 && stock.distFromHighPct <= filters.thresholdPct
                  const isNearLow = stock.distFromLowPct >= 0 && stock.distFromLowPct <= filters.thresholdPct

                  return (
                    <tr
                      key={stock.id}
                      onClick={() => setSelectedStock(stock)}
                      className="cursor-pointer transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      {/* Watchlist Star Toggle */}
                      <td
                        className="py-3.5 pl-5 pr-2 text-center"
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleWatchlist(stock.symbol)
                        }}
                      >
                        <button
                          type="button"
                          className="text-slate-300 hover:text-amber-500 dark:text-slate-600 dark:hover:text-amber-400"
                          title={isWatchlisted ? 'Remove from Watchlist' : 'Add to Watchlist'}
                        >
                          {isWatchlisted ? (
                            <HiStar className="h-4 w-4 text-amber-500" />
                          ) : (
                            <HiOutlineStar className="h-4 w-4" />
                          )}
                        </button>
                      </td>

                      {/* Name & Symbol */}
                      <td className="py-3.5 px-3">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{stock.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {stock.symbol}
                          </span>
                          {stock.sector && (
                            <span className="text-[10px] text-slate-400">
                              · {stock.sector}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Exchange */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            stock.exchange === 'NSE'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 ring-1 ring-inset ring-blue-600/20'
                              : 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 ring-1 ring-inset ring-purple-600/20'
                          }`}
                        >
                          {stock.exchange}
                        </span>
                      </td>

                      {/* Latest Price */}
                      <td className="py-3.5 px-3 text-right font-extrabold text-slate-900 dark:text-white">
                        {formatCurrency(stock.latestPrice)}
                      </td>

                      {/* 52W High */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(stock.high52W)}
                      </td>

                      {/* 52W Low */}
                      <td className="py-3.5 px-3 text-right font-medium text-slate-700 dark:text-slate-300">
                        {formatCurrency(stock.low52W)}
                      </td>

                      {/* Distance from High (%) */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isNearHigh
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          -{stock.distFromHighPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Distance from Low (%) */}
                      <td className="py-3.5 px-3 text-right">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            isNearLow
                              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          +{stock.distFromLowPct.toFixed(2)}%
                        </span>
                      </td>

                      {/* Timestamp & price source */}
                      <td className="py-3.5 px-3 text-[11px] text-slate-500 dark:text-slate-400">
                        <div>{formatDate(stock.latestTimestamp)}</div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {stock.priceType}
                        </span>
                      </td>

                      {/* Ownership status */}
                      <td className="py-3.5 pr-5 pl-3 text-center">
                        {ownedHolding ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <HiOutlineCheckCircle className="h-3 w-3" />
                            <span>Owned ({ownedHolding.quantity})</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">
                            Not in portfolio
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Details Modal / Drawer */}
      {selectedStock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setSelectedStock(null)}
          />
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-400">{selectedStock.exchange}</span>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">{selectedStock.name}</h3>
                </div>
                <p className="mt-0.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                  Symbol: <strong>{selectedStock.symbol}</strong> · {selectedStock.sector}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedStock(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Metrics Header */}
            <div className="mt-5 grid grid-cols-3 gap-3 rounded-2xl bg-slate-50 p-4 text-center dark:bg-slate-800/50">
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Latest Available Price</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white">
                  {formatCurrency(selectedStock.latestPrice)}
                </p>
                <p className="text-[10px] text-slate-400">{formatDate(selectedStock.latestTimestamp)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">52-Week High</p>
                <p className="mt-1 text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(selectedStock.high52W)}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  -{selectedStock.distFromHighPct.toFixed(2)}% away
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">52-Week Low</p>
                <p className="mt-1 text-lg font-extrabold text-rose-600 dark:text-rose-400">
                  {formatCurrency(selectedStock.low52W)}
                </p>
                <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                  +{selectedStock.distFromLowPct.toFixed(2)}% away
                </p>
              </div>
            </div>

            {/* Visual 52W Range Bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                <span>52W Low: <strong>{formatCurrency(selectedStock.low52W)}</strong></span>
                <span>Current: <strong>{formatCurrency(selectedStock.latestPrice)}</strong></span>
                <span>52W High: <strong>{formatCurrency(selectedStock.high52W)}</strong></span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500"
                  style={{
                    width: `${Math.min(
                      Math.max(
                        ((selectedStock.latestPrice - selectedStock.low52W) /
                          (selectedStock.high52W - selectedStock.low52W || 1)) *
                          100,
                        2,
                      ),
                      100,
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Historical Price Chart */}
            <div className="mt-6">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Historical Price Trend ({selectedStock.history.length} Data Points)
                </h4>
                <span className="text-[11px] text-slate-400">
                  {selectedStock.startDate ? `${selectedStock.startDate} to ${selectedStock.endDate}` : 'Rolling Window'}
                </span>
              </div>

              <div className="mt-3 h-52 w-full rounded-2xl border border-slate-100 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={selectedStock.history} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                    />
                    <Tooltip
                      formatter={(val) => formatCurrency(Number(val ?? 0))}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="close"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#chartGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onToggleWatchlist(selectedStock.symbol)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
              >
                {watchlist.has(selectedStock.symbol) ? (
                  <>
                    <HiStar className="h-4 w-4 text-amber-500" /> Remove from Watchlist
                  </>
                ) : (
                  <>
                    <HiOutlineStar className="h-4 w-4" /> Add to Watchlist
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onAddStockToHoldings(selectedStock)
                  setSelectedStock(null)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <HiOutlinePlus className="h-4 w-4" />
                {ownedSymbolsMap.has(selectedStock.symbol.toUpperCase())
                  ? 'Add More to Existing Position'
                  : 'Add to Portfolio Holdings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provider Setup Instructions Modal */}
      {showSetupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setShowSetupModal(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HiOutlineInformationCircle className="h-5 w-5 text-sky-500" />
                Market Data Provider Configuration
              </h3>
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <HiOutlineXMark className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs text-slate-600 dark:text-slate-300">
              <p>
                To fetch live rolling 52-week OHLC data from NSE &amp; BSE automatically, configure your private market data provider secret in Supabase. Secret keys are securely stored on the server and <strong>never exposed to client React code</strong>.
              </p>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 font-mono text-[11px] dark:border-slate-800 dark:bg-slate-950">
                <p className="text-slate-400"># 1. Set your Supabase Edge Function secret:</p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  supabase secrets set MARKET_DATA_API_KEY=your_key_here
                </p>
                <p className="mt-2 text-slate-400"># 2. Deploy the included market-data Edge Function:</p>
                <p className="text-emerald-600 dark:text-emerald-400">
                  supabase functions deploy market-data
                </p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-300">
                <strong>No API Key yet?</strong> No problem! The scanner comes pre-loaded with verified historical OHLC data for major Indian companies, and you can also upload any daily historical CSV file using the <em>&ldquo;Upload OHLC CSV&rdquo;</em> button.
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                type="button"
                onClick={() => setShowSetupModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white dark:bg-slate-800"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
