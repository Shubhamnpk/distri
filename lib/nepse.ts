import { formatNpr } from '@/lib/currency'
import type { NepseStock, NepseCompanyProfile, NepseCompanyFinancial, NepseMarketSummary, NepseData, NepseIndex, NepseReport } from './types'

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

export async function fetchNepseStocks(): Promise<NepseStock[]> {
  const raw = await fetchJson<Record<string, unknown>[]>(`${BASE_URL}/nepse_data.json`)
  if (!raw) return []
  return raw.map((r: Record<string, unknown>) => ({
    symbol: String(r.symbol ?? ''),
    companyName: String((r.companyName as string) ?? (r.name as string) ?? r.symbol ?? ''),
    ltp: Number(r.ltp ?? 0),
    percentChange: Number((r.percentChange as number) ?? (r.percent_change as number) ?? 0),
    volume: Number(r.volume ?? 0),
    turnover: Number(r.turnover ?? 0),
    open: Number((r.open as number) ?? (r.previous_close as number) ?? r.ltp ?? 0),
    high: Number(r.high ?? 0),
    low: Number(r.low ?? 0),
    close: Number((r.close as number) ?? (r.previous_close as number) ?? r.ltp ?? 0),
    asset_type: String((r.asset_type as string) ?? ''),
    sector: String((r.sector as string) ?? (r.asset_type as string) ?? 'Others'),
  } as NepseStock))
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
    .map(r => ({
      name: String(r.index ?? ''),
      close: Number(r.close ?? 0),
      change: Number(r.change ?? 0),
      changePct: Number(r.perChange ?? 0),
      previousClose: Number(r.previousClose ?? 0),
      high: Number(r.high ?? 0),
      low: Number(r.low ?? 0),
      high52: Number(r.fiftyTwoWeekHigh ?? 0),
      low52: Number(r.fiftyTwoWeekLow ?? 0),
    }))
}

/** Headline NEPSE Index entry (close 2591.81 on 2026-10-12). */
export async function fetchNepseIndex(): Promise<NepseIndex | null> {
  const all = await fetchNepseIndices()
  return all.find(i => i.name.toLowerCase().includes('nepse index')) ?? all[0] ?? null
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
/** Recent daily closes for one symbol from monthly LTP shards (single source: yonepse).
 *  Reads the manifest, takes the last `monthsBack` months (~244KB/file), merges
 *  per-symbol [dateIndex, ltp, …] rows into chronological {date, close} points. */
export async function fetchLtpRecent(symbol: string, monthsBack = 3): Promise<{ date: string; close: number }[]> {
  try {
    const man = await fetchJson<{ availableMonths?: string[] }>(`${BASE_URL}/ltp/manifest.json`)
    const months = (man?.availableMonths ?? []).slice(-monthsBack)
    const sym = symbol.toUpperCase()
    const files = await Promise.all(
      months.map(async m => {
        const d = await fetchJson<{ dates?: (string | number)[]; series?: Record<string, unknown[][]> }>(
          `${BASE_URL}/ltp/monthly/${m}.json`,
        )
        return d ? { month: m, d } : null
      }),
    )
    const pts: { date: string; close: number }[] = []
    for (const f of files) {
      if (!f) continue
      const dates = f.d.dates ?? []
      const rows = f.d.series?.[sym] ?? []
      for (const r of rows) {
        const day = String(dates[Number(r[0])] ?? '')
        const close = Number(r[1] ?? 0)
        if (!day || !(close > 0)) continue
        pts.push({ date: /^\d{4}-/.test(day) ? day : `${f.month}-${day.padStart(2, '0')}`, close })
      }
    }
    return pts.sort((a, b) => (a.date < b.date ? -1 : 1))
  } catch {
    return []
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
          email: String(r.email ?? '') || undefined,
          phone: String(r.phone ?? '') || undefined,
          contact_person: String(r.contact_person ?? '') || undefined,
          address: String(r.address ?? '') || undefined,
          status: String(r.status ?? '') || undefined,
        })),
    )
  }
  return profileCache
}

const numOrNull = (v: unknown): number | null => {
  const n = Number(v)
  return v == null || v === '' || Number.isNaN(n) ? null : n
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
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return n.toLocaleString()
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
