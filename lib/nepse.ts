import { formatNpr, formatNum } from '@/lib/currency'
import type {
  NepseStock,
  NepseCompanyProfile,
  NepseCompanyFinancial,
  NepseMarketSummary,
  NepseData,
  NepseIndex,
  NepseReport,
  NepseDividendRecord,
  NepseDisclosure,
  NepseFloorSheetBroker,
  NepseFloorSheetSummary,
  NepseFloorSheetTrade,
} from './types'

const BASE_URL = 'https://shubhamnpk.github.io/yonepse/data'

const COMMON_HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: COMMON_HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const numOrNull = (v: unknown): number | null => {
  const n = Number(v)
  return v == null || v === '' || Number.isNaN(n) ? null : n
}

let dividendCache: Promise<NepseDividendRecord[]> | null = null
let disclosureCache: Promise<NepseDisclosure[]> | null = null
let floorSheetCache: Promise<{
  date: string
  stocks: Record<string, { symbol?: string; name?: string }>
  brokers: Record<string, string>
  day: { transactions?: unknown[][] }
} | null> | null = null

export async function fetchNepseStocks(): Promise<NepseStock[]> {
  const raw = await fetchJson<Record<string, unknown>[]>(`${BASE_URL}/nepse_data.json`)
  if (!raw) return []
  return raw.map((r: Record<string, unknown>) => {
    const ltp = Number(r.ltp ?? 0)
    const previousClose = Number((r.open as number) ?? (r.previous_close as number) ?? ltp)
    // Equities quote market cap in Rs millions; open-ended funds quote absolute rupees.
    const quotedCap = Number(r.market_cap ?? 0)
    return {
      symbol: String(r.symbol ?? ''),
      companyName: String((r.companyName as string) ?? (r.name as string) ?? r.symbol ?? ''),
      ltp,
      percentChange: Number((r.percentChange as number) ?? (r.percent_change as number) ?? 0),
      volume: Number(r.volume ?? 0),
      turnover: Number(r.turnover ?? 0),
      open: previousClose,
      high: Number(r.high ?? 0),
      low: Number(r.low ?? 0),
      close: ltp,
      asset_type: String((r.asset_type as string) ?? ''),
      sector: String((r.sector as string) ?? (r.asset_type as string) ?? 'Others'),
      trades: Number(r.trades ?? 0),
      marketCap: quotedCap >= 1e6 ? quotedCap : quotedCap * 1e6,
    } as NepseStock
  })
}

export async function fetchNepseMarketSummary(): Promise<NepseMarketSummary | null> {
  // Shape: [{detail: "Total Turnover Rs:", value: n}, ...] - NOT a keyed object.
  const rows = await fetchJson<{ detail: string; value: number }[]>(`${BASE_URL}/market/summary.json`)
  if (!rows) return null
  const get = (key: string): number => {
    const hit = rows.find(r => r.detail.toLowerCase().includes(key))
    return Number(hit?.value ?? 0) || 0
  }
  return {
    totalVolume: get('total traded shares'),
    totalTurnover: get('total turnover'),
    totalTrades: get('total transactions'),
    marketIndex: 0,
    indexChange: 0,
    scripsTraded: get('total scrips traded'),
    marketCap: get('total market capitalization'),
  }
}

/** Index series (NEPSE Index, Sensitive, Float…) with close/change/52W. 404-safe. */
export async function fetchNepseIndices(): Promise<NepseIndex[]> {
  const rows = await fetchJson<Record<string, unknown>[]>(`${BASE_URL}/market/indices.json`)
  if (!rows) return []
  return rows
    .filter(r => r.index)
    .map(r => {
      const close = Number(r.close ?? 0)
      const previousClose = Number(r.previousClose ?? 0)
      // The feed's change/perChange are unsigned magnitudes - always positive,
      // so a down day reads as a gain. Derive both from close vs previous close.
      const change = previousClose > 0 ? close - previousClose : Number(r.change ?? 0)
      return {
        name: String(r.index ?? ''),
        close,
        change,
        changePct: previousClose > 0 ? (change / previousClose) * 100 : Number(r.perChange ?? 0),
        previousClose,
        high: Number(r.high ?? 0),
        low: Number(r.low ?? 0),
        high52: Number(r.fiftyTwoWeekHigh ?? 0),
        low52: Number(r.fiftyTwoWeekLow ?? 0),
      }
    })
}

/** Headline NEPSE Index entry (close 2591.81 on 2026-10-12). */
export async function fetchNepseIndex(): Promise<NepseIndex | null> {
  const all = await fetchNepseIndices()
  return all.find(i => i.name.toLowerCase().includes('nepse index')) ?? all[0] ?? null
}

/** Symbol → NEPSE sector classification (16 groups, 583 symbols). */
export async function fetchNepseSectorMap(): Promise<Record<string, string>> {
  const groups = await fetchJson<Record<string, { symbol?: unknown }[]>>(`${BASE_URL}/other/sector_codes.json`)
  if (!groups) return {}
  const map: Record<string, string> = {}
  for (const [sector, rows] of Object.entries(groups)) {
    for (const row of rows ?? []) if (row.symbol) map[String(row.symbol).toUpperCase()] = sector
  }
  return map
}

export type NepseBroker = { memberCode: number; memberName: string; turnover30d: number; latestTurnover: number }

/** Broker turnover rankings from the YONepse mirror. */
export async function fetchNepseTopBrokers(): Promise<NepseBroker[]> {
  const payload = await fetchJson<Record<string, unknown>[] | { value?: Record<string, unknown>[] }>(`${BASE_URL}/other/brokers.json`)
  const rows = Array.isArray(payload) ? payload : payload?.value ?? []
  return rows
    .filter(row => row.activeStatus === 'A' && Number(row.thirtyDaysTurnover) > 0)
    .map(row => ({
      memberCode: Number(row.memberCode ?? 0),
      memberName: String(row.memberName ?? 'Unknown broker'),
      turnover30d: Number(row.thirtyDaysTurnover ?? 0),
      latestTurnover: Number(row.latestTurnover ?? 0),
    }))
    .sort((a, b) => b.turnover30d - a.turnover30d)
}

export type NepseMarketDay = {
  date: string
  turnover: number
  volume: number
  trades: number
  scrips: number
}

/** Daily turnover/volume/transactions, oldest first (mirror keeps ~234 sessions). */
export async function fetchNepseMarketHistory(days = 40): Promise<NepseMarketDay[]> {
  const rows = await fetchJson<Record<string, unknown>[]>(`${BASE_URL}/market/history.json`)
  if (!rows) return []
  return rows.slice(0, days).map(r => ({
    date: String(r.businessDate ?? ''),
    turnover: Number(r.totalTurnover ?? 0),
    volume: Number(r.totalTradedShares ?? 0),
    trades: Number(r.totalTransactions ?? 0),
    scrips: Number(r.tradedScrips ?? 0),
  })).reverse()
}

export type NepseIndexPoint = { date: string; close: number }

/** Daily NEPSE Index closes from monthly index shards. */
export async function fetchNepseIndexHistory(monthsBack = 12): Promise<NepseIndexPoint[]> {
  const man = await fetchJson<{ availableMonths?: string[] }>(`${BASE_URL}/indices/manifest.json`)
  const months = (man?.availableMonths ?? []).slice(-monthsBack)
  const files = await Promise.all(months.map(async month => ({
    month,
    data: await fetchJson<{ dates?: string[]; series?: Record<string, unknown[][]> }>(
      `${BASE_URL}/indices/monthly/${month}.json`,
    ),
  })))
  const points: NepseIndexPoint[] = []
  for (const { data } of files) {
    if (!data) continue
    const dates = data.dates ?? []
    for (const row of data.series?.NEPSE ?? []) {
      const date = String(dates[Number(row[0])] ?? '')
      const close = Number(row[1] ?? 0)
      if (date && close > 0) points.push({ date, close })
    }
  }
  return points.sort((a, b) => (a.date < b.date ? -1 : 1))
}

export type NepseMarketStatus = {
  is_open?: boolean
  status?: string
  [key: string]: unknown
}

/** Trading-day open/closed flag (same mirror, static JSON, keyless). */
export async function fetchNepseMarketStatus(): Promise<NepseMarketStatus | null> {
  return fetchJson<NepseMarketStatus>(`${BASE_URL}/market/status.json`)
}

export type NepseUpcomingIpo = {
  company: string
  units: string
  date_range: string
  announcement_date: string
  url?: string
  [key: string]: unknown
}

/** IPO pipeline (project-affected locals + general) - same mirror, keyless. */
export async function fetchUpcomingIpos(): Promise<NepseUpcomingIpo[]> {
  const data = await fetchJson<NepseUpcomingIpo[]>(`${BASE_URL}/ipo/upcoming.json`)
  return data ?? []
}

/** Chronological sort for filings — the mirror ships newest-first, oldest-first, or mixed.
 *  Parses fy ("2025-2026" → 2025) and quarter names; annual reports sort after Q4. */
export function sortReportsByPeriod(reports: NepseReport[]): NepseReport[] {
  const qOrder = (r: NepseReport): number => {
    if (r.type === 'Annual Report') return 5
    const q = r.quarter.toLowerCase()
    if (q.includes('first')) return 1
    if (q.includes('second')) return 2
    if (q.includes('third')) return 3
    if (q.includes('fourth')) return 4
    return 0
  }
  const fyStart = (r: NepseReport): number => {
    const m = (r.fy || r.fy_nepali || '').match(/\d{4}/)
    return m ? Number(m[0]) : 0
  }
  return [...reports].sort((a, b) => fyStart(a) - fyStart(b) || qOrder(a) - qOrder(b))
}

export type FyGroup = {
  fy: string
  fyNepali?: string
  annual: NepseReport | null
  quarters: NepseReport[]
  /** Annual profit when filed, else the sum of that year's quarters. */
  total: number | null
  totalBasis: 'annual' | 'quarters' | null
  /** % change vs the previous FY with a total — null when not comparable. */
  yoy: number | null
}

/** Group filings by fiscal year with year-over-year profit comparison. */
export function groupReportsByFy(reports: NepseReport[]): FyGroup[] {
  const sorted = sortReportsByPeriod(reports)
  const order = new Map<string, FyGroup>()
  for (const r of sorted) {
    const key = r.fy || r.fy_nepali || 'Unknown'
    if (!order.has(key)) order.set(key, { fy: key, fyNepali: r.fy_nepali, annual: null, quarters: [], total: null, totalBasis: null, yoy: null })
    const g = order.get(key)!
    if (r.fy_nepali) g.fyNepali = r.fy_nepali
    if (r.type === 'Annual Report' && !g.annual) g.annual = r
    else g.quarters.push(r)
  }
  const groups = [...order.values()]
  let prevTotal: number | null = null
  for (const g of groups) {
    const qp = g.quarters.map(q => q.profit).filter((p): p is number => p != null)
    if (g.annual?.profit != null) {
      g.total = g.annual.profit
      g.totalBasis = 'annual'
    } else if (qp.length) {
      g.total = qp.reduce((a, b) => a + b, 0)
      g.totalBasis = 'quarters'
    }
    if (g.total != null && prevTotal != null && prevTotal !== 0) {
      g.yoy = ((g.total - prevTotal) / Math.abs(prevTotal)) * 100
    }
    if (g.total != null) prevTotal = g.total
  }
  return groups
}

export type AnnualCompanyResult = {
  fy: string
  fyNepali?: string
  profit: number
  basis: 'annual' | 'quarters'
}

/** Latest comparable full-year result; quarterly sums require Q1 through Q4. */
export function latestAnnualCompanyResult(reports: NepseReport[]): AnnualCompanyResult | null {
  const groups = groupReportsByFy(reports)
  for (const group of [...groups].reverse()) {
    if (group.annual?.profit != null) {
      return { fy: group.fy, fyNepali: group.fyNepali, profit: group.annual.profit, basis: 'annual' }
    }
    const quarterResults = new Map(group.quarters.filter(report => report.profit != null).map(report => {
      const quarter = report.quarter.toLowerCase()
      const number = quarter.includes('first') || /\bq1\b/.test(quarter) ? 1
        : quarter.includes('second') || /\bq2\b/.test(quarter) ? 2
          : quarter.includes('third') || /\bq3\b/.test(quarter) ? 3
            : quarter.includes('fourth') || /\bq4\b/.test(quarter) ? 4 : 0
      return [number, report.profit!]
    }))
    if ([1, 2, 3, 4].every(quarter => quarterResults.has(quarter))) {
      const profit = [1, 2, 3, 4].reduce((sum, quarter) => sum + quarterResults.get(quarter)!, 0)
      return { fy: group.fy, fyNepali: group.fyNepali, profit, basis: 'quarters' }
    }
  }
  return null
}
export type NepsePricePoint = {
  date: string
  close: number
  volume: number
  turnover: number
  trades: number
}

/** Recent daily prices for one symbol from monthly LTP shards (single source: yonepse).
 *  Reads the manifest, takes the last `monthsBack` months (~177KB/file), merges
 *  per-symbol [dateIndex, ltp, volume, turnover, trades] rows chronologically. */
export async function fetchLtpRecent(symbol: string, monthsBack = 3): Promise<NepsePricePoint[]> {
  try {
    const man = await fetchJson<{ availableMonths?: string[] }>(`${BASE_URL}/ltp/manifest.json`)
    const months = (man?.availableMonths ?? []).slice(-monthsBack)
    const sym = symbol.toUpperCase()
    const files: { month: string; d: { dates?: (string | number)[]; series?: Record<string, unknown[][]> } }[] = []
    for (let start = 0; start < months.length; start += 12) {
      const chunk = months.slice(start, start + 12)
      const loaded = await Promise.all(chunk.map(async month => {
        const d = await fetchJson<{ dates?: (string | number)[]; series?: Record<string, unknown[][]> }>(
          `${BASE_URL}/ltp/monthly/${month}.json`,
        )
        return d ? { month, d } : null
      }))
      for (const item of loaded) if (item) files.push(item)
    }
    const pts: NepsePricePoint[] = []
    for (const f of files) {
      const dates = f.d.dates ?? []
      const rows = f.d.series?.[sym] ?? []
      for (const r of rows) {
        const day = String(dates[Number(r[0])] ?? '')
        const close = Number(r[1] ?? 0)
        if (!day || !(close > 0)) continue
        pts.push({
          date: /^\d{4}-/.test(day) ? day : `${f.month}-${day.padStart(2, '0')}`,
          close,
          volume: Number(r[2] ?? 0),
          turnover: Number(r[3] ?? 0),
          trades: Number(r[4] ?? 0),
        })
      }
    }
    return pts.sort((a, b) => (a.date < b.date ? -1 : 1))
  } catch {
    return []
  }
}

export type NepseSectorPerformancePoint = { date: string; value: number }

/**
 * Equal-weighted sector performance rebased to 100, aggregated from the LTP
 * archive shards. This is a constituent-derived series, not an official NEPSE
 * sector sub-index.
 */
export async function fetchNepseSectorPerformance(symbols: string[], monthsBack = 12): Promise<NepseSectorPerformancePoint[]> {
  if (!symbols.length) return []
  const manifest = await fetchJson<{ availableMonths?: string[] }>(`${BASE_URL}/ltp/manifest.json`)
  const months = (manifest?.availableMonths ?? []).slice(-monthsBack)
  const shards = await Promise.all(months.map(async month => ({
    month,
    data: await fetchJson<{ dates?: (string | number)[]; series?: Record<string, unknown[][]> }>(`${BASE_URL}/ltp/monthly/${month}.json`),
  })))
  const wanted = new Set(symbols.map(symbol => symbol.toUpperCase()))
  const byDate = new Map<string, Map<string, number>>()
  for (const { month, data } of shards) {
    if (!data) continue
    const dates = data.dates ?? []
    for (const symbol of wanted) {
      for (const row of data.series?.[symbol] ?? []) {
        const day = String(dates[Number(row[0])] ?? '')
        const close = Number(row[1] ?? 0)
        if (!day || !(close > 0)) continue
        const date = /^\d{4}-/.test(day) ? day : `${month}-${day.padStart(2, '0')}`
        const values = byDate.get(date) ?? new Map<string, number>()
        values.set(symbol, close)
        byDate.set(date, values)
      }
    }
  }
  const previous = new Map<string, number>()
  const points: NepseSectorPerformancePoint[] = []
  let index = 100
  for (const [date, closes] of [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    let returnSum = 0
    let returnCount = 0
    for (const [symbol, close] of closes) {
      const last = previous.get(symbol)
      if (last && last > 0) {
        returnSum += (close - last) / last
        returnCount += 1
      }
      previous.set(symbol, close)
    }
    if (returnCount) {
      index *= 1 + returnSum / returnCount
      points.push({ date, value: Number(index.toFixed(4)) })
    }
  }
  return points
}

/** Dividend announcements (bonus + cash) from the mirror's 2,500-record history. */
export async function fetchNepseDividendHistory(): Promise<NepseDividendRecord[]> {
  if (!dividendCache) {
    dividendCache = fetchJson<{ symbols?: unknown[]; columns?: unknown[]; records?: unknown[][] }>(
      `${BASE_URL}/dividend/history.json`,
    ).then(data => {
      const symbols = (data?.symbols ?? []).map(String)
      const columns = (data?.columns ?? []).map(String)
      const index = (name: string) => columns.indexOf(name)
      const cell = (row: unknown[], name: string): unknown => {
        const at = index(name)
        return at >= 0 ? row[at] : null
      }
      return (data?.records ?? [])
        .map(row => ({
          symbol: symbols[Number(cell(row, 'symbol'))] ?? '',
          bonus: numOrNull(cell(row, 'bonus')),
          cash: numOrNull(cell(row, 'cash')),
          total: numOrNull(cell(row, 'total')),
          announce: String(cell(row, 'announce') ?? ''),
          bookclose: String(cell(row, 'bookclose') ?? '') || null,
          fiscalYear: String(cell(row, 'fiscalYear') ?? ''),
        }))
        .filter(row => row.symbol)
        .sort((a, b) => b.announce.localeCompare(a.announce))
    })
  }
  return dividendCache
}

/** Company disclosures: board changes, AGMs, book closures and price-sensitive notices. */
export async function fetchNepseDisclosures(): Promise<NepseDisclosure[]> {
  if (!disclosureCache) {
    disclosureCache = fetchJson<Record<string, unknown>[]>(`${BASE_URL}/notify/disclosures.json`).then(rows =>
      (rows ?? [])
        .filter(row => row.title)
        .map(row => {
          const docs = Array.isArray(row.documents) ? row.documents : []
          const doc = docs.find(item => item && typeof item === 'object') as Record<string, unknown> | undefined
          return {
            id: Number(row.id ?? 0),
            symbol: String(row.symbol ?? '') || undefined,
            title: String(row.title ?? ''),
            body: String(row.body ?? ''),
            source: String(row.source ?? '') || undefined,
            publishedAt: String(row.publishedAt ?? ''),
            documentUrl: typeof doc?.fileUrl === 'string' ? doc.fileUrl : undefined,
          }
        })
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    )
  }
  return disclosureCache
}

/** Per-symbol floor-sheet summary from the latest trading session. */
export async function fetchNepseFloorSheetSummary(symbol: string): Promise<NepseFloorSheetSummary | null> {
  if (!floorSheetCache) {
    floorSheetCache = (async () => {
      const man = await fetchJson<{ latestDate?: string; availableDates?: string[] }>(`${BASE_URL}/floor_sheet/manifest.json`)
      const date = man?.latestDate ?? (man?.availableDates ?? [])[(man?.availableDates ?? []).length - 1] ?? ''
      if (!date) return null
      const [stocks, brokers, day] = await Promise.all([
        fetchJson<Record<string, { symbol?: string; name?: string }>>(`${BASE_URL}/floor_sheet/lookups/stocks.json`),
        fetchJson<Record<string, string>>(`${BASE_URL}/floor_sheet/lookups/brokers.json`),
        fetchJson<{ transactions?: unknown[][] }>(`${BASE_URL}/floor_sheet/daily/${date}.json`),
      ])
      if (!stocks || !brokers || !day) return null
      return { date, stocks, brokers, day }
    })()
  }

  const bundle = await floorSheetCache
  if (!bundle) return null

  const wanted = symbol.toUpperCase()
  const stockId = Object.keys(bundle.stocks).find(key => String(bundle.stocks[key]?.symbol ?? '').toUpperCase() === wanted)
  if (!stockId) return null

  const buyers = new Map<string, { qty: number; amount: number }>()
  const sellers = new Map<string, { qty: number; amount: number }>()
  const trades: NepseFloorSheetTrade[] = []
  let totalQty = 0
  let totalAmount = 0

  for (const raw of bundle.day.transactions ?? []) {
    if (!Array.isArray(raw) || Number(raw[1]) !== Number(stockId)) continue
    const qty = Number(raw[4] ?? 0)
    const rate = Number(raw[5] ?? 0)
    const amount = Number(raw[6] ?? 0)
    const time = String(raw[7] ?? '')
    const buyer = bundle.brokers[String(raw[2])] ?? `Broker ${raw[2]}`
    const seller = bundle.brokers[String(raw[3])] ?? `Broker ${raw[3]}`
    totalQty += qty
    totalAmount += amount
    const buyEntry = buyers.get(buyer) ?? { qty: 0, amount: 0 }
    buyEntry.qty += qty
    buyEntry.amount += amount
    buyers.set(buyer, buyEntry)
    const sellEntry = sellers.get(seller) ?? { qty: 0, amount: 0 }
    sellEntry.qty += qty
    sellEntry.amount += amount
    sellers.set(seller, sellEntry)
    trades.push({ time, qty, rate, amount, buyer, seller })
  }

  if (trades.length === 0) return null

  const rank = (map: Map<string, { qty: number; amount: number }>): NepseFloorSheetBroker[] =>
    [...map.entries()]
      .map(([name, value]) => ({
        name,
        qty: value.qty,
        amount: value.amount,
        share: totalAmount > 0 ? (value.amount / totalAmount) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)

  return {
    date: bundle.date,
    totalQty,
    totalAmount,
    contracts: trades.length,
    buyers: rank(buyers),
    sellers: rank(sellers),
    largest: [...trades].sort((a, b) => b.amount - a.amount).slice(0, 5),
  }
}

export async function fetchNepseTopStocks(): Promise<{ topGainers: NepseStock[]; topLosers: NepseStock[] } | null> {
  // Shape: {top_gainer: [...], top_loser: [...], top_turnover, top_trade, top_transaction}
  // rows: {symbol, ltp, cp, pointChange, percentageChange, securityName}
  const raw = await fetchJson<Record<string, Record<string, unknown>[]>>(`${BASE_URL}/market/top_stocks.json`)
  if (!raw) return null
  const mapRow = (r: Record<string, unknown>): NepseStock => ({
    symbol: String(r.symbol ?? ''),
    companyName: String(r.securityName ?? r.symbol ?? ''),
    ltp: Number(r.ltp ?? 0),
    percentChange: Number(r.percentageChange ?? 0),
    volume: 0,
    turnover: 0,
    open: Number(r.ltp ?? 0),
    high: Number(r.ltp ?? 0),
    low: Number(r.ltp ?? 0),
    close: Number(r.cp ?? r.ltp ?? 0),
    asset_type: '',
    sector: 'Others',
  })
  return {
    topGainers: (raw.top_gainer ?? []).map(mapRow),
    topLosers: (raw.top_loser ?? []).map(mapRow),
  }
}

export async function fetchNepseCompanyProfiles(): Promise<NepseCompanyProfile[]> {
  if (!profileCache) {
    profileCache = fetchJson<Record<string, unknown>[]>(`${BASE_URL}/company/profiles.json`).then(data =>
      (data ?? [])
        .filter(r => r.symbol)
        .map(r => ({
          symbol: String(r.symbol ?? ''),
          profile: String(r.profile ?? ''),
          id: Number(r.id ?? 0) || undefined,
          email: String(r.email ?? '') || undefined,
          phone: String(r.phone ?? '') || undefined,
          fax: String(r.fax ?? '') || undefined,
          contact_person: String(r.contact_person ?? '') || undefined,
          address: String(r.address ?? '') || undefined,
          address_type: String(r.address_type ?? '') || undefined,
          logo_path: String(r.logo_path ?? '') || undefined,
          status: String(r.status ?? '') || undefined,
        })),
    )
  }
  return profileCache
}

let finCache: Promise<NepseCompanyFinancial[]> | null = null
let profileCache: Promise<NepseCompanyProfile[]> | null = null

/** 307 symbols with quarterly + annual reports. 5.6MB file — module-cached
 *  so SPA navigation never re-downloads it. Shape: {symbol, reports[]}. */
export async function fetchNepseCompanyFinancials(): Promise<NepseCompanyFinancial[]> {
  if (!finCache) {
    finCache = fetchJson<{ symbol?: unknown; reports?: Record<string, unknown>[] }[]>(
      `${BASE_URL}/company/financials.json`,
    ).then(data =>
      (data ?? [])
        .filter(r => r.symbol)
        .map(r => ({
          symbol: String(r.symbol ?? ''),
          reports: (r.reports ?? []).map(q => ({
            type: String(q.type ?? ''),
            quarter: String(q.quarter ?? ''),
            fy: String(q.fy ?? ''),
            fy_nepali: String(q.fy_nepali ?? '') || undefined,
            pe: numOrNull(q.pe),
            eps: numOrNull(q.eps),
            paid_up_capital: numOrNull(q.paid_up_capital),
            profit: numOrNull(q.profit),
            revenue: numOrNull(q.revenue),
            net_worth_per_share: numOrNull(q.net_worth_per_share),
          })),
        })),
    )
  }
  return finCache
}

export async function fetchNepseData(): Promise<NepseData> {
  const [stocks, market, topStocks] = await Promise.all([
    fetchNepseStocks(),
    fetchNepseMarketSummary(),
    fetchNepseTopStocks(),
  ])

  return {
    stocks,
    market: market ?? {
      totalVolume: 0,
      totalTurnover: 0,
      totalTrades: 0,
      marketIndex: 0,
      indexChange: 0,
    },
    topGainers: topStocks?.topGainers ?? [],
    topLosers: topStocks?.topLosers ?? [],
  }
}

export function formatNprAmount(amount: unknown): string {
  return formatNpr(amount)
}

export function formatNumber(num: unknown): string {
  const n = Number(num)
  if (num == null || Number.isNaN(n)) return '-'
  return formatNum(n)
}

export function getSectorColor(sector: string): string {
  const colors: Record<string, string> = {
    'Commercial Banks': '#2563eb',
    'Development Banks': '#0891b2',
    'Finance': '#7c3aed',
    'Insurance': '#dc2626',
    'Microfinance': '#ea580c',
    'Hydropower': '#16a34a',
    'Trading': '#ca8a04',
    'Manufacturing': '#9333ea',
    'Hotels': '#ec4899',
    'TEA': '#64748b',
    'Others': '#6b7280',
  }
  return colors[sector] ?? colors['Others']
}
