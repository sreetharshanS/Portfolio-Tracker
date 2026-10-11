export type AssetCategory =
  | 'Indian Stocks'
  | 'International Stocks'
  | 'Mutual Funds'
  | 'ETFs'
  | 'Gold'
  | 'Bonds and Fixed Income'
  | 'Cash'
  | 'Other Assets'

export type TransactionType =
  | 'Buy'
  | 'Sell'
  | 'Dividend'
  | 'Deposit'
  | 'Withdrawal'
  | 'Fee'
  | 'Tax'
  | 'Other'

export interface Holding {
  id: string
  name: string
  symbol?: string
  category: AssetCategory
  marketCountry?: string
  quantity: number
  avgPrice: number
  currentPrice?: number
  purchaseDate?: string
  notes?: string
  currency: 'INR'
  fractionAllowed?: boolean
}

export interface Transaction {
  id: string
  assetName: string
  date: string
  type: TransactionType
  quantity?: number
  unitPrice?: number
  fees?: number
  totalAmount: number
  notes?: string
  holdingId?: string
}

export interface Snapshot {
  id: string
  date: string
  totalMarketValue: number
  investedAmount?: number
  cashValue?: number
  notes?: string
}

export interface Milestone {
  id: string
  name: string
  targetAmount: number
  order: number
  active: boolean
  achievedAt?: string
  achievedValue?: number
}

export interface AllocationTarget {
  category: AssetCategory
  targetPercentage: number
}

export interface PortfolioState {
  holdings: Holding[]
  transactions: Transaction[]
  snapshots: Snapshot[]
  milestones: Milestone[]
  allocationTargets: AllocationTarget[]
  profile: {
    displayName: string
    timezone: string
    currency: string
    theme: 'dark' | 'light'
  }
}

export interface ImportPreviewRow {
  __rowIndex: number
  [key: string]: string | number | undefined
}
