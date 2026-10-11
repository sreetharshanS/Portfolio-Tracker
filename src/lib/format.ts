export const INR = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export const percentFormat = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
})

export function formatCurrency(value: number): string {
  return INR.format(Number.isFinite(value) ? value : 0)
}

export function formatCompactCurrency(value: number): string {
  if (!Number.isFinite(value)) return '₹0'
  const abs = Math.abs(value)
  if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (abs >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return formatCurrency(value)
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.0%'
  return `${percentFormat.format(value)}%`
}

export function formatDate(date: string | undefined): string {
  if (!date) return '—'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}
