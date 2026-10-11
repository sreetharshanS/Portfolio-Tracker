import { createDefaultMilestones, createDefaultTargets, defaultCategories, getPortfolioState } from './calculations'
import { supabase } from './supabase'
import type { AllocationTarget, AssetCategory, Holding, Milestone, PortfolioState, Snapshot, Transaction } from '../types/portfolio'

type CategoryRow = { id: string; name: string }
type HoldingRow = {
  id: string
  asset_category_id: string | null
  asset_name: string
  symbol: string | null
  market_or_country: string | null
  quantity: number
  cost_basis_per_unit: number | null
  current_price: number | null
  currency: string
  purchase_date: string | null
  notes: string | null
  fraction_allowed: boolean
}
type TransactionRow = {
  id: string
  holding_id: string | null
  transaction_type: string
  transaction_date: string
  quantity: number | null
  unit_price: number | null
  fees: number
  cash_amount: number
  notes: string | null
}
type SnapshotRow = {
  id: string
  snapshot_date: string
  total_market_value: number
  total_invested_amount: number | null
  cash_value: number | null
  notes: string | null
}
type MilestoneRow = {
  id: string
  name: string
  target_amount: number
  display_order: number
  is_active: boolean
  achieved_at: string | null
  achieved_value: number | null
}
type ProfileRow = {
  display_name: string
  timezone: string
  currency: string
  theme: 'dark' | 'light'
}

function throwOnError(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function categoryOrOther(name: string | undefined): AssetCategory {
  return defaultCategories.find((category) => category === name) ?? 'Other Assets'
}

export async function initializeUserPortfolio(userId: string, email: string) {
  const defaults = getPortfolioState()
  const { error: profileError } = await supabase.from('profiles').upsert(
    { id: userId, display_name: email.split('@')[0] || 'User' },
    { onConflict: 'id', ignoreDuplicates: true },
  )
  throwOnError(profileError)

  const { error: categoryError } = await supabase.from('asset_categories').upsert(
    defaultCategories.map((name) => ({ user_id: userId, name, is_default: true })),
    { onConflict: 'user_id,name', ignoreDuplicates: true },
  )
  throwOnError(categoryError)

  const { data: categoryRows, error: categoriesReadError } = await supabase
    .from('asset_categories')
    .select('id,name')
    .eq('user_id', userId)
  throwOnError(categoriesReadError)
  const categoryIds = new Map((categoryRows as CategoryRow[]).map((row) => [row.name, row.id]))

  const { data: existingMilestones, error: existingMilestonesError } = await supabase
    .from('milestones')
    .select('name')
    .eq('user_id', userId)
  throwOnError(existingMilestonesError)
  const existingMilestoneNames = new Set((existingMilestones as { name: string }[]).map((milestone) => milestone.name))
  const missingMilestones = defaults.milestones.filter((milestone) => !existingMilestoneNames.has(milestone.name))
  if (missingMilestones.length) {
    const { error: milestoneError } = await supabase.from('milestones').insert(
      missingMilestones.map((milestone) => ({
        id: milestone.id,
        user_id: userId,
        name: milestone.name,
        target_amount: milestone.targetAmount,
        display_order: milestone.order,
        is_active: milestone.active,
      })),
    )
    throwOnError(milestoneError)
  }

  const targetRows = defaults.allocationTargets.flatMap((target) => {
    const assetCategoryId = categoryIds.get(target.category)
    return assetCategoryId ? [{ user_id: userId, asset_category_id: assetCategoryId, target_percentage: target.targetPercentage }] : []
  })
  const { error: targetsError } = await supabase.from('asset_targets').upsert(targetRows, {
    onConflict: 'user_id,asset_category_id',
    ignoreDuplicates: true,
  })
  throwOnError(targetsError)
}

export async function loadUserPortfolio(userId: string): Promise<PortfolioState> {
  const [profileResult, categoryResult, holdingResult, transactionResult, snapshotResult, milestoneResult, targetResult] = await Promise.all([
    supabase.from('profiles').select('display_name,timezone,currency,theme').eq('id', userId).maybeSingle(),
    supabase.from('asset_categories').select('id,name').eq('user_id', userId),
    supabase.from('holdings').select('id,asset_category_id,asset_name,symbol,market_or_country,quantity,cost_basis_per_unit,current_price,currency,purchase_date,notes,fraction_allowed').eq('user_id', userId),
    supabase.from('transactions').select('id,holding_id,transaction_type,transaction_date,quantity,unit_price,fees,cash_amount,notes').eq('user_id', userId).order('transaction_date', { ascending: false }),
    supabase.from('portfolio_snapshots').select('id,snapshot_date,total_market_value,total_invested_amount,cash_value,notes').eq('user_id', userId).order('snapshot_date'),
    supabase.from('milestones').select('id,name,target_amount,display_order,is_active,achieved_at,achieved_value').eq('user_id', userId).order('display_order'),
    supabase.from('asset_targets').select('asset_category_id,target_percentage').eq('user_id', userId),
  ])

  for (const result of [profileResult, categoryResult, holdingResult, transactionResult, snapshotResult, milestoneResult, targetResult]) {
    throwOnError(result.error)
  }

  const categories = categoryResult.data as CategoryRow[]
  const categoryById = new Map(categories.map((category) => [category.id, category.name]))
  const holdings: Holding[] = (holdingResult.data as HoldingRow[]).map((row) => ({
    id: row.id,
    name: row.asset_name,
    symbol: row.symbol ?? undefined,
    category: categoryOrOther(categoryById.get(row.asset_category_id ?? '')),
    marketCountry: row.market_or_country ?? undefined,
    quantity: Number(row.quantity),
    avgPrice: Number(row.cost_basis_per_unit ?? 0),
    currentPrice: row.current_price == null ? undefined : Number(row.current_price),
    purchaseDate: row.purchase_date ?? undefined,
    notes: row.notes ?? undefined,
    currency: 'INR',
    fractionAllowed: row.fraction_allowed,
  }))
  const holdingById = new Map(holdings.map((holding) => [holding.id, holding]))
  const transactions: Transaction[] = (transactionResult.data as TransactionRow[]).map((row) => ({
    id: row.id,
    holdingId: row.holding_id ?? undefined,
    assetName: holdingById.get(row.holding_id ?? '')?.name ?? 'Unlinked transaction',
    date: row.transaction_date,
    type: row.transaction_type as Transaction['type'],
    quantity: row.quantity == null ? undefined : Number(row.quantity),
    unitPrice: row.unit_price == null ? undefined : Number(row.unit_price),
    fees: Number(row.fees ?? 0),
    totalAmount: Number(row.cash_amount),
    notes: row.notes ?? undefined,
  }))
  const snapshots: Snapshot[] = (snapshotResult.data as SnapshotRow[]).map((row) => ({
    id: row.id,
    date: row.snapshot_date,
    totalMarketValue: Number(row.total_market_value),
    investedAmount: row.total_invested_amount == null ? undefined : Number(row.total_invested_amount),
    cashValue: row.cash_value == null ? undefined : Number(row.cash_value),
    notes: row.notes ?? undefined,
  }))
  const milestones: Milestone[] = (milestoneResult.data as MilestoneRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount),
    order: row.display_order,
    active: row.is_active,
    achievedAt: row.achieved_at ?? undefined,
    achievedValue: row.achieved_value == null ? undefined : Number(row.achieved_value),
  }))
  const targetByCategoryId = new Map((targetResult.data as { asset_category_id: string; target_percentage: number }[]).map((row) => [row.asset_category_id, Number(row.target_percentage)]))
  const allocationTargets: AllocationTarget[] = defaultCategories.map((category) => {
    const categoryId = categories.find((entry) => entry.name === category)?.id
    return { category, targetPercentage: categoryId ? targetByCategoryId.get(categoryId) ?? 0 : 0 }
  })

  const defaults = getPortfolioState()
  const profile = profileResult.data as ProfileRow | null
  return {
    ...defaults,
    holdings,
    transactions,
    snapshots,
    milestones: milestones.length ? milestones : createDefaultMilestones(),
    allocationTargets: targetResult.data?.length ? allocationTargets : createDefaultTargets(),
    profile: {
      ...defaults.profile,
      displayName: profile?.display_name ?? 'Your Portfolio',
      timezone: profile?.timezone ?? defaults.profile.timezone,
      currency: profile?.currency ?? defaults.profile.currency,
      theme: profile?.theme ?? defaults.profile.theme,
    },
  }
}

async function deleteRemovedRows(table: string, userId: string, currentIds: string[]) {
  let request = supabase.from(table).delete().eq('user_id', userId)
  if (currentIds.length) request = request.not('id', 'in', `(${currentIds.join(',')})`)
  const { error } = await request
  throwOnError(error)
}

export async function saveUserPortfolio(userId: string, portfolio: PortfolioState) {
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('asset_categories')
    .select('id,name')
    .eq('user_id', userId)
  throwOnError(categoriesError)
  const categoryIds = new Map((categoriesData as CategoryRow[]).map((row) => [row.name, row.id]))

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    display_name: portfolio.profile.displayName || 'Your Portfolio',
    timezone: portfolio.profile.timezone,
    currency: portfolio.profile.currency,
    theme: portfolio.profile.theme,
  })
  throwOnError(profileError)

  const { error: holdingsError } = await supabase.from('holdings').upsert(
    portfolio.holdings.map((holding) => ({
      id: holding.id,
      user_id: userId,
      asset_category_id: categoryIds.get(holding.category) ?? null,
      asset_name: holding.name,
      symbol: holding.symbol ?? null,
      market_or_country: holding.marketCountry ?? null,
      quantity: holding.quantity,
      cost_basis_per_unit: holding.avgPrice,
      current_price: holding.currentPrice ?? null,
      currency: holding.currency,
      purchase_date: holding.purchaseDate ?? null,
      notes: holding.notes ?? null,
      fraction_allowed: holding.fractionAllowed ?? false,
    })),
    { onConflict: 'id' },
  )
  throwOnError(holdingsError)

  const { error: transactionsError } = await supabase.from('transactions').upsert(
    portfolio.transactions.map((transaction) => ({
      id: transaction.id,
      user_id: userId,
      holding_id: transaction.holdingId ?? portfolio.holdings.find((holding) => holding.name === transaction.assetName)?.id ?? null,
      transaction_type: transaction.type,
      transaction_date: transaction.date,
      quantity: transaction.quantity ?? null,
      unit_price: transaction.unitPrice ?? null,
      fees: transaction.fees ?? 0,
      cash_amount: transaction.totalAmount,
      notes: transaction.notes ?? null,
    })),
    { onConflict: 'id' },
  )
  throwOnError(transactionsError)

  const { error: snapshotsError } = await supabase.from('portfolio_snapshots').upsert(
    portfolio.snapshots.map((snapshot) => ({
      id: snapshot.id,
      user_id: userId,
      snapshot_date: snapshot.date,
      total_market_value: snapshot.totalMarketValue,
      total_invested_amount: snapshot.investedAmount ?? null,
      cash_value: snapshot.cashValue ?? null,
      notes: snapshot.notes ?? null,
    })),
    { onConflict: 'user_id,snapshot_date' },
  )
  throwOnError(snapshotsError)

  const { error: milestonesError } = await supabase.from('milestones').upsert(
    portfolio.milestones.map((milestone) => ({
      id: milestone.id,
      user_id: userId,
      name: milestone.name,
      target_amount: milestone.targetAmount,
      display_order: milestone.order,
      is_active: milestone.active,
      achieved_at: milestone.achievedAt ?? null,
      achieved_value: milestone.achievedValue ?? null,
    })),
    { onConflict: 'id' },
  )
  throwOnError(milestonesError)

  const targetRows = portfolio.allocationTargets.flatMap((target) => {
    const categoryId = categoryIds.get(target.category)
    return categoryId ? [{ user_id: userId, asset_category_id: categoryId, target_percentage: target.targetPercentage }] : []
  })
  const { error: targetsError } = await supabase.from('asset_targets').upsert(targetRows, {
    onConflict: 'user_id,asset_category_id',
  })
  throwOnError(targetsError)

  await deleteRemovedRows('transactions', userId, portfolio.transactions.map((transaction) => transaction.id))
  await deleteRemovedRows('portfolio_snapshots', userId, portfolio.snapshots.map((snapshot) => snapshot.id))
  await deleteRemovedRows('milestones', userId, portfolio.milestones.map((milestone) => milestone.id))
  await deleteRemovedRows('holdings', userId, portfolio.holdings.map((holding) => holding.id))
}
