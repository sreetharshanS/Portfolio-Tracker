import { describe, expect, it } from 'vitest'
import { calculatePortfolioSummary, createDefaultMilestones, getMilestoneStatus, getPortfolioState, validateCsvRows } from '../lib/calculations'
import type { Holding } from '../types/portfolio'

const holdings: Holding[] = [
  { id: 'h1', name: 'Reliance', category: 'Indian Stocks', quantity: 20, avgPrice: 2400, currentPrice: 3000, currency: 'INR' },
  { id: 'h2', name: 'Gold ETF', category: 'ETFs', quantity: 10, avgPrice: 7000, currentPrice: 6500, currency: 'INR' },
  { id: 'h3', name: 'Cash', category: 'Cash', quantity: 50000, avgPrice: 1, currentPrice: 1, currency: 'INR' },
]

describe('portfolio calculations', () => {
  it('starts with an empty portfolio and database-compatible milestone ids', () => {
    const state = getPortfolioState()
    expect(state.holdings).toEqual([])
    expect(state.transactions).toEqual([])
    expect(state.snapshots).toEqual([])
    expect(state.milestones.every((milestone) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(milestone.id))).toBe(true)
  })

  it('calculates summary totals and return percentage', () => {
    const summary = calculatePortfolioSummary(holdings)
    expect(summary.marketValue).toBe(60000 + 65000 + 50000)
    expect(summary.totalInvested).toBe(48000 + 70000 + 50000)
    expect(summary.unrealized).toBe(summary.marketValue - summary.totalInvested)
  })

  it('marks milestone progress correctly', () => {
    const milestones = createDefaultMilestones()
    const status = getMilestoneStatus(1500000, milestones)
    expect(status.current?.name).toBe('₹10 Lakh')
    expect(status.next?.name).toBe('₹25 Lakh')
  })

  it('validates CSV rows', () => {
    const result = validateCsvRows([
      { name: 'TCS', quantity: 10, avgPrice: 3500, currentPrice: 4000 },
      { name: '', quantity: -2, avgPrice: 'abc' },
    ])
    expect(result[0].valid).toBe(true)
    expect(result[1].valid).toBe(false)
  })
})
