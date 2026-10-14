import type { WbDataPoint } from './api'

// Nepal Rastra Bank — official FOREX API (no key, documented at nrb.org.np/api-docs-v1).
// Base: https://www.nrb.org.np/api/forex/v1/rates?from=Y-m-d&to=Y-m-d&page=1&per_page=100
// Verified live: status.code 200, data.payload[] with { date, rates[] }.
// rates[].buy/sell arrive as strings; currency.iso3 is uppercase in payload.

const NRB_FOREX_BASE = 'https://www.nrb.org.np/api/forex/v1/rates'

export type NrbForexRate = {
  iso3: string
  name: string
  unit: number
  buy: number
  sell: number
}

export type NrbForexDay = {
  date: string
  publishedOn: string
  rates: NrbForexRate[]
}

type NrbForexResponse = {
  status?: { code?: number }
  data?: {
    payload?: {
      date?: string
      published_on?: string
      rates?: {
        currency?: { iso3?: string; name?: string; unit?: number }
        buy?: string | number
        sell?: string | number
      }[]
    }[]
  }
}

async function fetchNrbForex(from: string, to: string, perPage = 30): Promise<NrbForexDay[]> {
  try {
    const url = `${NRB_FOREX_BASE}?from=${from}&to=${to}&page=1&per_page=${perPage}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0', Accept: 'application/json' },
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const json = (await res.json()) as NrbForexResponse
    if (json?.status?.code !== 200) return []
    const payload = json?.data?.payload
    if (!payload) return []
    return payload.map(d => ({
      date: d.date ?? '',
      publishedOn: d.published_on ?? '',
      rates: (d.rates ?? []).map(r => ({
        iso3: String(r.currency?.iso3 ?? '').toUpperCase(),
        name: String(r.currency?.name ?? ''),
        unit: Number(r.currency?.unit ?? 1) || 1,
        buy: Number(r.buy ?? 0),
        sell: Number(r.sell ?? 0),
      })),
    }))
  } catch {
    return []
  }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Latest published USD→NPR mid-rate from NRB (authoritative, replaces scraped/CDN guesses). */
export async function getNrbUsdRate(): Promise<number | null> {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 86400_000)
  const days = await fetchNrbForex(toISODate(weekAgo), toISODate(today), 10)
  for (let i = days.length - 1; i >= 0; i--) {
    const usd = days[i].rates.find(r => r.iso3 === 'USD')
    if (usd && usd.buy > 0 && usd.sell > 0) return (usd.buy + usd.sell) / 2 / usd.unit
  }
  return null
}

/** Full latest-day forex table (for a rates strip / economy panel). */
export async function fetchLatestForex(): Promise<NrbForexDay | null> {
  const today = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 86400_000)
  const days = await fetchNrbForex(toISODate(weekAgo), toISODate(today), 10)
  return days.length ? days[days.length - 1] : null
}

/** USD/NPR daily series as chart-ready points (mid-rate). */
export async function fetchUsdNprSeries(days = 30): Promise<WbDataPoint[]> {
  const today = new Date()
  const start = new Date(today.getTime() - days * 86400_000)
  const payload = await fetchNrbForex(toISODate(start), toISODate(today), Math.min(days, 100))
  return payload
    .map((d): WbDataPoint | null => {
      const usd = d.rates.find(r => r.iso3 === 'USD')
      if (!usd || usd.buy <= 0) return null
      return { year: d.date, value: (usd.buy + usd.sell) / 2 / usd.unit }
    })
    .filter((d): d is WbDataPoint => d !== null)
}
