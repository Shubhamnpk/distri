// BIPAD portal (NDRRMA) - official disaster-risk API, keyless, paginated DRF shape.
// https://bipadportal.gov.np/api/v1/ - ~150 resources. Verified live 2026-10-13.
// Shape: { count, next, previous, results[] }. Supports ?limit=&offset=.

const BIPAD_BASE = 'https://bipadportal.gov.np/api/v1'

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchBipad<T>(path: string, limit = 10): Promise<{ count: number; results: T[] }> {
  try {
    const res = await fetch(`${BIPAD_BASE}${path}?limit=${limit}`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return { count: 0, results: [] }
    const json = await res.json()
    return { count: typeof json?.count === 'number' ? json.count : (json?.results?.length ?? 0), results: json?.results ?? [] }
  } catch {
    return { count: 0, results: [] }
  }
}

export type BipadIncident = {
  id: number
  title: string
  titleNe?: string
  point?: { type: string; coordinates: [number, number] }
  createdOn?: string
  modifiedOn?: string
  [key: string]: unknown
}

export type BipadAlert = {
  id: number
  title: string
  point?: { type: string; coordinates: [number, number] }
  createdOn?: string
  affectedDemography?: { maleCount: number; femaleCount: number; householdCount: number }
  [key: string]: unknown
}

export type BipadQuake = {
  id: number
  title?: string
  point?: { type: string; coordinates: [number, number] }
  magnitude?: number
  createdOn?: string
  [key: string]: unknown
}

/** Recent disaster incidents (fire, flood, landslide…) with coords + wards. */
export async function fetchBipadIncidents(limit = 10) {
  return fetchBipad<BipadIncident>('/incident/', limit)
}

/** Active warnings (flood water-level, pollution…) with affected demography. */
export async function fetchBipadAlerts(limit = 10) {
  return fetchBipad<BipadAlert>('/alert/', limit)
}

/** Earthquake feed (mirrors NEMRC-style station telemetry). */
export async function fetchBipadEarthquakes(limit = 10) {
  return fetchBipad<BipadQuake>('/earthquake/', limit)
}

/** Recorded losses (people + infrastructure) - accountability-grade aggregates. */
export async function fetchBipadLosses(limit = 10) {
  return fetchBipad<Record<string, unknown>>('/loss/', limit)
}

/** DRR projects inventory (who is building resilience, where). */
export async function fetchBipadProjects(limit = 10) {
  return fetchBipad<Record<string, unknown>>('/project/', limit)
}

/** Realtime telemetry mirrors: rain/river stations (minute-hourly freshness). */
export async function fetchBipadRainStations(limit = 50) {
  return fetchBipad<Record<string, unknown>>('/rain-stations/', limit)
}

export async function fetchBipadRiverStations(limit = 50) {
  return fetchBipad<Record<string, unknown>>('/river-stations/', limit)
}

/** Canonical admin geo backbone (province/district/municipality/ward) with bboxes + EN/NE names. */
export async function fetchBipadGeo(level: 'province' | 'district' | 'municipality' | 'ward', limit = 100) {
  return fetchBipad<Record<string, unknown>>(`/${level}/`, limit)
}
