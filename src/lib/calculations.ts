import type { AllocationTarget, AssetCategory, Holding, Milestone, PortfolioState, Transaction } from '../types/portfolio'

export const defaultCategories: AssetCategory[] = [
  'Indian Stocks',
  'International Stocks',
  'Mutual Funds',
  'ETFs',
  'Gold',
  'Bonds and Fixed Income',
  'Cash',
  'Other Assets',
]

export function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/[^0-9.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function calculateHoldingMarketValue(holding: Holding): number {
  if (holding.currentPrice == null || holding.currentPrice === undefined) return 0
  return holding.quantity * holding.currentPrice
}

export function calculatePortfolioSummary(holdings: Holding[], transactions: Transaction[] = []) {
  const totalInvested = holdings.reduce((sum, holding) => sum + holding.quantity * holding.avgPrice, 0)
  const marketValue = holdings.reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0)
  const unknownPriceCount = holdings.filter((holding) => holding.currentPrice == null).length

  const realized = transactions.reduce((sum, tx) => {
    if (tx.type === 'Sell') return sum + (tx.totalAmount ?? 0)
    if (tx.type === 'Dividend') return sum + (tx.totalAmount ?? 0)
    return sum
  }, 0) - transactions.reduce((sum, tx) => {
    if (tx.type === 'Buy') return sum + (tx.totalAmount ?? 0)
    return sum
  }, 0)

  const unrealized = marketValue - totalInvested
  const totalReturn = marketValue + realized - totalInvested
  const overallReturn = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  return {
    marketValue,
    totalInvested,
    unrealized,
    realized,
    totalReturn,
    overallReturn,
    unknownPriceCount,
    knownValueCount: holdings.length - unknownPriceCount,
  }
}

export function calculateCategoryBreakdown(holdings: Holding[], categories: AssetCategory[] = defaultCategories) {
  const total = holdings.reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0)
  return categories.map((category) => {
    const categoryValue = holdings
      .filter((holding) => holding.category === category)
      .reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0)
    return {
      category,
      value: categoryValue,
      percent: total > 0 ? (categoryValue / total) * 100 : 0,
    }
  })
}

export function getMilestoneStatus(portfolioValue: number, milestones: Milestone[]) {
  const completed = [] as Milestone[]
  const active = milestones.filter((milestone) => milestone.active)
  for (const milestone of active) {
    if (portfolioValue >= milestone.targetAmount) completed.push(milestone)
  }

  const next = active.find((milestone) => portfolioValue < milestone.targetAmount) ?? active[active.length - 1]
  const current = completed[completed.length - 1] ?? null
  const remaining = next ? Math.max(next.targetAmount - portfolioValue, 0) : 0
  const progress = next ? (portfolioValue / next.targetAmount) * 100 : 100

  return { current, next, remaining, progress, completed }
}

export function validateCsvRows(rows: Record<string, string | number | undefined>[]) {
  return rows.map((row, index) => {
    const errors: string[] = []
    const name = String(row.name ?? row.assetName ?? '').trim()
    const quantity = row.quantity == null || row.quantity === '' ? NaN : Number(row.quantity)
    const avgPrice = row.avgPrice == null || row.avgPrice === '' ? NaN : Number(row.avgPrice)
    const currentPrice = row.currentPrice == null || row.currentPrice === '' ? NaN : Number(row.currentPrice)

    if (!name) errors.push('Missing asset name')
    if (!Number.isFinite(quantity) || quantity <= 0) errors.push('Invalid quantity')
    if (!Number.isFinite(avgPrice) || avgPrice < 0) errors.push('Invalid average purchase price')
    if (row.currentPrice !== undefined && row.currentPrice !== '' && (!Number.isFinite(currentPrice) || currentPrice < 0)) {
      errors.push('Invalid current price')
    }

    return { rowIndex: index + 1, valid: errors.length === 0, errors }
  })
}

export function createDefaultMilestones(): Milestone[] {
  return [
    { id: crypto.randomUUID(), name: '₹1 Lakh', targetAmount: 100000, order: 1, active: true },
    { id: crypto.randomUUID(), name: '₹5 Lakh', targetAmount: 500000, order: 2, active: true },
    { id: crypto.randomUUID(), name: '₹10 Lakh', targetAmount: 1000000, order: 3, active: true },
    { id: crypto.randomUUID(), name: '₹25 Lakh', targetAmount: 2500000, order: 4, active: true },
    { id: crypto.randomUUID(), name: '₹50 Lakh', targetAmount: 5000000, order: 5, active: true },
    { id: crypto.randomUUID(), name: '₹1 Crore', targetAmount: 10000000, order: 6, active: true },
  ]
}

export function createDefaultTargets(): AllocationTarget[] {
  return [
    { category: 'Indian Stocks', targetPercentage: 45 },
    { category: 'International Stocks', targetPercentage: 10 },
    { category: 'Mutual Funds', targetPercentage: 20 },
    { category: 'ETFs', targetPercentage: 10 },
    { category: 'Gold', targetPercentage: 7 },
    { category: 'Bonds and Fixed Income', targetPercentage: 5 },
    { category: 'Cash', targetPercentage: 2 },
    { category: 'Other Assets', targetPercentage: 1 },
  ]
}

export function getCurrentAllocation(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0)
  return defaultCategories.map((category) => {
    const categoryValue = holdings
      .filter((holding) => holding.category === category)
      .reduce((sum, holding) => sum + calculateHoldingMarketValue(holding), 0)

    return {
      category,
      value: categoryValue,
      target: 0,
      percent: totalValue > 0 ? (categoryValue / totalValue) * 100 : 0,
    }
  })
}

export function getPortfolioState(): PortfolioState {
  return {
    holdings: [],
    transactions: [],
    snapshots: [],
    milestones: createDefaultMilestones(),
    allocationTargets: createDefaultTargets(),
    profile: {
      displayName: 'Your Portfolio',
      timezone: 'Asia/Kolkata',
      currency: 'INR',
      theme: 'light',
    },
  }
}

export function getSamplePortfolioState(): PortfolioState {
  const base = getPortfolioState()
  const today = new Date().toISOString().slice(0, 10)
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const d60 = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
  const d90 = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10)

  base.holdings = [
    {
      id: crypto.randomUUID(),
      name: 'Reliance Industries Ltd',
      symbol: 'RELIANCE',
      category: 'Indian Stocks',
      quantity: 100,
      avgPrice: 1120.0,
      currentPrice: 1170.3,
      purchaseDate: d90,
      notes: 'Energy & Retail conglomerate',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Tata Consultancy Services',
      symbol: 'TCS',
      category: 'Indian Stocks',
      quantity: 50,
      avgPrice: 2050.0,
      currentPrice: 2156.0,
      purchaseDate: d90,
      notes: 'Global IT leader',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'HDFC Bank Ltd',
      symbol: 'HDFCBANK',
      category: 'Indian Stocks',
      quantity: 120,
      avgPrice: 675.0,
      currentPrice: 707.25,
      purchaseDate: d60,
      notes: 'Private banking stalwart',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Infosys Limited',
      symbol: 'INFY',
      category: 'Indian Stocks',
      quantity: 80,
      avgPrice: 980.0,
      currentPrice: 1023.4,
      purchaseDate: d90,
      notes: 'Digital services & consulting',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Central Depository Services Ltd',
      symbol: 'CDSL',
      category: 'Indian Stocks',
      quantity: 40,
      avgPrice: 1550.0,
      currentPrice: 1650.0,
      purchaseDate: d60,
      notes: 'Depository market infrastructure (Near 52W High)',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Multi Commodity Exchange of India',
      symbol: 'MCX',
      category: 'Indian Stocks',
      quantity: 25,
      avgPrice: 3250.0,
      currentPrice: 3425.0,
      purchaseDate: d30,
      notes: 'Commodity exchange leader (Near 52W High)',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Mirae Asset Large Cap Fund',
      symbol: 'MIRAE-LC',
      category: 'Mutual Funds',
      quantity: 1200,
      avgPrice: 92,
      currentPrice: 108,
      purchaseDate: d90,
      notes: 'Monthly SIP',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Parag Parikh Flexi Cap Fund',
      symbol: 'PPFAS-FC',
      category: 'Mutual Funds',
      quantity: 850,
      avgPrice: 65,
      currentPrice: 78,
      purchaseDate: d90,
      notes: 'Diversified flexi cap fund',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Nippon India Nifty 50 ETF',
      symbol: 'NIFTYBEES.NS',
      category: 'ETFs',
      quantity: 450,
      avgPrice: 235,
      currentPrice: 262,
      purchaseDate: d60,
      notes: 'Index passive allocation',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Sovereign Gold Bonds / Gold ETF',
      symbol: 'GOLDBEES.NS',
      category: 'Gold',
      quantity: 120,
      avgPrice: 5800,
      currentPrice: 7100,
      purchaseDate: d90,
      notes: 'Gold hedge',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'Bharat Bond ETF 2030',
      symbol: 'BBOND2030',
      category: 'Bonds and Fixed Income',
      quantity: 100,
      avgPrice: 1100,
      currentPrice: 1180,
      purchaseDate: d60,
      notes: 'Fixed income yields',
      currency: 'INR',
    },
    {
      id: crypto.randomUUID(),
      name: 'High Yield Savings & Liquid Cash',
      symbol: 'CASH',
      category: 'Cash',
      quantity: 95000,
      avgPrice: 1,
      currentPrice: 1,
      purchaseDate: d30,
      notes: 'Emergency liquidity pool',
      currency: 'INR',
    },
  ]

  base.transactions = [
    {
      id: crypto.randomUUID(),
      assetName: 'Reliance Industries Ltd',
      date: d90,
      type: 'Buy',
      quantity: 100,
      unitPrice: 1120,
      totalAmount: 112000,
      notes: 'Initial equity allocation',
    },
    {
      id: crypto.randomUUID(),
      assetName: 'Tata Consultancy Services',
      date: d90,
      type: 'Buy',
      quantity: 50,
      unitPrice: 2050,
      totalAmount: 102500,
      notes: 'Accumulation',
    },
    {
      id: crypto.randomUUID(),
      assetName: 'HDFC Bank Ltd',
      date: d60,
      type: 'Buy',
      quantity: 120,
      unitPrice: 675,
      totalAmount: 81000,
      notes: 'Banking dip purchase',
    },
    {
      id: crypto.randomUUID(),
      assetName: 'Reliance Industries Ltd',
      date: d30,
      type: 'Dividend',
      quantity: 100,
      unitPrice: 10,
      totalAmount: 1000,
      notes: 'Annual dividend credit',
    },
  ]

  base.snapshots = [
    { id: crypto.randomUUID(), date: d90, totalMarketValue: 1420000, investedAmount: 1350000, notes: 'Q1 Snapshot' },
    { id: crypto.randomUUID(), date: d60, totalMarketValue: 1560000, investedAmount: 1440000, notes: 'Q2 Snapshot' },
    { id: crypto.randomUUID(), date: d30, totalMarketValue: 1710000, investedAmount: 1520000, notes: 'Q3 Snapshot' },
    { id: crypto.randomUUID(), date: today, totalMarketValue: 1895000, investedAmount: 1610000, notes: 'Current Market Snapshot' },
  ]

  return base
}
