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

let provinceCache: Promise<{ type: string; features: Record<string, unknown>[] }> | null = null

/** All 7 province outlines from the okfnepal shards
 *  (`/public/geo/provinces/<slug>.geojson`, ~300-575KB each) — same source as
 *  districts + municipalities, so every layer aligns. Properties normalized to
 *  `{ id: <1-7>, name: <app name> }` to match existing numeric-id consumers.
 *  Fetched once in parallel, cached. */
export function fetchProvinceShapes(): Promise<{ type: string; features: Record<string, unknown>[] }> {
  if (!provinceCache) {
    provinceCache = (async () => {
      const empty = { type: 'FeatureCollection', features: [] as Record<string, unknown>[] }
      try {
        const slugs = ['koshi', 'madhesh', 'bagmati', 'gandaki', 'lumbini', 'karnali', 'sudurpashchim']
        const parts = await Promise.all(
          slugs.map(s => fetch(`/geo/provinces/${s}.geojson`, { next: { revalidate: 86400 } }).then(r => (r.ok ? r.json() : null)).catch(() => null)),
        )
        const features: Record<string, unknown>[] = []
        for (const part of parts) {
          const feats: { properties?: { PROVINCE?: number; PR_NAME?: string }; geometry?: { type?: string } }[] = part?.features ?? []
          for (const f of feats) {
            const num = Number(f?.properties?.PROVINCE)
            if (!num || (f.geometry?.type !== 'Polygon' && f.geometry?.type !== 'MultiPolygon')) continue
            features.push({
              type: 'Feature',
              properties: { id: num, name: PROVINCE_NUM_TO_NAME[num] ?? String(f.properties?.PR_NAME ?? '') },
              geometry: f.geometry,
            })
          }
        }
        return features.length ? { type: 'FeatureCollection', features } : empty
      } catch {
        return empty
      }
    })()
  }
  return provinceCache
}

let localCache: Map<number, Promise<LocalDistrict[]>> | null = null

/** Municipalities (palikas) of ONE province from its bundled shard
 *  (`/public/geo/municipalities/<slug>.geojson`, 0.8–1.2MB, from
 *  openknowledgenp/localboundaries on GitHub). Fetched only when a district is
 *  opened, cached per province — never re-downloaded while navigating. */
export type LocalMunicipality = {
  /** Display name, e.g. "Dudhouli" */
  name: string
  /** Municipality type: Nagarpalika | Gaunpalika | Mahanagarpalika | Upamahanagarpalika */
  type: string
  /** Normalized app district key (normName'd), e.g. "sindhuli" */
  district: string
  feature: Record<string, unknown>
}

// Every source spells a few districts differently (BIPAD "Chitwan" vs DataNepal
// "Chitawan", okfnepal "MAKAWANPUR" vs "Makwanpur", ...). Canonicalize BOTH
// sides — municipality rows and queried district names — to one key space so
// a selected district always finds its palikas.
const CANON_DISTRICT: Record<string, string> = {
  chitwan: 'chitawan',
  dhanusha: 'dhanusa',
  kabhrepalanchok: 'kavrepalanchok',
  kavrepalanchowk: 'kavrepalanchok',
  makawanpur: 'makwanpur',
  nawalparasie: 'nawalparasieast',
  nawalparasiw: 'nawalparasiwest',
  rukume: 'rukumeast',
  rukumw: 'rukumwest',
  sindhupalchowk: 'sindhupalchok',
}

export function canonDistrictKey(name: string): string {
  const n = normName(name)
  return CANON_DISTRICT[n] ?? n
}

const MUNI_PROVINCE_SLUG: Record<string, string> = {
  Koshi: 'koshi',
  Madhesh: 'madhesh',
  Bagmati: 'bagmati',
  Gandaki: 'gandaki',
  Lumbini: 'lumbini',
  Karnali: 'karnali',
  Sudurpashchim: 'sudurpashchim',
}

type RawLocalFeat = {
  properties?: { DISTRICT?: string; GaPa_NaPa?: string; Type_GN?: string }
  geometry?: { type?: string }
}

const MUNI_TYPES = new Set(['Nagarpalika', 'Gaunpalika', 'Mahanagarpalika', 'Upamahanagarpalika'])
// Everything in the local-boundary shards that is NOT a palika is a protected
// area. The shards carry: National Park, Wildlife Reserve, Watershed and
// Wildlife Reserve, Hunting Reserve, Development Area.
const PROTECTED_TYPES = new Set([
  'National Park',
  'Wildlife Reserve',
  'Wildlife Sanctuary',
  'Watershed and Wildlife Reserve',
  'Hunting Reserve',
  'Conservation Area',
  'Buffer Zone',
  'Development Area',
])

let localRawCache: Map<string, Promise<RawLocalFeat[]>> | null = null

/** Raw local-level features of ONE province shard, shared by the palika +
 *  protected-area fetchers so the file downloads once. */
function fetchProvinceLocalRaw(slug: string): Promise<RawLocalFeat[]> {
  if (!localRawCache) localRawCache = new Map()
  const hit = localRawCache.get(slug)
  if (hit) return hit
  const p = (async () => {
    try {
      const res = await fetch(`/geo/municipalities/${slug}.geojson`, { next: { revalidate: 86400 } })
      if (!res.ok) return []
      const json = await res.json()
      const feats: RawLocalFeat[] = json?.features ?? []
      return feats.filter(f => f?.properties?.DISTRICT && f?.properties?.GaPa_NaPa && (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
    } catch {
      return []
    }
  })()
  localRawCache.set(slug, p)
  return p
}

function toLocalArea(f: RawLocalFeat): LocalMunicipality {
          return {
            name: String(f.properties!.GaPa_NaPa).trim(),
            type: String(f.properties!.Type_GN ?? ''),
            district: canonDistrictKey(String(f.properties!.DISTRICT)),
    feature: {
      type: 'Feature',
      properties: { name: String(f.properties!.GaPa_NaPa).trim(), type: String(f.properties!.Type_GN ?? '') },
      geometry: f.geometry,
    },
  }
}

export function fetchLocalMunicipalities(province: string): Promise<LocalMunicipality[]> {
  const slug = MUNI_PROVINCE_SLUG[province]
  if (!slug) return Promise.resolve([])
  return fetchProvinceLocalRaw(slug).then(feats => feats.filter(f => MUNI_TYPES.has(String(f.properties?.Type_GN ?? ''))).map(toLocalArea))
}

/** National parks, wildlife reserves and conservation areas (same shard —
 *  no extra download). Same LocalMunicipality shape; `type` carries the
 *  protected-area class. */
export function fetchLocalProtected(province: string): Promise<LocalMunicipality[]> {
  const slug = MUNI_PROVINCE_SLUG[province]
  if (!slug) return Promise.resolve([])
  return fetchProvinceLocalRaw(slug).then(feats => feats.filter(f => PROTECTED_TYPES.has(String(f.properties?.Type_GN ?? ''))).map(toLocalArea))
}

/** Municipalities of one district (either side's spelling resolves via the
 *  canonical key, so BIPAD "Chitwan" finds okfnepal "CHITAWAN" rows). */
export function municipalitiesOfDistrict(all: LocalMunicipality[], district: string): LocalMunicipality[] {
  const key = canonDistrictKey(district)
  return all.filter(m => m.district === key)
}

const OKF_PROVINCE_NUM_TO_SLUG: Record<number, string> = {
  1: 'koshi', 2: 'madhesh', 3: 'bagmati', 4: 'gandaki', 5: 'lumbini', 6: 'karnali', 7: 'sudurpashchim',
}

// Old-shard spelling (normName'd) → okfnepal spelling (normName'd), for the HQ join.
const OLD_TO_OKF_DISTRICT: Record<string, string> = {
  chitwan: 'chitawan',
  kavrepalanchowk: 'kabhrepalanchok',
  makwanpur: 'makawanpur',
}

/** Districts of ONE province. Shapes come from the okfnepal district shard
 *  (`/public/geo/districts-okf/<slug>.geojson`) — dissolved from the SAME
 *  municipality boundaries, so district outlines always match palika fills.
 *  HQ names are joined from the legacy bundled shard (`/geo/districts/<n>`,
 *  the only source that carries HQ). Fetched only when the province is
 *  opened, cached per province. */
export function fetchLocalDistricts(provinceNum: number): Promise<LocalDistrict[]> {
  if (!localCache) localCache = new Map()
  const hit = localCache.get(provinceNum)
  if (hit) return hit
  const p = (async () => {
    try {
      const slug = OKF_PROVINCE_NUM_TO_SLUG[provinceNum]
      const [okfRes, oldRes] = await Promise.all([
        fetch(`/geo/districts-okf/${slug}.geojson`, { next: { revalidate: 86400 } }),
        fetch(`/geo/districts/${provinceNum}.geojson`, { next: { revalidate: 86400 } }),
      ])
      // HQ lookup from the legacy shard (okfnepal files carry no HQ field).
      const hqByNorm: Record<string, string> = {}
      try {
        if (oldRes.ok) {
          const oldJson = await oldRes.json()
          const oldFeats: { properties?: { DISTRICT?: string; HQ?: string } }[] = oldJson?.features ?? []
          for (const f of oldFeats) {
            if (!f?.properties?.DISTRICT) continue
            const key = OLD_TO_OKF_DISTRICT[normName(String(f.properties.DISTRICT))] ?? normName(String(f.properties.DISTRICT))
            hqByNorm[key] = titleCase(String(f.properties.HQ ?? ''))
          }
        }
      } catch {
        // HQ tooltips degrade to blank — shapes still render
      }
      if (!okfRes.ok) return []
      const json = await okfRes.json()
      const feats: { properties?: { DISTRICT?: string; STATE_CODE?: number }; geometry?: { type?: string } }[] =
        json?.features ?? []
      return feats
        .filter(f => f?.properties?.DISTRICT && (f.geometry?.type === 'Polygon' || f.geometry?.type === 'MultiPolygon'))
        .map(f => {
          const key = normName(String(f.properties!.DISTRICT))
          return {
            name: titleCase(String(f.properties!.DISTRICT)),
            hq: hqByNorm[key] ?? '',
            province: PROVINCE_NUM_TO_NAME[Number(f.properties!.STATE_CODE)] ?? PROVINCE_NUM_TO_NAME[provinceNum] ?? '',
            feature: { type: 'Feature', properties: { name: titleCase(String(f.properties!.DISTRICT)) }, geometry: f.geometry },
          }
        })
        .filter(d => d.name && d.province)
    } catch {
      return []
    }
  })()
  localCache.set(provinceNum, p)
  return p
}
