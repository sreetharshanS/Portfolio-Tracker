export interface FundamentalStock {
  name: string
  marketCapCr: number
  salesGrowth3Years: number
  profitGrowth3Years: number
  roce: number
  roe: number
  peRatio: number
  debtToEquity: number
  interestCoverage: number
  promoterPledge: number
}

const COLUMN_ALIASES: Record<keyof FundamentalStock, string[]> = {
  name: ['name', 'company', 'companyname'],
  marketCapCr: ['marketcapitalization', 'marcaprscrore', 'marcaprscrores', 'marcaprscr', 'marketcapcr', 'marketcap'],
  salesGrowth3Years: ['salesgrowth3years', 'salesgrowth3year'],
  profitGrowth3Years: ['profitgrowth3years', 'profitgrowth3year'],
  roce: ['roce', 'rocepercent'],
  roe: ['roe', 'roepercent'],
  peRatio: ['stockpe', 'pe', 'peratio', 'priceearnings'],
  debtToEquity: ['debttoequity', 'debtequity'],
  interestCoverage: ['interestcoverage', 'interestcoverageratio'],
  promoterPledge: ['pledgedpercentage', 'promoterpledge', 'promoterpledgedpercentage'],
}

const REQUIRED_COLUMNS = Object.keys(COLUMN_ALIASES) as (keyof FundamentalStock)[]

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        quoted = !quoted
      }
    } else if (character === ',' && !quoted) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && csv[index + 1] === '\n') index += 1
      row.push(field.trim())
      if (row.some((value) => value.length > 0)) rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some((value) => value.length > 0)) rows.push(row)
  if (quoted) throw new Error('The CSV contains an unterminated quoted field.')
  return rows
}

function normalizeHeader(header: string) {
  return header.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function parseNumber(value: string | undefined): number | null {
  if (value === undefined) return null
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '--' || trimmed.toLowerCase() === 'na') return null
  const isNegative = /^\(.*\)$/.test(trimmed)
  const normalized = trimmed.replace(/cr\.?$/i, '').replace(/[₹,%\s,()]/g, '')
  const result = Number(normalized)
  if (!Number.isFinite(result)) return null
  return isNegative ? -result : result
}

export function parseFundamentalScreenerCsv(csv: string): FundamentalStock[] {
  const rows = parseCsvRows(csv)
  if (rows.length < 2) throw new Error('The CSV has no stock rows.')

  const headers = rows[0].map(normalizeHeader)
  const columnIndices = Object.fromEntries(
    REQUIRED_COLUMNS.map((field) => [
      field,
      headers.findIndex((header) => COLUMN_ALIASES[field].includes(header)),
    ]),
  ) as Record<keyof FundamentalStock, number>
  const missingColumns = REQUIRED_COLUMNS.filter((field) => columnIndices[field] < 0)
  if (missingColumns.length) {
    throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}.`)
  }

  return rows.slice(1).flatMap((row) => {
    const name = row[columnIndices.name]?.trim()
    if (!name) return []
    const metrics = {} as Omit<FundamentalStock, 'name'>
    const numericFields = REQUIRED_COLUMNS.filter((field) => field !== 'name')
    for (const field of numericFields) {
      const value = parseNumber(row[columnIndices[field]])
      if (value === null) return []
      metrics[field] = value
    }
    return [{ name, ...metrics }]
  })
}

export function matchesFundamentalScreenerCriteria(stock: FundamentalStock): boolean {
  return stock.marketCapCr > 500
    && stock.salesGrowth3Years > 12
    && stock.profitGrowth3Years > 15
    && stock.roce > 15
    && stock.roe > 15
    && stock.peRatio < 30
    && stock.debtToEquity < 0.5
    && stock.interestCoverage > 3
    && stock.promoterPledge === 0
}

export function filterFundamentalScreenerStocks(stocks: FundamentalStock[]): FundamentalStock[] {
  return stocks
    .filter(matchesFundamentalScreenerCriteria)
    .sort((a, b) => a.name.localeCompare(b.name))
}
