import { useEffect, useMemo, useState } from 'react'
import {
  HiOutlineSquares2X2,
  HiOutlineBriefcase,
  HiOutlineArrowsRightLeft,
  HiOutlineChartPie,
  HiOutlineTrophy,
  HiOutlineArrowTrendingUp,
  HiOutlineArrowUpTray,
  HiOutlineCog6Tooth,
  HiOutlinePlus,
  HiOutlineArrowRightOnRectangle,
  HiOutlineShieldCheck,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineBars3,
  HiOutlineXMark,
  HiOutlineChevronRight,
  HiOutlineMagnifyingGlass,
  HiOutlineBanknotes,
  HiOutlineCurrencyRupee,
  HiOutlineCheckCircle,
  HiOutlineSparkles,
  HiOutlineTrash,
  HiOutlineInformationCircle,
  HiOutlineArrowTrendingDown,
  HiOutlineScale,
  HiOutlineClock,
  HiOutlineCamera,
  HiOutlineChartBar,
} from 'react-icons/hi2'
import {
  RiStockLine,
  RiGlobalLine,
  RiFundsLine,
  RiExchangeLine,
  RiCopperCoinLine,
  RiSafe2Line,
  RiWallet3Line,
  RiApps2Line,
  RiPieChart2Line,
  RiBarChartGroupedLine,
} from 'react-icons/ri'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  calculateCategoryBreakdown,
  calculatePortfolioSummary,
  createDefaultTargets,
  defaultCategories,
  getMilestoneStatus,
  getPortfolioState,
  getSamplePortfolioState,
  validateCsvRows,
} from './lib/calculations'
import { formatCompactCurrency, formatCurrency, formatDate, formatPercent } from './lib/format'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { usePortfolio } from './hooks/usePortfolio'
import { StockScannerView } from './components/StockScannerView'
import { MarketIndicesPanel } from './components/MarketIndicesPanel'
import { MarketDataService } from './services/marketDataService'
import type { AssetCategory, Holding, Transaction, TransactionType } from './types/portfolio'
import type { ScannedStock } from './types/scanner'
import type { Session } from '@supabase/supabase-js'

const navigation = [
  'Dashboard',
  'My Holdings',
  'Performance',
  '52W High / Low Scanner',
  'Asset Allocation',
  'Wealth Milestones',
  'Portfolio History',
  'Import Holdings',
  'Settings',
] as const

type NavigationTab = (typeof navigation)[number]

const categoryColors: Record<AssetCategory, string> = {
  'Indian Stocks': '#2563eb',
  'International Stocks': '#8b5cf6',
  'Mutual Funds': '#10b981',
  'ETFs': '#06b6d4',
  'Gold': '#f59e0b',
  'Bonds and Fixed Income': '#6366f1',
  'Cash': '#14b8a6',
  'Other Assets': '#64748b',
}

const categoryIcons: Record<AssetCategory, React.ComponentType<{ className?: string }>> = {
  'Indian Stocks': RiStockLine,
  'International Stocks': RiGlobalLine,
  'Mutual Funds': RiFundsLine,
  'ETFs': RiExchangeLine,
  'Gold': RiCopperCoinLine,
  'Bonds and Fixed Income': RiSafe2Line,
  'Cash': RiWallet3Line,
  'Other Assets': RiApps2Line,
}

function getNavIcon(item: NavigationTab) {
  switch (item) {
    case 'Dashboard':
      return HiOutlineSquares2X2
    case 'My Holdings':
      return HiOutlineBriefcase
    case 'Performance':
      return HiOutlineArrowTrendingUp
    case '52W High / Low Scanner':
      return HiOutlineMagnifyingGlass
    case 'Asset Allocation':
      return HiOutlineChartPie
    case 'Wealth Milestones':
      return HiOutlineTrophy
    case 'Portfolio History':
      return HiOutlineClock
    case 'Import Holdings':
      return HiOutlineArrowUpTray
    case 'Settings':
      return HiOutlineCog6Tooth
  }
}

// Custom Recharts Tooltip styled for both light and dark themes
function CustomTooltip({ active, payload, label, isCurrency = true }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 px-3.5 py-2.5 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      {label && <p className="mb-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>}
      <div className="space-y-1">
        {payload.map((item: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill }} />
            <span className="font-medium text-slate-600 dark:text-slate-300">{item.name}:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {isCurrency && typeof item.value === 'number'
                ? formatCurrency(item.value)
                : typeof item.value === 'number'
                ? `${item.value.toFixed(1)}%`
                : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured)
  const [demoAuthenticated, setDemoAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const isAuthenticated = Boolean(session) || (!isSupabaseConfigured && demoAuthenticated)

  const {
    portfolio,
    setPortfolio,
    loading: portfolioLoading,
    error: portfolioError,
  } = usePortfolio(session?.user.id, session?.user.email ?? '')

  const [page, setPage] = useState<NavigationTab>('Dashboard')
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // 52W High / Low Scanner State
  const [watchlist, setWatchlist] = useState<Set<string>>(() => MarketDataService.getWatchlist())
  const [customUploadedStocks, setCustomUploadedStocks] = useState<ScannedStock[]>([])
  const [scannedStocks, setScannedStocks] = useState<ScannedStock[]>([])

  useEffect(() => {
    let active = true
    MarketDataService.getScannedStocks(customUploadedStocks).then((data) => {
      if (active) setScannedStocks(data)
    })
    return () => {
      active = false
    }
  }, [customUploadedStocks])

  // Filters & search for holdings
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'value' | 'return' | 'name'>('value')

  // CSV Import state
  const [importRows, setImportRows] = useState<Record<string, string | number | undefined>[]>([])
  const [importFileName, setImportFileName] = useState('')
  const [importResult, setImportResult] = useState('')

  // Holding form
  const [holdingForm, setHoldingForm] = useState({
    name: '',
    symbol: '',
    category: 'Indian Stocks' as AssetCategory,
    quantity: '0',
    avgPrice: '0',
    currentPrice: '',
    purchaseDate: '',
    notes: '',
  })

  // Transaction form
  const [transactionForm, setTransactionForm] = useState(() => ({
    assetName: portfolio.holdings[0]?.name ?? '',
    type: 'Buy' as TransactionType,
    date: new Date().toISOString().slice(0, 10),
    quantity: '0',
    unitPrice: '0',
    totalAmount: '0',
    notes: '',
  }))

  // New Milestone form
  const [customMilestoneName, setCustomMilestoneName] = useState('')
  const [customMilestoneTarget, setCustomMilestoneTarget] = useState('')
  const [showAddMilestone, setShowAddMilestone] = useState(false)

  // Computed summary metrics
  const summary = useMemo(
    () => calculatePortfolioSummary(portfolio.holdings, portfolio.transactions),
    [portfolio.holdings, portfolio.transactions],
  )
  const categoryBreakdown = useMemo(
    () => calculateCategoryBreakdown(portfolio.holdings),
    [portfolio.holdings],
  )
  const milestoneStatus = useMemo(
    () => getMilestoneStatus(summary.marketValue, portfolio.milestones),
    [portfolio.milestones, summary.marketValue],
  )

  const allocationSummary = useMemo(() => {
    const total = summary.marketValue
    return (portfolio.allocationTargets.length ? portfolio.allocationTargets : createDefaultTargets()).map(
      (target) => {
        const value = portfolio.holdings
          .filter((holding) => holding.category === target.category)
          .reduce((sum, holding) => sum + holding.quantity * (holding.currentPrice ?? 0), 0)
        const percent = total > 0 ? (value / total) * 100 : 0
        return { ...target, value, percent, diff: percent - target.targetPercentage }
      },
    )
  }, [portfolio.allocationTargets, portfolio.holdings, summary.marketValue])

  // Allocation chart data comparison (Current % vs Target %)
  const allocationComparisonData = useMemo(() => {
    return allocationSummary.map((item) => ({
      category: item.category.length > 12 ? `${item.category.slice(0, 10)}…` : item.category,
      fullCategory: item.category,
      'Current %': Number(item.percent.toFixed(1)),
      'Target %': item.targetPercentage,
      variance: Number(item.diff.toFixed(1)),
    }))
  }, [allocationSummary])

  // Portfolio history for charts
  const portfolioHistory = useMemo(
    () => portfolio.snapshots.map((snapshot) => ({ name: snapshot.date, value: snapshot.totalMarketValue })),
    [portfolio.snapshots],
  )

  // Top holdings by value for quick visual inspection
  const topHoldings = useMemo(() => {
    return [...portfolio.holdings]
      .map((h) => ({
        ...h,
        totalValue: h.quantity * (h.currentPrice ?? h.avgPrice),
        pnl: h.quantity * ((h.currentPrice ?? h.avgPrice) - h.avgPrice),
        returnPct: h.avgPrice > 0 ? (((h.currentPrice ?? h.avgPrice) - h.avgPrice) / h.avgPrice) * 100 : 0,
      }))
      .sort((a, b) => b.totalValue - a.totalValue)
  }, [portfolio.holdings])

  // Filtered & sorted holdings list
  const filteredHoldings = useMemo(() => {
    return topHoldings
      .filter((h) => {
        const matchesSearch =
          h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (h.symbol && h.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
        const matchesCat = filterCategory === 'All' || h.category === filterCategory
        return matchesSearch && matchesCat
      })
      .sort((a, b) => {
        if (sortBy === 'value') return b.totalValue - a.totalValue
        if (sortBy === 'return') return b.returnPct - a.returnPct
        return a.name.localeCompare(b.name)
      })
  }, [topHoldings, searchQuery, filterCategory, sortBy])

  const validationSummary = useMemo(
    () => (importRows.length ? validateCsvRows(importRows) : []),
    [importRows],
  )
  const validImportRows = validationSummary.filter((result) => result.valid).length
  const invalidImportRows = validationSummary.filter((result) => !result.valid).length

  // Theme synchronization (Default is Light Theme)
  const isDarkMode = portfolio.profile?.theme === 'dark'

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  const toggleTheme = (targetTheme?: 'light' | 'dark') => {
    const nextTheme = targetTheme ?? (isDarkMode ? 'light' : 'dark')
    setPortfolio((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        theme: nextTheme,
      },
    }))
  }

  // Supabase Auth listener
  useEffect(() => {
    if (!isSupabaseConfigured) return

    let active = true
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setLoginError(error.message)
        setSession(data.session)
        setAuthReady(true)
      })
      .catch((error: unknown) => {
        if (!active) return
        setLoginError(error instanceof Error ? error.message : 'Could not check your sign-in session.')
        setAuthReady(true)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthReady(true)
      setAuthMessage('')
      setLoginError('')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Sync default transaction asset name
  useEffect(() => {
    if (!portfolio.holdings.length) {
      setTransactionForm((previous) => ({ ...previous, assetName: '' }))
      return
    }

    const hasSelectedAsset = portfolio.holdings.some((holding) => holding.name === transactionForm.assetName)
    if (!hasSelectedAsset) {
      setTransactionForm((previous) => ({ ...previous, assetName: portfolio.holdings[0].name }))
    }
  }, [portfolio.holdings, transactionForm.assetName])

  // Handlers
  const addHolding = () => {
    const quantity = Number(holdingForm.quantity)
    const avgPrice = Number(holdingForm.avgPrice)
    if (!holdingForm.name.trim() || quantity <= 0 || avgPrice < 0) return

    const newHolding: Holding = {
      id: crypto.randomUUID(),
      name: holdingForm.name.trim(),
      symbol: holdingForm.symbol.trim() || undefined,
      category: holdingForm.category,
      quantity,
      avgPrice,
      currentPrice: holdingForm.currentPrice ? Number(holdingForm.currentPrice) : undefined,
      purchaseDate: holdingForm.purchaseDate || undefined,
      notes: holdingForm.notes.trim() || undefined,
      currency: 'INR',
    }

    setPortfolio((previous) => ({ ...previous, holdings: [...previous.holdings, newHolding] }))
    setTransactionForm((previous) => ({ ...previous, assetName: newHolding.name }))
    setSelectedHoldingId(newHolding.id)
    setHoldingForm({
      name: '',
      symbol: '',
      category: 'Indian Stocks',
      quantity: '0',
      avgPrice: '0',
      currentPrice: '',
      purchaseDate: '',
      notes: '',
    })
  }

  const deleteHolding = (id: string) => {
    setPortfolio((prev) => ({
      ...prev,
      holdings: prev.holdings.filter((h) => h.id !== id),
    }))
    if (selectedHoldingId === id) setSelectedHoldingId(null)
  }

  const handleAddTransaction = () => {
    if (!transactionForm.assetName.trim()) return

    const quantity = Number(transactionForm.quantity)
    const unitPrice = Number(transactionForm.unitPrice)
    const calculatedTotal = quantity > 0 && unitPrice > 0 ? quantity * unitPrice : Number(transactionForm.totalAmount)
    const totalAmount = Number.isFinite(calculatedTotal) ? calculatedTotal : 0

    const tx: Transaction = {
      id: crypto.randomUUID(),
      assetName: transactionForm.assetName,
      type: transactionForm.type,
      date: transactionForm.date,
      quantity: quantity > 0 ? quantity : undefined,
      unitPrice: unitPrice > 0 ? unitPrice : undefined,
      totalAmount,
      notes: transactionForm.notes || undefined,
    }

    setPortfolio((previous) => {
      const holdings = [...previous.holdings]
      const match = holdings.find((holding) => holding.name === tx.assetName)
      if (match && (tx.type === 'Buy' || tx.type === 'Sell')) {
        if (tx.type === 'Buy') {
          const existingCost = match.quantity * match.avgPrice
          const newCost = existingCost + (tx.quantity ?? 0) * (tx.unitPrice ?? match.avgPrice)
          const newQuantity = match.quantity + (tx.quantity ?? 0)
          match.avgPrice = newQuantity > 0 ? newCost / newQuantity : match.avgPrice
          match.quantity = newQuantity
          match.currentPrice = tx.unitPrice ?? match.currentPrice
        }

        if (tx.type === 'Sell') {
          match.quantity = Math.max(0, match.quantity - (tx.quantity ?? 0))
        }
      }

      return { ...previous, holdings, transactions: [tx, ...previous.transactions] }
    })

    setTransactionForm((previous) => ({ ...previous, quantity: '0', unitPrice: '0', totalAmount: '0', notes: '' }))
  }

  const applyValidImports = () => {
    const importedHoldings: Holding[] = importRows.flatMap((row, index) => {
      if (!validationSummary[index]?.valid) return []
      const name = String(row.name ?? row.assetName ?? '').trim()
      const categoryName = String(row.category ?? '').trim()
      const category = defaultCategories.find((entry) => entry === categoryName) ?? 'Other Assets'
      const currentPrice =
        row.currentPrice === undefined || row.currentPrice === '' ? undefined : Number(row.currentPrice)

      return [
        {
          id: crypto.randomUUID(),
          name,
          symbol: row.symbol ? String(row.symbol) : undefined,
          category,
          quantity: Number(row.quantity),
          avgPrice: Number(row.avgPrice),
          currentPrice,
          currency: 'INR',
        },
      ]
    })

    if (!importedHoldings.length) return
    setPortfolio((previous) => ({ ...previous, holdings: [...previous.holdings, ...importedHoldings] }))
    setImportResult(`${importedHoldings.length} holding${importedHoldings.length === 1 ? '' : 's'} added to your portfolio.`)
    setImportRows([])
    setImportFileName('')
  }

  const updateTarget = (category: AssetCategory, value: number) => {
    setPortfolio((previous) => ({
      ...previous,
      allocationTargets: previous.allocationTargets.map((entry) =>
        entry.category === category ? { ...entry, targetPercentage: value } : entry,
      ),
    }))
  }

  const addMilestone = () => {
    const nextOrder = portfolio.milestones.length + 1
    const name = customMilestoneName.trim() || `Target Milestone ${nextOrder}`
    const amount = Number(customMilestoneTarget) || 1000000 * nextOrder

    setPortfolio((previous) => ({
      ...previous,
      milestones: [
        ...previous.milestones,
        {
          id: crypto.randomUUID(),
          name,
          targetAmount: amount,
          order: nextOrder,
          active: true,
        },
      ],
    }))
    setCustomMilestoneName('')
    setCustomMilestoneTarget('')
    setShowAddMilestone(false)
  }

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    const buffer = await file.arrayBuffer()
    const workbook = await import('xlsx')
    const ws = workbook.read(buffer, { type: 'array' })
    const sheet = ws.Sheets[ws.SheetNames[0]]
    const rows = workbook.utils.sheet_to_json<Record<string, string | number>>(sheet, {
      defval: '',
      raw: false,
    })
    setImportRows(rows)
  }

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const email = loginForm.email.trim()
    const password = loginForm.password

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLoginError('Please enter a valid email address.')
      return
    }

    if (password.length < 8) {
      setLoginError('Password must be at least 8 characters long.')
      return
    }

    setLoginError('')
    setAuthMessage('')
    setAuthBusy(true)
    try {
      if (!isSupabaseConfigured) {
        setDemoAuthenticated(true)
        return
      }

      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        })
        if (error) throw error
        if (!data.session) {
          setAuthMessage('Account created. Check your email to confirm your address, then sign in.')
          setAuthMode('signin')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Authentication failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  const handleLogout = async () => {
    setLoginForm({ email: '', password: '' })
    setLoginError('')
    setAuthMessage('')
    if (!isSupabaseConfigured) {
      setDemoAuthenticated(false)
      return
    }

    const { error } = await supabase.auth.signOut()
    if (error) setLoginError(error.message)
  }

  const handleExportSnapshot = () => {
    const snapshotDate = new Date().toISOString().slice(0, 10)
    setPortfolio((previous) => ({
      ...previous,
      snapshots: [
        {
          id: previous.snapshots.find((snapshot) => snapshot.date === snapshotDate)?.id ?? crypto.randomUUID(),
          date: snapshotDate,
          totalMarketValue: summary.marketValue,
          investedAmount: summary.totalInvested,
          notes: 'Portfolio snapshot',
        },
        ...previous.snapshots.filter((snapshot) => snapshot.date !== snapshotDate),
      ],
    }))
  }

  const resetDemoData = () => {
    setPortfolio(getPortfolioState())
    setImportRows([])
    setImportFileName('')
    setPage('Dashboard')
  }

  const loadSampleData = () => {
    setPortfolio(getSamplePortfolioState())
    setImportRows([])
    setImportFileName('')
  }

  // Watchlist toggle handler
  const handleToggleWatchlist = (symbol: string) => {
    MarketDataService.toggleWatchlist(symbol)
    setWatchlist(MarketDataService.getWatchlist())
  }

  // Integration between Scanner and Holdings (Avoids duplicate holdings)
  const handleAddStockFromScanner = (stock: ScannedStock) => {
    const existing = portfolio.holdings.find(
      (h) =>
        h.symbol?.toUpperCase() === stock.symbol.toUpperCase() ||
        h.name.toLowerCase() === stock.name.toLowerCase(),
    )

    if (existing) {
      setSelectedHoldingId(existing.id)
      setPage('My Holdings')
      return
    }

    setHoldingForm({
      name: stock.name,
      symbol: stock.symbol,
      category: 'Indian Stocks',
      quantity: '1',
      avgPrice: String(stock.latestPrice),
      currentPrice: String(stock.latestPrice),
      purchaseDate: new Date().toISOString().slice(0, 10),
      notes: `Identified via 52W Scanner (${stock.exchange})`,
    })
    setPage('My Holdings')
  }

  // Render individual pages
  const renderPage = () => {
    switch (page) {
      case 'Dashboard':
        return (
          <div className="space-y-6">
            <MarketIndicesPanel />

            {/* Demo mode alert banner */}
            {!isSupabaseConfigured && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-4 text-xs text-amber-900 shadow-subtle dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                <HiOutlineInformationCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="flex-1">
                  <span className="font-semibold">Local Storage Demo Mode Active.</span> Data is stored securely in this
                  browser session. Add your Supabase credentials in <code className="rounded bg-amber-200/60 px-1 py-0.5 font-mono text-[11px] dark:bg-amber-900/60">.env.local</code> to synchronize across devices.
                </div>
                {portfolio.holdings.length === 0 && (
                  <button
                    type="button"
                    onClick={loadSampleData}
                    className="shrink-0 font-semibold underline hover:text-amber-950 dark:hover:text-white"
                  >
                    Load Sample Data
                  </button>
                )}
              </div>
            )}

            {/* 4 Summary Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Current Market Value"
                value={formatCurrency(summary.marketValue)}
                subtext={`${portfolio.holdings.length} assets tracked`}
                icon={HiOutlineCurrencyRupee}
                accent="emerald"
                trend={`${portfolio.holdings.length > 0 ? '+ Active' : 'Empty'}`}
              />
              <StatCard
                title="Total Invested Capital"
                value={formatCurrency(summary.totalInvested)}
                subtext={`Cost basis across portfolio`}
                icon={HiOutlineBanknotes}
                accent="blue"
              />
              <StatCard
                title="Unrealized Gain / Loss"
                value={formatCurrency(summary.unrealized)}
                subtext={`${summary.unrealized >= 0 ? 'Profit in holdings' : 'Loss in holdings'}`}
                icon={summary.unrealized >= 0 ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown}
                accent={summary.unrealized >= 0 ? 'emerald' : 'rose'}
                pill={summary.totalInvested > 0 ? `${summary.unrealized >= 0 ? '+' : ''}${((summary.unrealized / summary.totalInvested) * 100).toFixed(1)}%` : undefined}
              />
              <StatCard
                title="Overall Return"
                value={formatPercent(summary.overallReturn)}
                subtext={`Net return + realized: ${formatCurrency(summary.realized)}`}
                icon={HiOutlineSparkles}
                accent={summary.overallReturn >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            {/* Empty state prompt if 0 holdings */}
            {portfolio.holdings.length === 0 && (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center shadow-subtle dark:border-slate-800 dark:bg-slate-900/50">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400">
                  <HiOutlineBriefcase className="h-7 w-7" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Your portfolio is empty</h2>
                <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
                  Get started by adding your first investment holding, scanning 52-week breakout stocks, importing a spreadsheet, or exploring with our sample portfolio.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={loadSampleData}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-indigo-600 hover:to-sky-600"
                  >
                    <HiOutlineSparkles className="h-4 w-4" /> Load 10 Sample Holdings &amp; Charts
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage('52W High / Low Scanner')}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    <HiOutlineMagnifyingGlass className="h-4 w-4 text-indigo-500" /> Explore 52W Scanner
                  </button>
                </div>
              </div>
            )}

            {/* Charts Row: Asset Allocation Donut + Allocation Target vs Current Bar Chart */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Asset Allocation Pie Chart */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium lg:col-span-6 xl:col-span-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <RiPieChart2Line className="text-indigo-500 h-5 w-5" /> Asset Allocation
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Distribution across asset classes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage('Asset Allocation')}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    Adjust Targets →
                  </button>
                </div>

                {categoryBreakdown.filter((c) => c.value > 0).length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/30">
                    <HiOutlineChartPie className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                    No holdings categorized yet
                  </div>
                ) : (
                  <div>
                    <div className="h-60 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categoryBreakdown.filter((c) => c.value > 0)}
                            dataKey="value"
                            nameKey="category"
                            innerRadius={55}
                            outerRadius={88}
                            paddingAngle={3}
                            strokeWidth={2}
                            stroke={isDarkMode ? '#0f172a' : '#ffffff'}
                          >
                            {categoryBreakdown
                              .filter((c) => c.value > 0)
                              .map((entry) => (
                                <Cell
                                  key={entry.category}
                                  fill={categoryColors[entry.category] ?? '#64748b'}
                                />
                              ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Breakdown legend pills */}
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      {categoryBreakdown
                        .filter((c) => c.value > 0)
                        .map((entry) => {
                          const Icon = categoryIcons[entry.category] ?? RiApps2Line
                          return (
                            <div
                              key={entry.category}
                              className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-2 dark:border-slate-800/80 dark:bg-slate-800/40"
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <span
                                  className="h-2 w-2 shrink-0 rounded-full"
                                  style={{ backgroundColor: categoryColors[entry.category] }}
                                />
                                <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0 dark:text-slate-400" />
                                <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                  {entry.category}
                                </span>
                              </div>
                              <span className="shrink-0 font-bold text-slate-900 dark:text-white ml-2">
                                {entry.percent.toFixed(1)}%
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}
              </div>

              {/* Allocation Variance Bar Chart */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium lg:col-span-6 xl:col-span-7 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <RiBarChartGroupedLine className="text-emerald-500 h-5 w-5" /> Target vs Actual Comparison
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Current weights against target strategy
                    </p>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Values in %
                  </span>
                </div>

                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={allocationComparisonData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#1e293b' : '#f1f5f9'}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="category"
                        tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis
                        tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                        unit="%"
                      />
                      <Tooltip content={<CustomTooltip isCurrency={false} />} />
                      <Legend
                        verticalAlign="top"
                        align="right"
                        wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                      />
                      <Bar
                        dataKey="Current %"
                        fill="#0ea5e9"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                      <Bar
                        dataKey="Target %"
                        fill="#10b981"
                        radius={[4, 4, 0, 0]}
                        maxBarSize={28}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Portfolio Growth History Chart */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HiOutlineArrowTrendingUp className="text-sky-500 h-5 w-5" /> Portfolio Value Growth
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Historical net worth over snapshot intervals</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleExportSnapshot}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    <HiOutlineCamera className="h-3.5 w-3.5" /> Capture Today&apos;s Snapshot
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage('Portfolio History')}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
                  >
                    View All →
                  </button>
                </div>
              </div>

              {portfolioHistory.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                  <HiOutlineClock className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                  <p className="font-semibold text-slate-700 dark:text-slate-300">No Historical Snapshots Recorded Yet</p>
                  <p className="mt-1 max-w-sm">
                    Click &ldquo;Capture Today&apos;s Snapshot&rdquo; to begin tracking your portfolio valuation curve over time.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportSnapshot}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-600"
                  >
                    Create Baseline Snapshot ({formatCurrency(summary.marketValue)})
                  </button>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={portfolioHistory}
                      margin={{ top: 15, right: 15, left: 10, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={isDarkMode ? '#1e293b' : '#f1f5f9'}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                      />
                      <YAxis
                        tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                        tickFormatter={(v) => formatCompactCurrency(v)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="value"
                        name="Net Worth"
                        stroke="#0ea5e9"
                        strokeWidth={2.5}
                        fill="url(#wealthGradient)"
                        dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 3 }}
                        activeDot={{ r: 6, fill: '#0284c7' }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Bottom Row: Wealth Milestones Highlight + Top Holdings */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Wealth Milestones Widget */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HiOutlineTrophy className="text-amber-500 h-5 w-5" /> Wealth Milestones
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Financial freedom target progression</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage('Wealth Milestones')}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 dark:text-amber-400"
                  >
                    View Goals →
                  </button>
                </div>

                {milestoneStatus.next && (
                  <div className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/70 to-orange-50/40 p-4 dark:border-amber-500/20 dark:from-amber-950/30 dark:to-orange-950/20">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-amber-800 dark:text-amber-300">
                        Targeting: {milestoneStatus.next.name}
                      </span>
                      <span className="font-bold text-amber-900 dark:text-amber-200">
                        {milestoneStatus.progress.toFixed(1)}% Completed
                      </span>
                    </div>
                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-amber-200/50 dark:bg-amber-900/40">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-500"
                        style={{ width: `${Math.min(milestoneStatus.progress, 100)}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-amber-700/90 dark:text-amber-400">
                      <span>Current: {formatCurrency(summary.marketValue)}</span>
                      <span>Remaining: {formatCurrency(milestoneStatus.remaining)}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 space-y-2.5">
                  {portfolio.milestones.slice(0, 4).map((m) => {
                    const achieved = summary.marketValue >= m.targetAmount
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 dark:border-slate-800/80 dark:bg-slate-800/40"
                      >
                        <div className="flex items-center gap-2.5">
                          {achieved ? (
                            <HiOutlineCheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border border-slate-300 dark:border-slate-600 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{m.name}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">{formatCurrency(m.targetAmount)}</p>
                          </div>
                        </div>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            achieved
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {achieved ? 'Achieved' : 'In Progress'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Top Holdings Widget */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <HiOutlineBriefcase className="text-emerald-500 h-5 w-5" /> Top Asset Holdings
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Largest allocations by market value</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPage('My Holdings')}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                  >
                    View All ({portfolio.holdings.length}) →
                  </button>
                </div>

                {topHoldings.length === 0 ? (
                  <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-950/30">
                    No holdings added yet
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {topHoldings.slice(0, 5).map((holding) => {
                      const Icon = categoryIcons[holding.category] ?? RiApps2Line
                      return (
                        <div
                          key={holding.id}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 p-3 transition hover:border-slate-200 dark:border-slate-800/80 dark:bg-slate-800/40 dark:hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-sm shrink-0"
                              style={{ backgroundColor: categoryColors[holding.category] }}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900 dark:text-white">{holding.name}</p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                {holding.symbol ?? holding.category} · {holding.quantity} units
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-900 dark:text-white">
                              {formatCurrency(holding.totalValue)}
                            </p>
                            <p
                              className={`text-[11px] font-semibold ${
                                holding.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                              }`}
                            >
                              {holding.pnl >= 0 ? '+' : ''}
                              {formatCurrency(holding.pnl)} ({holding.returnPct.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      case 'My Holdings':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Portfolio Assets
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  My Holdings ({portfolio.holdings.length})
                </h1>
              </div>
              <button
                type="button"
                onClick={() => {
                  const formEl = document.getElementById('add-holding-form')
                  formEl?.scrollIntoView({ behavior: 'smooth' })
                }}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
              >
                <HiOutlinePlus className="h-4 w-4" /> Add Asset Position
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invested value</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(summary.totalInvested)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Current value</p>
                <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{formatCurrency(summary.marketValue)}</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="relative">
                <HiOutlineMagnifyingGlass className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or ticker…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="All">All Categories ({defaultCategories.length})</option>
                {defaultCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm transition focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
              >
                <option value="value">Sort: Highest Market Value</option>
                <option value="return">Sort: Highest Return %</option>
                <option value="name">Sort: Alphabetical (A-Z)</option>
              </select>
            </div>

            {/* Simple, responsive holdings list */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your investments</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Showing {filteredHoldings.length} of {portfolio.holdings.length} holdings</p>
              </div>

              {filteredHoldings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {portfolio.holdings.length === 0 ? 'No holdings yet. Add your first investment to see it here.' : 'No holdings match your search criteria.'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredHoldings.map((holding) => {
                    const isSelected = selectedHoldingId === holding.id
                    const investedValue = holding.quantity * holding.avgPrice
                    return (
                      <div
                        key={holding.id}
                        onClick={() => setSelectedHoldingId(holding.id)}
                        className={`grid cursor-pointer grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 transition hover:bg-slate-50/80 sm:grid-cols-[minmax(150px,1.4fr)_repeat(4,minmax(100px,1fr))_auto] sm:items-center sm:gap-4 sm:px-5 ${
                          isSelected ? 'bg-emerald-50/40 dark:bg-emerald-950/20' : ''
                        }`}
                      >
                        <div className="col-span-2 min-w-0 sm:col-span-1">
                          <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{holding.name}</div>
                          <div className="mt-0.5 truncate text-[10px] text-slate-400">{holding.symbol ?? holding.category}</div>
                        </div>
                        <HoldingValue label="Avg price" value={formatCurrency(holding.avgPrice)} />
                        <HoldingValue label="Current price" value={holding.currentPrice != null ? formatCurrency(holding.currentPrice) : '—'} />
                        <HoldingValue label="Invested value" value={formatCurrency(investedValue)} />
                        <HoldingValue label="Quantity" value={String(holding.quantity)} />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            deleteHolding(holding.id)
                          }}
                          className="col-span-2 justify-self-end rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 sm:col-span-1"
                          aria-label={`Delete ${holding.name}`}
                          title="Delete holding"
                        >
                          <HiOutlineTrash className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

              {/* Add Holding Form */}
              <div id="add-holding-form">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HiOutlinePlus className="text-emerald-500 h-5 w-5" /> Add New Position
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Track stocks, mutual funds, gold, or fixed deposits
                  </p>

                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Asset Name *</label>
                      <input
                        value={holdingForm.name}
                        onChange={(e) => setHoldingForm({ ...holdingForm, name: e.target.value })}
                        placeholder="e.g. Infosys Ltd or Parag Parikh Flexi Cap"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Ticker Symbol</label>
                        <input
                          value={holdingForm.symbol}
                          onChange={(e) => setHoldingForm({ ...holdingForm, symbol: e.target.value })}
                          placeholder="e.g. INFY.NS"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Category *</label>
                        <select
                          value={holdingForm.category}
                          onChange={(e) => setHoldingForm({ ...holdingForm, category: e.target.value as AssetCategory })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          {defaultCategories.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity *</label>
                        <input
                          type="number"
                          value={holdingForm.quantity}
                          onChange={(e) => setHoldingForm({ ...holdingForm, quantity: e.target.value })}
                          placeholder="0"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Avg Buy Price (₹) *</label>
                        <input
                          type="number"
                          value={holdingForm.avgPrice}
                          onChange={(e) => setHoldingForm({ ...holdingForm, avgPrice: e.target.value })}
                          placeholder="0"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Current Market Price (₹)</label>
                        <input
                          type="number"
                          value={holdingForm.currentPrice}
                          onChange={(e) => setHoldingForm({ ...holdingForm, currentPrice: e.target.value })}
                          placeholder="Optional"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Purchase Date</label>
                        <input
                          type="date"
                          value={holdingForm.purchaseDate}
                          onChange={(e) => setHoldingForm({ ...holdingForm, purchaseDate: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Notes / Strategy</label>
                      <textarea
                        value={holdingForm.notes}
                        onChange={(e) => setHoldingForm({ ...holdingForm, notes: e.target.value })}
                        placeholder="Investment thesis, target sell price, etc."
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addHolding}
                      className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 hover:shadow-md"
                    >
                      Save Position to Portfolio
                    </button>
                  </div>
                </div>
              </div>
          </div>
        )

      case 'Performance':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Analytics &amp; Ledger
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Portfolio Performance &amp; Ledger
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                  Realized Return: {formatCurrency(summary.realized)}
                </span>
              </div>
            </div>

            {/* Performance KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Market Value"
                value={formatCurrency(summary.marketValue)}
                subtext="Current active valuation"
                icon={HiOutlineCurrencyRupee}
                accent="emerald"
              />
              <StatCard
                title="Total Capital Deployed"
                value={formatCurrency(summary.totalInvested)}
                subtext="Net cumulative investment"
                icon={HiOutlineBanknotes}
                accent="blue"
              />
              <StatCard
                title="Unrealized Capital P&amp;L"
                value={formatCurrency(summary.unrealized)}
                subtext="Paper gain across open holdings"
                icon={summary.unrealized >= 0 ? HiOutlineArrowTrendingUp : HiOutlineArrowTrendingDown}
                accent={summary.unrealized >= 0 ? 'emerald' : 'rose'}
                pill={summary.totalInvested > 0 ? `${summary.unrealized >= 0 ? '+' : ''}${((summary.unrealized / summary.totalInvested) * 100).toFixed(1)}%` : undefined}
              />
              <StatCard
                title="Overall Portfolio ROI"
                value={formatPercent(summary.overallReturn)}
                subtext={`Includes realized dividends & sales`}
                icon={HiOutlineChartBar}
                accent={summary.overallReturn >= 0 ? 'emerald' : 'rose'}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-12">
              {/* Record Transaction Form */}
              <div className="lg:col-span-4">
                <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <HiOutlineArrowsRightLeft className="text-indigo-500 h-5 w-5" /> Record Transaction
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    Log buys, sells, dividend credits, or capital additions
                  </p>

                  <div className="mt-4 space-y-3 text-xs">
                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Asset *</label>
                      <select
                        value={transactionForm.assetName}
                        onChange={(e) => setTransactionForm({ ...transactionForm, assetName: e.target.value })}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      >
                        {portfolio.holdings.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Type *</label>
                        <select
                          value={transactionForm.type}
                          onChange={(e) => setTransactionForm({ ...transactionForm, type: e.target.value as TransactionType })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        >
                          {['Buy', 'Sell', 'Dividend', 'Deposit', 'Withdrawal', 'Fee', 'Tax', 'Other'].map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Date *</label>
                        <input
                          type="date"
                          value={transactionForm.date}
                          onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Quantity</label>
                        <input
                          type="number"
                          value={transactionForm.quantity}
                          onChange={(e) => {
                            const q = Number(e.target.value) || 0
                            const u = Number(transactionForm.unitPrice) || 0
                            setTransactionForm({
                              ...transactionForm,
                              quantity: e.target.value,
                              totalAmount: q > 0 && u > 0 ? String(q * u) : transactionForm.totalAmount,
                            })
                          }}
                          placeholder="0"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-700 dark:text-slate-300">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={transactionForm.unitPrice}
                          onChange={(e) => {
                            const u = Number(e.target.value) || 0
                            const q = Number(transactionForm.quantity) || 0
                            setTransactionForm({
                              ...transactionForm,
                              unitPrice: e.target.value,
                              totalAmount: q > 0 && u > 0 ? String(q * u) : transactionForm.totalAmount,
                            })
                          }}
                          placeholder="0"
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Total Amount (₹) *</label>
                      <input
                        type="number"
                        value={transactionForm.totalAmount}
                        onChange={(e) => setTransactionForm({ ...transactionForm, totalAmount: e.target.value })}
                        placeholder="0"
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="font-semibold text-slate-700 dark:text-slate-300">Notes</label>
                      <textarea
                        value={transactionForm.notes}
                        onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                        placeholder="Broker order ID, remarks, etc."
                        rows={2}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleAddTransaction}
                      className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                    >
                      Record in Ledger
                    </button>
                  </div>
                </div>
              </div>

              {/* Transaction History Table */}
              <div className="lg:col-span-8">
                <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
                  <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Transaction History</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {portfolio.transactions.length} recorded events
                    </p>
                  </div>

                  {portfolio.transactions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No transactions recorded yet. Use the form to record your first trade.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
                        <thead className="bg-slate-50/70 text-slate-500 dark:bg-slate-950/40 dark:text-slate-400 font-semibold">
                          <tr>
                            <th className="py-3 pl-5 pr-3">Date</th>
                            <th className="px-3 py-3">Type</th>
                            <th className="px-3 py-3">Asset</th>
                            <th className="px-3 py-3 text-right">Units</th>
                            <th className="px-3 py-3 text-right">Unit Price</th>
                            <th className="px-3 py-3 text-right">Total (₹)</th>
                            <th className="py-3 pl-3 pr-5">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {portfolio.transactions.map((tx) => (
                            <tr key={tx.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                              <td className="py-3 pl-5 pr-3 font-medium text-slate-600 dark:text-slate-400">
                                {formatDate(tx.date)}
                              </td>
                              <td className="px-3 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    tx.type === 'Buy'
                                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                                      : tx.type === 'Sell'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                                      : tx.type === 'Dividend'
                                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {tx.type}
                                </span>
                              </td>
                              <td className="px-3 py-3 font-bold text-slate-900 dark:text-white">{tx.assetName}</td>
                              <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">{tx.quantity ?? '—'}</td>
                              <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                                {tx.unitPrice ? formatCurrency(tx.unitPrice) : '—'}
                              </td>
                              <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white">
                                {formatCurrency(tx.totalAmount)}
                              </td>
                              <td className="py-3 pl-3 pr-5 text-slate-400 text-[11px] truncate max-w-xs">
                                {tx.notes ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )

      case '52W High / Low Scanner':
        return (
          <StockScannerView
            stocks={scannedStocks}
            holdings={portfolio.holdings}
            watchlist={watchlist}
            onToggleWatchlist={handleToggleWatchlist}
            onAddStockToHoldings={handleAddStockFromScanner}
            onCustomStockUploaded={(uploaded) => {
              setCustomUploadedStocks((prev) => [uploaded, ...prev])
            }}
          />
        )

      case 'Asset Allocation':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Strategic Planning
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Asset Allocation Strategy &amp; Rebalancing
                </h1>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs shadow-subtle dark:border-slate-800 dark:bg-slate-900">
                <HiOutlineScale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-slate-500 dark:text-slate-400">Total Target Sum:</span>
                <span
                  className={`font-bold ${
                    portfolio.allocationTargets.reduce((sum, t) => sum + t.targetPercentage, 0) === 100
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {portfolio.allocationTargets.reduce((sum, t) => sum + t.targetPercentage, 0)}%
                </span>
              </div>
            </div>

            {/* Visual Rebalancing Bar Chart */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Portfolio Allocation Variance
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare actual allocation percentage vs target allocation percentage per asset category
              </p>

              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={allocationComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis
                      dataKey="category"
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 10 }}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} unit="%" />
                    <Tooltip content={<CustomTooltip isCurrency={false} />} />
                    <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11, paddingBottom: 10 }} />
                    <Bar dataKey="Current %" fill="#0ea5e9" radius={[4, 4, 0, 0]} maxBarSize={30} />
                    <Bar dataKey="Target %" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Interactive Target Adjuster Sliders */}
            <div className="grid gap-4 md:grid-cols-2">
              {allocationSummary.map((entry) => {
                const Icon = categoryIcons[entry.category] ?? RiApps2Line
                const isOver = entry.diff > 3
                const isUnder = entry.diff < -3

                return (
                  <div
                    key={entry.category}
                    className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-subtle transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: categoryColors[entry.category] }}
                        />
                        <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{entry.category}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          isOver
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            : isUnder
                            ? 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                      >
                        {isOver ? `Overweight (+${entry.diff.toFixed(1)}%)` : isUnder ? `Underweight (${entry.diff.toFixed(1)}%)` : 'Balanced'}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                      <span>
                        Current: <strong>{entry.percent.toFixed(1)}%</strong> ({formatCurrency(entry.value)})
                      </span>
                      <span>
                        Target: <strong>{entry.targetPercentage}%</strong> ({formatCurrency((summary.marketValue * entry.targetPercentage) / 100)})
                      </span>
                    </div>

                    <div className="mt-2.5">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={entry.targetPercentage}
                        onChange={(e) => updateTarget(entry.category, Number(e.target.value))}
                        className="w-full h-2 rounded-lg bg-slate-200 appearance-none cursor-pointer accent-emerald-600 dark:bg-slate-700"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'Wealth Milestones':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Goal Roadmap
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Wealth Milestones &amp; Financial Freedom Targets
                </h1>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMilestone(!showAddMilestone)}
                className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              >
                <HiOutlinePlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                {showAddMilestone ? 'Close Form' : 'Add Custom Goal'}
              </button>
            </div>

            {/* Add Custom Milestone Form */}
            {showAddMilestone && (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm dark:border-emerald-500/20 dark:bg-emerald-950/20">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Define Custom Milestone Target</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="Milestone Name (e.g. ₹2 Crore Club)"
                    value={customMilestoneName}
                    onChange={(e) => setCustomMilestoneName(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <input
                    type="number"
                    placeholder="Target Amount in ₹ (e.g. 20000000)"
                    value={customMilestoneTarget}
                    onChange={(e) => setCustomMilestoneTarget(e.target.value)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={addMilestone}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500"
                  >
                    Save Custom Milestone
                  </button>
                </div>
              </div>
            )}

            {/* Current Net Worth Banner */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Current Net Worth Level</p>
                  <p className="mt-1 text-3xl font-extrabold text-slate-900 dark:text-white">
                    {formatCurrency(summary.marketValue)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Highest Achieved Goal</p>
                  <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {milestoneStatus.current?.name ?? 'Working towards first milestone'}
                  </p>
                </div>
              </div>
            </div>

            {/* Milestones Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {portfolio.milestones.map((milestone) => {
                const reached = summary.marketValue >= milestone.targetAmount
                const progress = Math.min((summary.marketValue / milestone.targetAmount) * 100, 100)

                return (
                  <div
                    key={milestone.id}
                    className={`rounded-3xl border p-5 shadow-subtle transition ${
                      reached
                        ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                        : 'border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {reached ? (
                          <HiOutlineCheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <HiOutlineTrophy className="h-5 w-5 text-amber-500" />
                        )}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{milestone.name}</h3>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          reached
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {reached ? 'Achieved' : `${progress.toFixed(0)}%`}
                      </span>
                    </div>

                    <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                      Target Amount: <strong className="text-slate-900 dark:text-white">{formatCurrency(milestone.targetAmount)}</strong>
                    </p>

                    <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          reached ? 'bg-emerald-500' : 'bg-gradient-to-r from-amber-500 to-emerald-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{reached ? 'Completed' : `${formatPercent(progress)} attained`}</span>
                      <span>
                        {reached
                          ? 'Unlocked'
                          : `${formatCurrency(Math.max(milestone.targetAmount - summary.marketValue, 0))} to go`}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )

      case 'Portfolio History':
        return (
          <div className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Net Worth Timeline
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                  Historical Valuation Records
                </h1>
              </div>
              <button
                type="button"
                onClick={handleExportSnapshot}
                className="inline-flex items-center gap-2 self-start rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-500"
              >
                <HiOutlineCamera className="h-4 w-4" /> Save New Snapshot
              </button>
            </div>

            {/* History Line Chart */}
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Valuation Progression</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tracking market value over time</p>

              <div className="mt-4 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={portfolioHistory} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#1e293b' : '#f1f5f9'} vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }} />
                    <YAxis
                      tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 11 }}
                      tickFormatter={(v) => formatCompactCurrency(v)}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Market Value"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: '#8b5cf6', r: 4 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Snapshots Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Snapshot Log</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">{portfolio.snapshots.length} snapshots recorded</p>
              </div>

              {portfolio.snapshots.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No snapshots taken yet. Click &ldquo;Save New Snapshot&rdquo; to record today&apos;s portfolio balance.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
                    <thead className="bg-slate-50/70 text-slate-500 dark:bg-slate-950/40 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="py-3 pl-5 pr-3">Snapshot Date</th>
                        <th className="px-3 py-3 text-right">Total Market Value</th>
                        <th className="px-3 py-3 text-right">Total Invested</th>
                        <th className="py-3 pl-3 pr-5">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {portfolio.snapshots.map((snap) => (
                        <tr key={snap.id} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                          <td className="py-3 pl-5 pr-3 font-medium text-slate-900 dark:text-white">
                            {formatDate(snap.date)}
                          </td>
                          <td className="px-3 py-3 text-right font-bold text-slate-900 dark:text-white">
                            {formatCurrency(snap.totalMarketValue)}
                          </td>
                          <td className="px-3 py-3 text-right text-slate-600 dark:text-slate-300">
                            {snap.investedAmount ? formatCurrency(snap.investedAmount) : '—'}
                          </td>
                          <td className="py-3 pl-3 pr-5 text-slate-400">{snap.notes ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )

      case 'Import Holdings':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Bulk Ingestion
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Import Holdings from CSV / Excel
              </h1>
            </div>

            {/* Dropzone */}
            <div className="rounded-3xl border-2 border-dashed border-slate-300 bg-white/80 p-8 text-center shadow-subtle dark:border-slate-700 dark:bg-slate-900/50">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
                  <HiOutlineArrowUpTray className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">Choose a CSV or Excel Spreadsheet</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Supports columns: <code className="font-mono">name, symbol, category, quantity, avgPrice, currentPrice</code>
                  </p>
                </div>
                <input type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={handleImportFile} />
              </label>
            </div>

            {importFileName && (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Loaded file: <span className="font-mono text-emerald-600 dark:text-emerald-400">{importFileName}</span>
              </div>
            )}

            {importResult && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                {importResult}
              </div>
            )}

            {/* Validation & Preview */}
            {importRows.length > 0 && (
              <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">Data Validation Preview</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {validImportRows} valid rows ready · {invalidImportRows} with errors
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={applyValidImports}
                    disabled={validImportRows === 0}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
                  >
                    Import {validImportRows} Valid Holding{validImportRows === 1 ? '' : 's'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-100 text-left text-xs dark:divide-slate-800">
                    <thead className="bg-slate-50/70 text-slate-500 dark:bg-slate-950/40 dark:text-slate-400 font-semibold">
                      <tr>
                        <th className="py-3 pl-5 pr-3">Row</th>
                        {Object.keys(importRows[0] ?? {}).map((header) => (
                          <th key={header} className="px-3 py-3">
                            {header}
                          </th>
                        ))}
                        <th className="py-3 pl-3 pr-5">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {importRows.slice(0, 10).map((row, index) => {
                        const result = validationSummary[index]
                        return (
                          <tr key={index} className="transition hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                            <td className="py-3 pl-5 pr-3 text-slate-400">{index + 1}</td>
                            {Object.keys(row).map((key) => (
                              <td key={key} className="px-3 py-3 text-slate-800 dark:text-slate-200">
                                {String(row[key] ?? '')}
                              </td>
                            ))}
                            <td className="py-3 pl-3 pr-5">
                              {result?.valid ? (
                                <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                                  <HiOutlineCheckCircle className="h-4 w-4" /> Ready
                                </span>
                              ) : (
                                <span className="text-rose-600 dark:text-rose-400 font-medium">
                                  {result?.errors.join(', ')}
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )

      case 'Settings':
        return (
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                System Preferences
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                Account &amp; Tracker Settings
              </h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Profile Card */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile Configuration</h2>
                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Display Name</label>
                    <input
                      aria-label="Display name"
                      value={portfolio.profile.displayName}
                      onChange={(e) =>
                        setPortfolio((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, displayName: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Reporting Currency</label>
                    <input
                      aria-label="Currency"
                      value={portfolio.profile.currency}
                      onChange={(e) =>
                        setPortfolio((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, currency: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 dark:text-slate-300">Timezone</label>
                    <input
                      aria-label="Timezone"
                      value={portfolio.profile.timezone}
                      onChange={(e) =>
                        setPortfolio((prev) => ({
                          ...prev,
                          profile: { ...prev.profile, timezone: e.target.value },
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Theme Preference */}
              <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium dark:border-slate-800 dark:bg-slate-900">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Theme &amp; Aesthetics</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Select your preferred dashboard lighting. Light Theme is active by default.
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => toggleTheme('light')}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-xs font-bold transition ${
                      !isDarkMode
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20 dark:border-emerald-500'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <HiOutlineSun className="h-6 w-6 text-amber-500" />
                    <span>Light Theme (Default)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleTheme('dark')}
                    className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-xs font-bold transition ${
                      isDarkMode
                        ? 'border-emerald-500 bg-slate-900 text-white ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    <HiOutlineMoon className="h-6 w-6 text-indigo-400" />
                    <span>Dark Theme</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
    }
  }

  // Authentication & session loaders
  if (!authReady || (isAuthenticated && portfolioLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-semibold text-slate-600 dark:bg-slate-950 dark:text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p>{isAuthenticated ? 'Synchronizing your private wealth portfolio…' : 'Initializing security context…'}</p>
        </div>
      </div>
    )
  }

  // Unauthenticated Login / Sign-up Screen
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 dark:bg-slate-950">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-500 text-white shadow-md">
              <HiOutlineChartPie className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-extrabold text-slate-900 dark:text-white">WealthScope</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Personal Portfolio Management
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {authMode === 'signin' ? 'Sign in to WealthScope' : 'Create an Account'}
            </h1>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {authMode === 'signin'
                ? 'Enter your credentials to access your private ledger'
                : 'Get started tracking your assets, allocations, and net worth'}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            <div>
              <label htmlFor="email" className="font-semibold text-slate-700 dark:text-slate-300">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="investor@domain.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="font-semibold text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                minLength={8}
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="••••••••••••"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 shadow-sm focus:border-emerald-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>

            {loginError && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300">
                {loginError}
              </div>
            )}
            {authMessage && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-300">
                {authMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={authBusy}
              className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {authBusy ? 'Authenticating…' : authMode === 'signin' ? 'Sign In to Dashboard' : 'Create Free Account'}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setAuthMode((m) => (m === 'signin' ? 'signup' : 'signin'))
              setLoginError('')
              setAuthMessage('')
            }}
            className="mt-5 w-full text-center text-xs font-semibold text-sky-600 hover:text-sky-700 dark:text-sky-400"
          >
            {authMode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>

          {!isSupabaseConfigured && (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/80 p-3 text-[11px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-300">
              ⚡ Local Demo Mode: Enter any email to explore the interactive dashboard immediately.
            </div>
          )}
        </div>
      </div>
    )
  }

  // Authenticated Layout
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-[1600px]">
        {/* Desktop Left Sidebar (>= 1024px) */}
        <aside className="hidden min-h-screen w-72 shrink-0 border-r border-slate-200/80 bg-white p-5 lg:flex lg:flex-col lg:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div>
            {/* Logo */}
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-sky-500 text-white shadow-md">
                <HiOutlineChartPie className="h-5 w-5" />
              </div>
              <div>
                <div className="text-base font-extrabold text-slate-900 dark:text-white">WealthScope</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Portfolio Suite
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = getNavIcon(item)
                const isActive = page === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/10 dark:ring-emerald-500/20'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`} />
                      <span>{item}</span>
                    </div>
                    {isActive && <HiOutlineChevronRight className="h-3.5 w-3.5 text-emerald-500" />}
                  </button>
                )
              })}
            </nav>
          </div>

          {/* Sidebar Footer */}
          <div className="space-y-3 pt-6">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
                <HiOutlineShieldCheck className="h-4 w-4 text-emerald-500" />
                <span>{isSupabaseConfigured ? 'Cloud Sync Active' : 'Private Local Storage'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                {isSupabaseConfigured
                  ? 'Authenticated via Supabase'
                  : 'Data stored locally in browser'}
              </p>
            </div>

            {!isSupabaseConfigured && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={loadSampleData}
                  className="rounded-xl border border-indigo-200 bg-indigo-50/60 px-2 py-1.5 text-[11px] font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-950/40 dark:text-indigo-300"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={resetDemoData}
                  className="rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Reset Data
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-slate-800 dark:bg-slate-900 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Sign Out
            </button>
          </div>
        </aside>

        {/* Mobile Slide-over Drawer (< 1024px) */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative flex w-72 flex-col justify-between bg-white p-5 shadow-2xl dark:bg-slate-900">
              <div>
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white">
                      <HiOutlineChartPie className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">WealthScope</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <HiOutlineXMark className="h-5 w-5" />
                  </button>
                </div>

                <nav className="space-y-1">
                  {navigation.map((item) => {
                    const Icon = getNavIcon(item)
                    const isActive = page === item
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => {
                          setPage(item)
                          setMobileMenuOpen(false)
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item}</span>
                      </button>
                    )
                  })}
                </nav>
              </div>

              <div className="space-y-2 pt-6">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-rose-600 dark:border-slate-800 dark:bg-slate-800 dark:text-rose-400"
                >
                  <HiOutlineArrowRightOnRectangle className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <main className="min-h-screen flex-1 p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">
          <header className="mb-6 flex items-center justify-between gap-4 rounded-3xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-premium sm:px-5 dark:border-slate-800 dark:bg-slate-900">
            <div aria-hidden="true" className="h-9 flex-1" />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => toggleTheme()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
                aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
              >
                {isDarkMode ? <HiOutlineSun className="h-4 w-4 text-amber-500" /> : <HiOutlineMoon className="h-4 w-4 text-indigo-500" />}
              </button>
              <button
                type="button"
                onClick={() => setPage('Settings')}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm transition ${
                  page === 'Settings'
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
                aria-label="Settings"
                title="Settings"
              >
                <HiOutlineCog6Tooth className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Error Banner */}
          {portfolioError && (
            <div role="alert" className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300">
              Could not sync portfolio data: {portfolioError}
            </div>
          )}

          {/* Active View */}
          {renderPage()}
        </main>
      </div>

      {/* Mobile Floating Bottom Bar for high ergonomics (< 1024px) */}
      <div className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-2 backdrop-blur-md lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        <div className="flex items-center justify-around">
          {[
            { name: 'Dashboard', icon: HiOutlineSquares2X2 },
            { name: 'My Holdings', icon: HiOutlineBriefcase },
            { name: 'Performance', icon: HiOutlineArrowTrendingUp },
            { name: '52W High / Low Scanner', icon: HiOutlineMagnifyingGlass },
          ].map((item) => {
            const Icon = item.icon
            const isActive = page === item.name
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => setPage(item.name as NavigationTab)}
                className={`flex flex-col items-center gap-1 py-1 text-[10px] font-semibold ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.name === '52W High / Low Scanner' ? '52W Scanner' : item.name}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-1 py-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            <HiOutlineBars3 className="h-5 w-5" />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function HoldingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] text-slate-500 dark:text-slate-400 sm:hidden">{label}</div>
      <div className="truncate text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-200 sm:text-right">{value}</div>
      <div className="hidden text-[10px] text-slate-500 dark:text-slate-400 sm:block sm:text-right">{label}</div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  accent,
  trend,
  pill,
}: {
  title: string
  value: string
  subtext?: string
  icon: React.ComponentType<{ className?: string }>
  accent: 'emerald' | 'blue' | 'rose'
  trend?: string
  pill?: string
}) {
  const accentClasses = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/40',
    blue: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/50 dark:text-sky-400 dark:border-sky-800/40',
    rose: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/40',
  }

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-premium transition hover:-translate-y-0.5 hover:shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${accentClasses[accent]}`}>
          <Icon className="h-5 w-5" />
        </div>
        {pill && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              accent === 'rose'
                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
            }`}
          >
            {pill}
          </span>
        )}
        {trend && !pill && (
          <span className="text-[10px] font-semibold text-slate-400">{trend}</span>
        )}
      </div>

      <div className="mt-4">
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {value}
        </p>
        {subtext && <p className="mt-1 text-[11px] text-slate-400">{subtext}</p>}
      </div>
    </div>
  )
}

export default App
