// WHO Global Health Observatory - OData API, keyless, server-side NPL filter.
// https://ghoapi.azureedge.net/api/<CODE>?$filter=SpatialDim eq 'NPL'&$top=N
// Verified live 2026-10-13 (WHOSIS_000001 life expectancy: NPL 2022 → 71.4).
// Notes: dimension field is SpatialDim (not SpatialDimension); values carry
// NumericValue + uncertainty strings - always use NumericValue. Unfiltered value
// dumps are huge: always pass $filter + $top.

import type { WbDataPoint } from './api'

const GHO_BASE = 'https://ghoapi.azureedge.net/api'

type GhoValue = {
  TimeDim?: number
  NumericValue?: number | null
  Dim1?: string | null
  SpatialDim?: string
}

type GhoResponse = { value?: GhoValue[] }

/** Indicator time-series for Nepal. Defaults to both-sexes rows (SEX_BTSX) where present. */
export async function fetchWhoNpl(indicator: string, top = 30): Promise<WbDataPoint[]> {
  try {
    const url = `${GHO_BASE}/${indicator}?$filter=SpatialDim%20eq%20%27NPL%27&$top=${top}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const json = (await res.json()) as GhoResponse
    const rows = (json?.value ?? []).filter(
      r => r.SpatialDim === 'NPL' && typeof r.NumericValue === 'number' && (r.Dim1 === 'SEX_BTSX' || r.Dim1 == null),
    )
    return rows
      .map(r => ({ year: String(r.TimeDim ?? ''), value: r.NumericValue as number }))
      .filter(d => d.year)
      .sort((a, b) => Number(a.year) - Number(b.year))
  } catch {
    return []
  }
}

/** Indicator catalogue search (to discover GHO codes, e.g. 'tuberculosis'). */
export async function searchWhoIndicators(query: string, top = 10): Promise<{ IndicatorCode: string; IndicatorName: string }[]> {
  try {
    const url = `${GHO_BASE}/Indicator?$filter=contains(IndicatorName,%27${encodeURIComponent(query)}%27)&$top=${top}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return json?.value ?? []
  } catch {
    return []
  }
}

// Commonly used GHO codes for Nepal (verify via searchWhoIndicators before charting new ones)
export const WHO_CODES = {
  LIFE_EXPECTANCY: 'WHOSIS_000001',
  LIFE_EXPECTANCY_HEALTHY: 'WHOSIS_000002',
  TB_INCIDENCE: 'TB_e_inc_100k',
  TOBACCO_ADULT: 'MOH_TOBACCO_PREV',
} as const
