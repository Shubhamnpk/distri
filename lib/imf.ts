// IMF World Economic Outlook series for Nepal (history + projections).
//
// Primary: the IMF SDMX API (api.imf.org). The generic `WEO` dataflow is the
// same live dataset behind the DataMapper chart — including the newest
// October vintage, which the DBnomics mirror does not ingest. The legacy
// DataMapper host (www.imf.org/external/datamapper) is Akamai-filtered from
// many networks (403); api.imf.org is not.
//
// Fallback: the DBnomics WEO mirror (api.db.nomics.world), which is versioned
// by release (e.g. WEO:2025-04) and typically lags one or two vintages.

import type { WbDataPoint } from './api'

export const IMF_WEO_INDICATORS = {
  imfGdpGrowth: 'NGDP_RPCH',      // real GDP, % change
  imfNominalGdp: 'NGDPD',         // GDP, current US$
  imfGdpPerCapita: 'NGDPDPC',     // GDP per capita, current US$
  imfGdpPpp: 'PPPGDP',            // GDP, PPP (int$)
  imfPppPerCapita: 'PPPPC',       // GDP per capita, PPP (int$)
  imfInflation: 'PCPIPCH',        // inflation, average consumer prices, %
  imfUnemployment: 'LUR',         // unemployment rate (not in the WEO SDMX extract; DataMapper fills in prod)
  imfCurrentAccount: 'BCA_NGDPD', // current account balance, % of GDP
  imfInvestment: 'NID_NGDP',      // total investment, % of GDP
  imfGovtRevenue: 'GGR_NGDP',     // general government revenue, % of GDP
  imfGovtExpenditure: 'GGX_NGDP', // general government expenditure, % of GDP
  imfFiscalBalance: 'GGXCNL_NGDP',// net lending/borrowing, % of GDP
  imfGovtDebt: 'GGXWDN_NGDP',     // net debt (not in the WEO SDMX extract; DataMapper fills in prod)
  imfGrossDebt: 'GGXWDG_NGDP',    // general government gross debt, % of GDP
} as const

export type ImfSeriesKey = keyof typeof IMF_WEO_INDICATORS
export type ImfSeries = Partial<Record<ImfSeriesKey, WbDataPoint[]>>

const SDMX_FLOW = 'https://api.imf.org/external/sdmx/2.1/data/IMF.RES,WEO,9.0.0'
const DBNOMICS = 'https://api.db.nomics.world/v22'
const DAY = 86400

/** Compact SDMX-ML → chronological points. `Obs` order in the response is the time dimension. */
function parseSdmx(xml: string): WbDataPoint[] {
  const pts: WbDataPoint[] = []
  const re = /<Obs\b([^>]*?)\/?>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const year = /TIME_PERIOD="(\d{4})"/.exec(m[1])?.[1]
    const value = /OBS_VALUE="([^"]+)"/.exec(m[1])?.[1]
    const num = value != null ? Number(value) : NaN
    if (year && Number.isFinite(num)) pts.push({ year, value: num })
  }
  return pts.sort((a, b) => Number(a.year) - Number(b.year))
}

/** The dataset's own publication/update stamp, e.g. "2026-10". */
function sdmxVintage(xml: string): string | null {
  const stamp = /\b(?:UPDATE_DATE|PUBLICATION_DATE)="(\d{4})-(\d{2})/.exec(xml)
  return stamp ? `${stamp[1]}-${stamp[2]}` : null
}

async function sdmxSeries(code: string): Promise<{ pts: WbDataPoint[]; vintage: string | null }> {
  try {
    const res = await fetch(`${SDMX_FLOW}/NPL.${code}.A?startPeriod=1980`, { next: { revalidate: DAY } })
    if (!res.ok) return { pts: [], vintage: null }
    const xml = await res.text()
    return { pts: parseSdmx(xml), vintage: sdmxVintage(xml) }
  } catch {
    return { pts: [], vintage: null }
  }
}

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

export type ImfResult = { version: string | null; vintage: number | null; series: ImfSeries }

/**
 * The WEO payload carries NO per-observation "projection" flag. The IMF
 * convention is release-based: for a WEO dated YYYY-MM, every year < YYYY is
 * historical data (actuals / estimates) and every year >= YYYY is projection.
 */
export function forecastFromVersion(version: string | null): number | null {
  const year = Number(version?.slice(0, 4))
  return Number.isInteger(year) && year > 1900 ? year : null
}

/** Nepal WEO series (history + projections to ~2031), or empty on total failure. */
export async function fetchImfSeries(): Promise<ImfResult> {
  const keys = Object.keys(IMF_WEO_INDICATORS) as ImfSeriesKey[]
  const series: ImfSeries = {}
  let version: string | null = null

  const results = await Promise.all(keys.map(async key => ({ key, ...(await sdmxSeries(IMF_WEO_INDICATORS[key])) })))
  for (const { key, pts, vintage } of results) {
    if (pts.length) series[key] = pts
    if (vintage && !version) version = vintage
  }
  if (Object.keys(series).length) {
    return { version, vintage: forecastFromVersion(version), series }
  }

  // SDMX unreachable — fall back to the (older) DBnomics mirror.
  version = await resolveWeoVersion()
  if (!version) return { version: null, vintage: null, series: {} }
  for (const key of keys) {
    const pts = await seriesOnce(version, IMF_WEO_INDICATORS[key])
    if (pts.length) series[key] = pts
  }
  return { version, vintage: forecastFromVersion(version), series }
}
