import { useMemo, useState } from 'react'
import { HiOutlineArrowTopRightOnSquare, HiOutlineArrowUpTray, HiOutlineFunnel, HiOutlineInformationCircle } from 'react-icons/hi2'
import { filterFundamentalScreenerStocks, parseFundamentalScreenerCsv } from '../lib/fundamentalScreener'
import type { FundamentalStock } from '../lib/fundamentalScreener'

const screenerQuery = 'Market Capitalization > 500 AND Sales growth 3Years > 12 AND Profit growth 3Years > 15 AND Return on capital employed > 15 AND Return on equity > 15 AND Stock P/E < 30 AND Debt to equity < 0.5 AND Interest Coverage > 3 AND Pledged percentage = 0'

const numberFormat = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

function percent(value: number) {
  return `${numberFormat.format(value)}%`
}

function crore(value: number) {
  return `₹${numberFormat.format(value)} Cr`
}

function downloadCsvTemplate() {
  const headers = [
    'Name',
    'Market Capitalization',
    'Sales growth 3Years',
    'Profit growth 3Years',
    'ROCE %',
    'ROE %',
    'Stock P/E',
    'Debt to equity',
    'Interest Coverage',
    'Pledged percentage',
  ]
  const file = new Blob([`${headers.join(',')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = 'wealthx-screener-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

export function FundamentalScreenerView() {
  const [stocks, setStocks] = useState<FundamentalStock[]>([])
  const [sourceFile, setSourceFile] = useState('')
  const [importedAt, setImportedAt] = useState('')
  const [error, setError] = useState('')
  const [isImporting, setIsImporting] = useState(false)

  const matches = useMemo(() => filterFundamentalScreenerStocks(stocks), [stocks])

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setIsImporting(true)
    setError('')
    try {
      const parsedStocks = parseFundamentalScreenerCsv(await file.text())
      setStocks(parsedStocks)
      setSourceFile(file.name)
      setImportedAt(new Date().toLocaleString())
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Could not read the screener CSV.')
    } finally {
      setIsImporting(false)
    }
  }

  const metrics: { label: string; value: (stock: FundamentalStock) => string; align?: 'right' }[] = [
    { label: 'Market Cap', value: (stock) => crore(stock.marketCapCr), align: 'right' },
    { label: 'Sales Growth · 3Y', value: (stock) => percent(stock.salesGrowth3Years), align: 'right' },
    { label: 'Profit Growth · 3Y', value: (stock) => percent(stock.profitGrowth3Years), align: 'right' },
    { label: 'ROCE', value: (stock) => percent(stock.roce), align: 'right' },
    { label: 'ROE', value: (stock) => percent(stock.roe), align: 'right' },
    { label: 'P/E', value: (stock) => numberFormat.format(stock.peRatio), align: 'right' },
    { label: 'Debt / Equity', value: (stock) => numberFormat.format(stock.debtToEquity), align: 'right' },
    { label: 'Interest Cover', value: (stock) => numberFormat.format(stock.interestCoverage), align: 'right' },
    { label: 'Pledge', value: (stock) => percent(stock.promoterPledge), align: 'right' },
  ]

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fundamental Filters</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">Quality Stock Screener</h1>
          <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">
            Find Indian companies that pass all nine growth, return, valuation, leverage, and promoter-pledge checks.
          </p>
        </div>
        <a
          href="https://www.screener.in/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
        >
          Open Screener.in <HiOutlineArrowTopRightOnSquare className="h-4 w-4" />
        </a>
      </header>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <HiOutlineInformationCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Import current fundamentals from Screener.in</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              Create or run a screen on Screener.in with the criteria below, add the required metric columns to its results, then export the results as CSV and upload it here. The CSV stays in this browser; this app does not sign in to or scrape your Screener.in account.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-slate-50 p-3 text-[11px] leading-5 text-slate-700 dark:bg-slate-950 dark:text-slate-300">
              {screenerQuery}
            </code>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-slate-700 dark:bg-emerald-600 dark:hover:bg-emerald-500">
            <HiOutlineArrowUpTray className="h-4 w-4" />
            {isImporting ? 'Reading CSV…' : 'Upload Screener CSV'}
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void handleCsvUpload(event)} />
          </label>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Download CSV template
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div className="flex items-center gap-2">
            <HiOutlineFunnel className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Stocks matching all filters</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {sourceFile ? `${matches.length} matches · ${stocks.length} rows checked` : 'Upload a Screener.in CSV to see matching stocks'}
              </p>
            </div>
          </div>
          {importedAt && <span className="text-[10px] text-slate-400">Data imported {importedAt}</span>}
        </div>

        {matches.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
              <thead className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                <tr>
                  <th className="sticky left-0 z-10 bg-slate-50 px-5 py-3 dark:bg-slate-950">Company</th>
                  {metrics.map((metric) => (
                    <th key={metric.label} className="px-4 py-3 text-right">{metric.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {matches.map((stock) => (
                  <tr key={stock.name} className="transition hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                    <td className="sticky left-0 bg-white px-5 py-3.5 font-semibold text-slate-900 dark:bg-slate-900 dark:text-white">{stock.name}</td>
                    {metrics.map((metric) => (
                      <td key={metric.label} className="whitespace-nowrap px-4 py-3.5 text-right tabular-nums text-slate-600 dark:text-slate-300">
                        {metric.value(stock)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              <HiOutlineFunnel className="h-5 w-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {sourceFile ? 'No stocks passed every filter' : 'No screener data loaded yet'}
            </p>
            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500 dark:text-slate-400">
              {sourceFile
                ? 'Try a fresh export or review the source data. Every rule is applied strictly, including zero promoter pledge.'
                : 'Upload a CSV export with company name and all nine metric columns. Missing or invalid metric rows are excluded.'}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
