// Naxa Hydropower Portal - open JSON APIs (Niti Foundation / Naxa data behind opennepal.net).
// No key, tiny payloads, safe for client + server use.
// Verified live: /api/district/ (77 districts), /api/gapanapa/ (municipalities),
// /static/assets/data/hydro.js (GeoJSON project points: name, MW, river, commissioned year).

const NAXA_BASE = 'https://hydro.naxa.com.np'

const COMMON_HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  Accept: 'application/json',
}

export type NaxaDistrict = {
  name: string
  province: string // e.g. "Province 4"
}

export type NaxaMunicipality = {
  name: string
  district: string
  province: string
}

export type NaxaHydroProject = {
  name: string
  mw: number
  river: string
  startYear: string
  lat: number
  lng: number
}

async function fetchNaxaJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${NAXA_BASE}${path}`, {
      headers: COMMON_HEADERS,
      next: { revalidate: 86400 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 77 districts with province mapping. */
export async function fetchNaxaDistricts(): Promise<NaxaDistrict[]> {
  const data = await fetchNaxaJson<NaxaDistrict[]>('/api/district/')
  return Array.isArray(data) ? data : []
}

/** Municipalities with district + province mapping. */
export async function fetchNaxaMunicipalities(): Promise<NaxaMunicipality[]> {
  const data = await fetchNaxaJson<NaxaMunicipality[]>('/api/gapanapa/')
  return Array.isArray(data) ? data : []
}

type HydroGeoJson = {
  type: string
  features: {
    geometry: { coordinates: [number, number] }
    properties: {
      name?: string
      proj_size?: number
      river?: string
      start_date?: string | number
    }
  }[]
}

/** Project points published as a static GeoJSON JS file (`var hydro = {...}`). */
let hydroCache: Promise<NaxaHydroProject[]> | null = null
export async function fetchNaxaHydroProjects(): Promise<NaxaHydroProject[]> {
  if (!hydroCache) {
    hydroCache = (async () => {
  try {
    const res = await fetch(`${NAXA_BASE}/static/assets/data/hydro.js`, {
      headers: { ...COMMON_HEADERS, Accept: 'application/javascript' },
      next: { revalidate: 86400 },
    })
    if (!res.ok) return []
    const text = await res.text()
    const jsonText = text.replace(/^\s*var\s+hydro\s*=\s*/, '').trim()
    const geo = JSON.parse(jsonText) as HydroGeoJson
    if (!geo || !Array.isArray(geo.features)) return []
    return geo.features
      .filter(f => f?.properties?.name && Array.isArray(f?.geometry?.coordinates))
      .map(f => ({
        name: String(f.properties.name),
        mw: Number(f.properties.proj_size ?? 0),
        river: String(f.properties.river ?? '-'),
        startYear: String(f.properties.start_date ?? '-'),
        lng: Number(f.geometry.coordinates[0]),
        lat: Number(f.geometry.coordinates[1]),
      }))
  } catch {
    return []
  }
    })()
  }
  return hydroCache
}

/** "Province 4" → 4 (for joining with app province names where possible). */
export function naxaProvinceNumber(label: string): number | null {
  const m = label.match(/province\s*(\d+)/i)
  return m ? Number(m[1]) : null
}
