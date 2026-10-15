// DataNepal.org - open, documented public data for Nepal (MIT code, no key).
// Static JSON downloads, refreshed from primary sources (NSO census 2021,
// UN OCHA boundaries, UNFPA projections, ECN 2026 results, World Bank WDI).
// Verified live: /data/{indicators,places,geography,datasets}.json return arrays.

const DN_BASE = 'https://datanepal.org/data'

export type DataNepalIndicator = {
  indicator_id: string
  dataset_id: string
  topic_id: string
  name_en: string
  definition: string
  default_unit_id: string
  value_type: string
  is_additive: boolean
}

export type DataNepalPlace = {
  place_id: string
  place_type: string
  admin_level: number
  name_en: string
  slug: string
  parent_slug: string | null
  ocha_pcode: string | null
  area_sqkm: number | null
}

export type DataNepalDataset = {
  dataset_id?: string
  title?: string
  [key: string]: unknown
}

async function fetchDnJson<T>(file: string): Promise<T[]> {
  try {
    const res = await fetch(`${DN_BASE}/${file}.json`, {
      headers: { 'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0', Accept: 'application/json' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const json = await res.json()
    return Array.isArray(json) ? (json as T[]) : []
  } catch {
    return []
  }
}

/** 36 curated indicators (population, inflation, economy…) with definitions + units. */
export async function fetchDataNepalIndicators(): Promise<DataNepalIndicator[]> {
  return fetchDnJson<DataNepalIndicator>('indicators')
}

/** 862 places: country → 7 provinces → 77 districts → 753 local units (+ protected areas). */
export async function fetchDataNepalPlaces(): Promise<DataNepalPlace[]> {
  return fetchDnJson<DataNepalPlace>('places')
}

/** 753 local-unit geometries/areas (OCHA COD boundaries). */
export async function fetchDataNepalGeography(): Promise<Record<string, unknown>[]> {
  return fetchDnJson<Record<string, unknown>>('geography')
}

/** Source-dataset registry (NSO census, ECN 2026, WDI…) with licences + provenance. */
export async function fetchDataNepalDatasets(): Promise<DataNepalDataset[]> {
  return fetchDnJson<DataNepalDataset>('datasets')
}

/** Provinces only - handy for map/count filters without loading all 862 places. */
export async function fetchDataNepalProvinces(): Promise<DataNepalPlace[]> {
  const places = await fetchDataNepalPlaces()
  return places.filter(p => p.admin_level === 1)
}
