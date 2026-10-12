import { useMemo, useState } from 'react'
import { HiOutlineMagnifyingGlass } from 'react-icons/hi2'
import type { Holding, Milestone, Transaction } from '../types/portfolio'
import type { ScannedStock } from '../types/scanner'

type SearchFilter = 'All' | 'Holdings' | 'Transactions' | 'Stocks' | 'Pages'

interface SearchResult {
  id: string
  type: Exclude<SearchFilter, 'All'>
  title: string
  detail: string
  page: string
  query?: string
}

interface GlobalSearchProps {
  holdings: Holding[]
  transactions: Transaction[]
  milestones: Milestone[]
  stocks: ScannedStock[]
  pages: readonly string[]
  onNavigate: (page: string, query?: string) => void
  inputId?: string
  autoFocus?: boolean
  resultsLayout?: 'dropdown' | 'inline'
}

const filters: SearchFilter[] = ['All', 'Holdings', 'Transactions', 'Stocks', 'Pages']

function matchesQuery(query: string, values: Array<string | number | undefined>) {
  const normalizedQuery = query.trim().toLowerCase()
  return normalizedQuery.length > 0
    && values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery))
}

export function GlobalSearch({
  holdings,
  transactions,
  milestones,
  stocks,
  pages,
  onNavigate,
  inputId = 'global-search',
  autoFocus = false,
  resultsLayout = 'dropdown',
}: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<SearchFilter>('All')
  const [isOpen, setIsOpen] = useState(false)

  const results = useMemo(() => {
    if (!query.trim()) return []

    const allResults: SearchResult[] = [
      ...holdings
        .filter((holding) => matchesQuery(query, [
          holding.name,
          holding.symbol,
          holding.category,
          holding.marketCountry,
          holding.notes,
        ]))
        .map((holding) => ({
          id: `holding-${holding.id}`,
          type: 'Holdings' as const,
          title: holding.name,
          detail: [holding.symbol, holding.category].filter(Boolean).join(' · '),
          page: 'My Holdings',
          query: holding.name,
        })),
      ...transactions
        .filter((transaction) => matchesQuery(query, [
          transaction.assetName,
          transaction.type,
          transaction.date,
          transaction.notes,
          transaction.totalAmount,
        ]))
        .map((transaction) => ({
          id: `transaction-${transaction.id}`,
          type: 'Transactions' as const,
          title: transaction.assetName,
          detail: [transaction.type, transaction.date].filter(Boolean).join(' · '),
          page: 'Transactions',
        })),
      ...milestones
        .filter((milestone) => matchesQuery(query, [milestone.name, milestone.targetAmount]))
        .map((milestone) => ({
          id: `milestone-${milestone.name}`,
          type: 'Pages' as const,
          title: milestone.name,
          detail: 'Wealth milestone',
          page: 'Wealth Milestones',
        })),
      ...stocks
        .filter((stock) => matchesQuery(query, [stock.name, stock.symbol, stock.exchange, stock.sector]))
        .map((stock) => ({
          id: `stock-${stock.id}`,
          type: 'Stocks' as const,
          title: stock.name,
          detail: [stock.symbol, stock.exchange, stock.sector].filter(Boolean).join(' · '),
          page: '52W High / Low Scanner',
          query: stock.symbol,
        })),
      ...pages
        .filter((page) => matchesQuery(query, [page]))
        .map((page) => ({
          id: `page-${page}`,
          type: 'Pages' as const,
          title: page,
          detail: 'Open section',
          page,
        })),
    ]

    return allResults
      .filter((result) => filter === 'All' || result.type === filter)
      .slice(0, 8)
  }, [filter, holdings, milestones, pages, query, stocks, transactions])

  const selectResult = (result: SearchResult) => {
    onNavigate(result.page, result.query)
    setIsOpen(false)
    setQuery('')
  }

  return (
    <div className="relative w-full max-w-xl">
      <label className="sr-only" htmlFor={inputId}>Search portfolio</label>
      <div className={`flex items-center gap-2 rounded-2xl border bg-white p-1.5 shadow-sm transition focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/10 dark:bg-slate-900 ${
        resultsLayout === 'inline'
          ? 'h-14 border-slate-200 dark:border-slate-700'
          : 'h-9 border-slate-200/80 dark:border-slate-700 sm:h-10'
      }`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
          <HiOutlineMagnifyingGlass aria-hidden="true" className="h-4 w-4" />
        </span>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsOpen(false)
            if (event.key === 'Enter' && results[0]) selectResult(results[0])
          }}
          placeholder="Search…"
          autoFocus={autoFocus}
          autoComplete="off"
          aria-controls={`${inputId}-results`}
          aria-expanded={isOpen && Boolean(query.trim())}
          className={`min-w-0 flex-1 bg-transparent text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 dark:text-white ${
            resultsLayout === 'inline' ? 'text-base' : 'text-[10px] sm:text-xs'
          }`}
        />
        <select
          aria-label="Filter search results"
          value={filter}
          onChange={(event) => {
            setFilter(event.target.value as SearchFilter)
            setIsOpen(true)
          }}
          className={`max-w-24 cursor-pointer rounded-xl bg-slate-100 px-2.5 py-2 text-[11px] font-semibold text-slate-600 outline-none transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${
            resultsLayout === 'inline' ? 'block' : 'hidden sm:block'
          }`}
        >
          {filters.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>

      {isOpen && query.trim() && resultsLayout === 'dropdown' && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-10 cursor-default"
            aria-label="Close search results"
            onClick={() => setIsOpen(false)}
          />
          <div
            id={`${inputId}-results`}
            role="listbox"
            aria-label="Search results"
            className="absolute right-0 z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            {results.length ? results.map((result) => (
              <button
                key={result.id}
                type="button"
                role="option"
                aria-selected="false"
                onClick={() => selectResult(result)}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{result.title}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">{result.detail}</span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  {result.type}
                </span>
              </button>
            )) : (
              <p className="px-3 py-5 text-center text-xs text-slate-500 dark:text-slate-400">
                No matching information found.
              </p>
            )}
          </div>
        </>
      )}
      {resultsLayout === 'inline' && query.trim() && (
        <div
          id={`${inputId}-results`}
          role="listbox"
          aria-label="Search suggestions"
          className="mt-4 max-h-[min(55vh,28rem)] space-y-1 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900"
        >
          {results.length ? results.map((result) => (
            <button
              key={result.id}
              type="button"
              role="option"
              aria-selected="false"
              onClick={() => selectResult(result)}
              className="flex w-full items-center justify-between gap-3 rounded-xl border border-transparent bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50/50 dark:bg-slate-800 dark:hover:border-emerald-800 dark:hover:bg-slate-800"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{result.title}</span>
                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{result.detail}</span>
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                {result.type}
              </span>
            </button>
          )) : (
            <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              No matching information found.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
