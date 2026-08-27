import type { NepseStock, NepseCompanyProfile, NepseCompanyFinancial, NepseMarketSummary, NepseData } from './types'

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
  return fetchJson<NepseMarketSummary>(`${BASE_URL}/market/summary.json`)
}

export async function fetchNepseTopStocks(): Promise<{ topGainers: NepseStock[]; topLosers: NepseStock[] } | null> {
  return fetchJson(`${BASE_URL}/market/top_stocks.json`)
}

export async function fetchNepseCompanyProfiles(): Promise<NepseCompanyProfile[]> {
  const data = await fetchJson<NepseCompanyProfile[]>(`${BASE_URL}/company/profiles.json`)
  return data ?? []
}

export async function fetchNepseCompanyFinancials(): Promise<NepseCompanyFinancial[]> {
  const data = await fetchJson<NepseCompanyFinancial[]>(`${BASE_URL}/company/financials.json`)
  return data ?? []
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
  const n = Number(amount)
  if (amount == null || Number.isNaN(n)) return '—'
  if (n >= 1e12) return `NPR ${(n / 1e12).toFixed(2)}T`
  if (n >= 1e9) return `NPR ${(n / 1e9).toFixed(1)}B`
  if (n >= 1e7) return `NPR ${(n / 1e7).toFixed(0)}Cr`
  if (n >= 1e5) return `NPR ${(n / 1e5).toFixed(1)}L`
  return `NPR ${n.toLocaleString()}`
}

export function formatNumber(num: unknown): string {
  const n = Number(num)
  if (num == null || Number.isNaN(n)) return '—'
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
