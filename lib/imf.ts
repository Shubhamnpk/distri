// IMF World Economic Outlook series for Nepal (history + projections).
//
// Primary in prod: IMF DataMapper (lib/api.ts:fetchImf). Its host is
// Akamai-filtered from some networks (403) and is awkward from the browser,
// so this module provides a fallback via the DBnomics WEO mirror
// (api.db.nomics.world) — same IMF dataset, CORS-open, reachable everywhere.
//
// DBnomics is *versioned by WEO release* (e.g. WEO:2025-04), so we discover the
// newest release at runtime and fall back to date-derived candidates.

import type { WbDataPoint } from './api'

export const IMF_WEO_INDICATORS = {
  imfGdpGrowth: 'NGDP_RPCH',      // real GDP, % change
  imfNominalGdp: 'NGDPD',         // GDP, current US$
  imfGdpPerCapita: 'NGDPDPC',     // GDP per capita, current US$
  imfGdpPpp: 'PPPGDP',            // GDP, PPP (int$)
  imfPppPerCapita: 'PPPPC',       // GDP per capita, PPP (int$)
  imfInflation: 'PCPIPCH',        // inflation, average consumer prices, %
  imfUnemployment: 'LUR',         // unemployment rate (Nepal: NA on this mirror; DataMapper fills in prod)
  imfCurrentAccount: 'BCA_NGDPD', // current account balance, % of GDP
  imfInvestment: 'NID_NGDP',      // total investment, % of GDP
  imfGovtRevenue: 'GGR_NGDP',     // general government revenue, % of GDP
  imfGovtExpenditure: 'GGX_NGDP', // general government expenditure, % of GDP
  imfFiscalBalance: 'GGXCNL_NGDP',// net lending/borrowing, % of GDP
  imfGovtDebt: 'GGXWDN_NGDP',     // net debt (Nepal reports gross only; DataMapper fills in prod)
  imfGrossDebt: 'GGXWDG_NGDP',    // general government gross debt, % of GDP
} as const

export type ImfSeriesKey = keyof typeof IMF_WEO_INDICATORS
export type ImfSeries = Partial<Record<ImfSeriesKey, WbDataPoint[]>>

const DBNOMICS = 'https://api.db.nomics.world/v22'
const DAY = 86400

type DbDoc = { period?: unknown[]; value?: unknown[] }

function toPoints(doc: DbDoc | undefined): WbDataPoint[] {
  const period = doc?.period ?? []
  const value = doc?.value ?? []
  const pts: WbDataPoint[] = []
  for (let i = 0; i < Math.min(period.length, value.length); i++) {
    const year = String(period[i])
    // Some series come back as strings ("NA" gaps, stringified numbers).
    const raw = value[i]
    const num = typeof raw === 'number' ? raw
      : typeof raw === 'string' && raw.trim() && raw.trim().toUpperCase() !== 'NA' ? Number(raw)
      : NaN
    if (/^\d{4}$/.test(year) && Number.isFinite(num)) pts.push({ year, value: num })
  }
  return pts.sort((a, b) => Number(a.year) - Number(b.year))
}

async function dbn<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { next: { revalidate: DAY } })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** The mirror occasionally rate-limits parallel calls (empty/404); one retry covers it. */
async function seriesOnce(version: string, code: string): Promise<WbDataPoint[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const json = await dbn<{ series?: { docs?: DbDoc[] } }>(
      `${DBNOMICS}/series/IMF/WEO:${version}/NPL.${code}?observations=1`,
    )
    const pts = toPoints(json?.series?.docs?.[0])
    if (pts.length) return pts
    if (attempt === 0) await new Promise(r => setTimeout(r, 350))
  }
  return []
}

/** Newest WEO release DBnomics has, e.g. "2025-04". */
async function resolveWeoVersion(): Promise<string | null> {
  const search = await dbn<{ results?: { docs?: { provider_code?: string; code?: string }[] } }>(
    `${DBNOMICS}/search?q=NGDP_RPCH&limit=100`,
  )
  const codes = (search?.results?.docs ?? [])
    .filter(d => d.provider_code === 'IMF' && typeof d.code === 'string' && d.code.startsWith('WEO:'))
    .map(d => d.code as string)
  if (codes.length) return codes.sort().at(-1)!.slice(4)

  // Fallback: recent releases by date, newest first.
  const y = new Date().getFullYear()
  for (let yr = y; yr >= y - 3; yr--) {
    for (const rel of ['10', '04']) {
      const v = `${yr}-${rel}`
      const probe = await dbn(`${DBNOMICS}/series/IMF/WEO:${v}/NPL.NGDP_RPCH?observations=1`)
      if (probe) return v
    }
  }
  return null
}

export type ImfResult = { version: string | null; series: ImfSeries }

/** Nepal WEO series (history + projections to ~5 years out), or empty on total failure. */
export async function fetchImfSeries(): Promise<ImfResult> {
  const version = await resolveWeoVersion()
  if (!version) return { version: null, series: {} }

  const keys = Object.keys(IMF_WEO_INDICATORS) as ImfSeriesKey[]
  const series: ImfSeries = {}
  // Sequential: the mirror throttles bursts of parallel calls. Cached 24h anyway.
  for (const key of keys) {
    const pts = await seriesOnce(version, IMF_WEO_INDICATORS[key])
    if (pts.length) series[key] = pts
  }
  return { version, series }
}
