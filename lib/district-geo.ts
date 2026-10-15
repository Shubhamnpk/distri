// District geography for the national atlas.
// - Centroids + bboxes: BIPAD DRR API (tiny, keyless, verified live).
// - Polygons: DataNepal place_boundaries.json (859 rows, ~1.5MB, keyless) —
//   geometry_geojson is a STRING per row; parsed client-side once and cached.
// Joined by normalized district name; districts without a matched polygon
// still work via centroid markers (never drop a district for geometry reasons).

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  Accept: 'application/json',
}

/** fetch that gives up instead of hanging forever (stalled hosts = blank map). */
async function fetchWithTimeout(url: string, ms = 12000, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...init, signal: ctrl.signal })
  } finally {
    clearTimeout(t)
  }
}

export const PROVINCE_NUM_TO_NAME: Record<number, string> = {
  1: 'Koshi',
  2: 'Madhesh',
  3: 'Bagmati',
  4: 'Gandaki',
  5: 'Lumbini',
  6: 'Karnali',
  7: 'Sudurpashchim',
}

export type BipadDistrict = {
  id: number
  name: string
  province: string
  lat: number
  lon: number
  bbox: [number, number, number, number] | null // [minLon, minLat, maxLon, maxLat]
}

type BipadDistrictRow = {
  id?: number
  title_en?: string
  title?: string
  province?: number
  centroid?: { coordinates?: [number, number] }
  bbox?: [number, number, number, number]
}

export async function fetchBipadDistricts(): Promise<BipadDistrict[]> {
  if (!districtCache) {
    districtCache = (async () => {
      const out: BipadDistrict[] = []
  let url: string | null = 'https://bipadportal.gov.np/api/v1/district/?limit=100'
  try {
    while (url) {
      const res: Response = await fetchWithTimeout(url, 12000, { headers: HEADERS, next: { revalidate: 86400 } })
      if (!res.ok) break
      const json: any = await res.json()
      const rows: BipadDistrictRow[] = json?.results ?? []
      for (const r of rows) {
        const [lon, lat] = r.centroid?.coordinates ?? []
        if (typeof lat !== 'number' || typeof lon !== 'number') continue
        out.push({
          id: Number(r.id ?? 0),
          name: String(r.title_en ?? r.title ?? ''),
          province: PROVINCE_NUM_TO_NAME[Number(r.province)] ?? '',
          lat,
          lon,
          bbox: Array.isArray(r.bbox) && r.bbox.length === 4 ? (r.bbox as [number, number, number, number]) : null,
        })
      }
      url = json?.next ?? null
      if (out.length > 200) break
    }
  } catch {
    // partial list still usable
  }
  return out.filter(d => d.name && d.province)
    })()
  }
  return districtCache
}

let districtCache: Promise<BipadDistrict[]> | null = null

export function normName(s: string): string {
  return s.toLowerCase().replace(/[^a-z]/g, '')
}

type BoundaryRow = {
  admin_level?: number
  name_en?: string
  geometry_geojson?: string
}

export type DistrictPolygons = {
  /** GeoJSON FeatureCollection of matched district polygons */
  geojson: { type: string; features: Record<string, unknown>[] }
  /** district name → matched (for diagnostics) */
  matched: string[]
  unmatched: string[]
  /** district name → province (from DataNepal parent's sibling rows is unreliable — caller joins via BIPAD) */
  byName: Record<string, Record<string, unknown>>
}

let polyCache: Promise<DistrictPolygons> | null = null
/** All district polygons, keyed for name-joining. One 1.5MB download, cached. */
export function fetchDistrictPolygons(): Promise<DistrictPolygons> {
  if (!polyCache) {
    polyCache = (async () => {
      const empty: DistrictPolygons = { geojson: { type: 'FeatureCollection', features: [] }, matched: [], unmatched: [], byName: {} }
      try {
        const res = await fetch('https://datanepal.org/data/place_boundaries.json', {
          headers: HEADERS,
          next: { revalidate: 86400 },
        })
        if (!res.ok) return empty
        const rows = (await res.json()) as BoundaryRow[]
        const features: Record<string, unknown>[] = []
        const byName: Record<string, Record<string, unknown>> = {}
        for (const r of rows) {
          if (Number(r.admin_level) !== 2 || !r.name_en || !r.geometry_geojson) continue
          try {
            const geom = JSON.parse(r.geometry_geojson) as Record<string, unknown>
            if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue
            const feat = { type: 'Feature', properties: { name: r.name_en }, geometry: geom }
            features.push(feat)
            byName[normName(r.name_en)] = feat
          } catch {
            // skip malformed geometry, keep the district usable via centroid
          }
        }
        return { geojson: { type: 'FeatureCollection', features }, matched: [], unmatched: [], byName }
      } catch {
        return empty
      }
    })()
  }
  return polyCache
}

/** Fallback districts derived from bundled polygons when the API is unreachable:
 *  bbox is exact (from geometry), centroid is the bbox center — good enough
 *  for pins, zoom and filtering. Drill-down never depends on the network. */
export function districtsFromPolygons(local: LocalDistrict[]): BipadDistrict[] {
  return local.map((d, i) => {
    const geom = d.feature.geometry as { type?: string; coordinates?: number[][][] | number[][][][] } | undefined
    const rings: number[][][] = []
    if (geom?.type === 'Polygon') rings.push(...(geom.coordinates as number[][][]))
    else if (geom?.type === 'MultiPolygon') {
      for (const poly of geom.coordinates as number[][][][]) {
        let biggest = poly[0] ?? []
        for (const ring of poly) if (ring.length > biggest.length) biggest = ring
        rings.push(biggest)
      }
    }
    const pts = rings.flat()
    const lons = pts.map(p => p[0])
    const lats = pts.map(p => p[1])
    const bbox: [number, number, number, number] | null =
      lons.length ? [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)] : null
    return {
      id: 1000 + i,
      name: d.name,
      province: d.province,
      lat: bbox ? (bbox[1] + bbox[3]) / 2 : 28.4,
      lon: bbox ? (bbox[0] + bbox[2]) / 2 : 84.2,
      bbox,
    }
  })
}
export function provinceBbox(districts: BipadDistrict[]): [[number, number], [number, number]] | null {
  const boxes = districts.map(d => d.bbox).filter((b): b is [number, number, number, number] => !!b)
  if (!boxes.length) return null
  return [
    [Math.min(...boxes.map(b => b[1])), Math.min(...boxes.map(b => b[0]))],
    [Math.max(...boxes.map(b => b[3])), Math.max(...boxes.map(b => b[2]))],
  ]
}

export type LocalDistrict = {
  /** Title-case display name, e.g. "Panchthar" */
  name: string
  /** District headquarters, e.g. "Phidim" */
  hq: string
  /** App province display name */
  province: string
  feature: Record<string, unknown>
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

let localCache: Map<number, Promise<LocalDistrict[]>> | null = null

/** Districts of ONE province from its bundled shard (`/public/geo/districts/<n>.geojson`,
 *  76–226KB). Fetched only when the province is opened, cached per province —
 *  never re-downloaded while navigating. */
export function fetchLocalDistricts(provinceNum: number): Promise<LocalDistrict[]> {
  if (!localCache) localCache = new Map()
  const hit = localCache.get(provinceNum)
  if (hit) return hit
  const p = (async () => {
    try {
      const res = await fetch(`/geo/districts/${provinceNum}.geojson`, { next: { revalidate: 86400 } })
      if (!res.ok) return []
      const json = await res.json()
      const feats: { properties?: { DISTRICT?: string; HQ?: string; PROVINCE?: number }; geometry?: { type?: string } }[] =
        json?.features ?? []
      return feats
        .filter(f => f?.properties?.DISTRICT && (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
        .map(f => ({
          name: titleCase(String(f.properties!.DISTRICT)),
          hq: titleCase(String(f.properties!.HQ ?? '')),
          province: PROVINCE_NUM_TO_NAME[Number(f.properties!.PROVINCE)] ?? '',
          feature: { type: 'Feature', properties: { name: titleCase(String(f.properties!.DISTRICT)) }, geometry: f.geometry },
        }))
        .filter(d => d.name && d.province)
    } catch {
      return []
    }
  })()
  localCache.set(provinceNum, p)
  return p
}
