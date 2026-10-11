import { useEffect, useState } from 'react'
import { HiOutlineArrowTrendingDown, HiOutlineArrowTrendingUp } from 'react-icons/hi2'
import { fetchMarketIndices } from '../services/marketIndicesService'
import type { MarketIndexQuote } from '../services/marketIndicesService'

const indexNumberFormat = new Intl.NumberFormat('en-IN', {
  maximumFractionDigits: 2,
})

export function MarketIndicesPanel() {
  const [quotes, setQuotes] = useState<MarketIndexQuote[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let requestInFlight = false
    let controller: AbortController | undefined

    const refresh = async () => {
      if (requestInFlight) return
      requestInFlight = true
      controller = new AbortController()

      try {
        const nextQuotes = await fetchMarketIndices(controller.signal)
        if (!active) return
        setQuotes(nextQuotes)
        setError('')
      } catch (refreshError) {
        if (!active || (refreshError instanceof DOMException && refreshError.name === 'AbortError')) return
        setError(refreshError instanceof Error ? refreshError.message : 'Market quotes could not be refreshed.')
      } finally {
        requestInFlight = false
      }
    }

    void refresh()
    const intervalId = window.setInterval(() => void refresh(), 60_000)

    return () => {
      active = false
      window.clearInterval(intervalId)
      controller?.abort()
    }
  }, [])

  return (
    <section aria-label="Market indices" className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-3">
        {(['NIFTY 50', 'SENSEX', 'NIFTY BANK'] as const).map((name) => {
          const quote = quotes.find((entry) => entry.name === name)
          const positive = (quote?.change ?? 0) >= 0
          const TrendIcon = positive ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown

          return (
            <article key={name} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <div className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">{name}</div>
              {quote ? (
                <>
                  <div className="mt-2 text-xl font-bold tabular-nums text-slate-900 dark:text-white">{indexNumberFormat.format(quote.price)}</div>
                  <div className={`mt-1 flex items-center gap-1 text-xs font-semibold tabular-nums ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    <TrendIcon className="h-4 w-4" />
                    {quote.change > 0 ? '+' : ''}{indexNumberFormat.format(quote.change)}
                    <span>({quote.changePercent > 0 ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
                  </div>
                </>
              ) : (
                <div className="mt-4 h-8 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
              )}
            </article>
          )
        })}
      </div>
      {error && <p role="status" className="text-xs text-amber-700 dark:text-amber-300">Index quotes unavailable: {error}</p>}
    </section>
  )
}
