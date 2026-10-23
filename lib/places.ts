// Place knowledge layer: province > district > palika, with open, key-free
// enrichment sources. Everything here is client-safe (all endpoints send CORS).
//
// Sources
//  - Hierarchy (7 / 77 / 753) is bundled in `lib/geo-constants.ts`.
//  - Area + Nepali names: datanepal.org `places.json` (CC0, CORS `*`).
//  - Census 2021 + palika centroids: BIPAD / NDRRMA `demographic` + `municipality`.
//  - Weather / air quality: Open-Meteo (via `lib/meteo.ts`).
//  - About text, lead image, nearby landmarks: Wikipedia / Wikimedia (CC BY-SA).

import { DISTRICTS, LOCAL_UNITS, PROVINCES, type DistrictDef, type LocalUnitDef, type ProvinceDef } from '@/lib/geo-constants'
import { fetchDataNepalPlaces } from '@/lib/datanepal'
import { fetchBipadDistrictCentroids, fetchBipadPalikaCensus, type PalikaCensus } from '@/lib/bipad'
import { canonDistrictKey, normName } from '@/lib/district-geo'

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  Accept: 'application/json',
}

export const KIND_LABEL: Record<LocalUnitDef['kind'], string> = {
  metropolitan: 'Metropolitan city',
  sub_metropolitan: 'Sub-metropolitan city',
  municipality: 'Municipality',
  rural_municipality: 'Rural municipality',
}

export const KIND_ORDER: LocalUnitDef['kind'][] = ['metropolitan', 'sub_metropolitan', 'municipality', 'rural_municipality']

export function findProvince(slug: string): ProvinceDef | undefined {
  return PROVINCES.find(p => p.slug === slug)
}

export function findProvinceByName(name: string): ProvinceDef | undefined {
  return PROVINCES.find(p => p.name === name)
}

export function findDistrict(slug: string): DistrictDef | undefined {
  return DISTRICTS.find(d => d.slug === slug)
}

export function findPalika(districtName: string, palikaSlug: string): LocalUnitDef | undefined {
  return LOCAL_UNITS.find(u => u.district === districtName && u.slug === palikaSlug)
}

export function districtsOfProvince(province: string): DistrictDef[] {
  return DISTRICTS.filter(d => d.province === province)
}

export function palikasOfDistrict(district: string): LocalUnitDef[] {
  return LOCAL_UNITS.filter(u => u.district === district)
}

export function provinceOfDistrict(district: string): string {
  return DISTRICTS.find(d => d.name === district)?.province ?? ''
}

export type PlaceArea = { areaSqKm: number | null; nameNe: string | null; lat: number | null; lon: number | null; pcode: string | null }
export type PlaceAreas = { provinces: Record<string, PlaceArea>; districts: Record<string, PlaceArea>; palikas: Record<string, PlaceArea> }

/** Key for a palika's DataNepal row (slugs collide across districts, so scope by parent). */
export function palikaKey(district: string, slug: string): string {
  return `${canonDistrictKey(district)}:${slug}`
}

const PALIKA_TYPES = new Set(['metropolitan', 'sub_metropolitan', 'municipality', 'rural_municipality'])

/** Area, Nepali name and centre point from DataNepal, split by admin level.
 *  `places.json` mixes districts (77 current + 2 retired), local units (753, split across
 *  four `place_type`s) and protected areas - several share a slug (Bhaktapur district vs
 *  Bhaktapur municipality), so rows must be filtered and palikas scoped to their parent. */
export async function fetchPlaceAreas(): Promise<PlaceAreas> {
  const places = (await fetchDataNepalPlaces()) as unknown as Array<Record<string, unknown>>
  const out: PlaceAreas = { provinces: {}, districts: {}, palikas: {} }
  for (const p of places) {
    if (p.is_current === false) continue
    const type = String(p.place_type ?? '')
    const slug = String(p.slug ?? '')
    if (!slug) continue
    const rec: PlaceArea = {
      areaSqKm: typeof p.area_sqkm === 'number' ? p.area_sqkm : null,
      nameNe: typeof p.name_ne === 'string' ? p.name_ne : null,
      lat: typeof p.center_lat === 'number' ? p.center_lat : null,
      lon: typeof p.center_lon === 'number' ? p.center_lon : null,
      pcode: typeof p.ocha_pcode === 'string' ? p.ocha_pcode : null,
    }
    if (type === 'province') out.provinces[slug] = rec
    else if (type === 'district') out.districts[slug] = rec
    else if (PALIKA_TYPES.has(type)) out.palikas[palikaKey(String(p.parent_name_en ?? ''), slug)] = rec
  }
  return out
}

export type DistrictGeoMeta = { id: number | null; lat: number | null; lon: number | null }

/** BIPAD district id + centroid, keyed by `canonDistrictKey(district)`.
 *  BIPAD spells several districts differently (Chitwan, Dhanusa, Makwanpur, Kavrepalanchok),
 *  so plain `normName` lookups miss them. */
export async function fetchDistrictGeoMeta(): Promise<Record<string, DistrictGeoMeta>> {
  const { results } = await fetchBipadDistrictCentroids()
  const out: Record<string, DistrictGeoMeta> = {}
  for (const d of results) {
    const name = String(d.title ?? '')
    if (!name) continue
    out[canonDistrictKey(name)] = {
      id: typeof d.id === 'number' ? d.id : null,
      lat: d.centroid?.coordinates?.[1] ?? null,
      lon: d.centroid?.coordinates?.[0] ?? null,
    }
  }
  return out
}

/** Census 2021 rows for every palika of a district, keyed by `normName(name)`. */
export async function fetchDistrictPalikaCensus(districtId: number): Promise<{ year: string; rows: PalikaCensus[]; byName: Record<string, PalikaCensus> }> {
  return fetchBipadPalikaCensus(districtId)
}

/** Transliteration folded for fuzzy matching: ph->f, kh->k, chh/ch->c, th->t, w->v, ee->i, aa->a, ... */
function roughKey(s: string): string {
  return normName(s)
    .replace(/ph/g, 'f').replace(/kh/g, 'k').replace(/chh/g, 'c').replace(/ch/g, 'c')
    .replace(/th/g, 't').replace(/dh/g, 'd').replace(/bh/g, 'b').replace(/gh/g, 'g')
    .replace(/jh/g, 'j').replace(/sh/g, 's').replace(/ee/g, 'i').replace(/oo/g, 'u')
    .replace(/aa/g, 'a').replace(/w/g, 'v').replace(/y/g, 'i').replace(/z/g, 'j')
}

/** Census row for one palika. BIPAD and the boundary file spell names differently
 *  (Gharapjhong/Gharpajhong, Baragung Muktikhsetra/Varagung Muktichhetra, Barah/
 *  Barahachhetra, "Godawari_Kailali"), so fall back through rough-key equality,
 *  first-word matching, then edit distance. */
export function palikaCensusOf(byName: Record<string, PalikaCensus>, name: string): PalikaCensus | undefined {
  const key = normName(name)
  const direct = byName[key]
  if (direct) return direct

  const rough = roughKey(name)
  const entries = Object.entries(byName)
  for (const [k, row] of entries) if (roughKey(k) === rough) return row

  const head = name.split(/[\s-]+/)[0] ?? ''
  if (head && normName(head) !== key) {
    const h = normName(head)
    if (byName[h]) return byName[h]
    const hr = roughKey(head)
    for (const [k, row] of entries) if (roughKey(k) === hr) return row
    const headLimit = hr.length >= 8 ? 2 : 1
    let headBest: PalikaCensus | undefined
    let headDist = headLimit + 1
    for (const [k, row] of entries) {
      const rk = roughKey(k)
      if (Math.abs(rk.length - hr.length) > headLimit) continue
      const d = editDistance(rk, hr)
      if (d <= headLimit && d < headDist) { headDist = d; headBest = row }
    }
    if (headBest) return headBest
  }

  const limit = rough.length >= 10 ? 4 : rough.length >= 7 ? 3 : 2
  let best: PalikaCensus | undefined
  let bestDist = limit + 1
  for (const [k, row] of entries) {
    const rk = roughKey(k)
    const minLen = Math.min(rk.length, rough.length)
    const d = minLen >= 5 && (rk.includes(rough) || rough.includes(rk)) ? 1 : editDistance(rk, rough)
    if (d <= limit && d < bestDist) { bestDist = d; best = row }
  }
  return best
}

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

// ── Weather helpers (Open-Meteo WMO codes) ───────────────────────────────────

/** WMO weather code → short human label (Open-Meteo `weather_code`). */
export function wmoText(code: number | null | undefined): string {
  if (code == null) return 'Unknown'
  if (code === 0) return 'Clear sky'
  if (code === 1) return 'Mainly clear'
  if (code === 2) return 'Partly cloudy'
  if (code === 3) return 'Overcast'
  if (code === 45 || code === 48) return 'Fog'
  if (code >= 51 && code <= 57) return 'Drizzle'
  if (code >= 61 && code <= 67) return 'Rain'
  if (code >= 71 && code <= 77) return 'Snow'
  if (code >= 80 && code <= 82) return 'Rain showers'
  if (code === 85 || code === 86) return 'Snow showers'
  if (code === 95) return 'Thunderstorm'
  if (code === 96 || code === 99) return 'Thunderstorm, hail'
  return 'Unknown'
}

export type DailyForecast = { date: string; max: number | null; min: number | null; code: number | null; rainChance: number | null }

/** 5-day daily forecast straight from Open-Meteo (no key, CORS-open). */
export async function fetchDailyForecast(lat: number, lon: number, days = 5): Promise<DailyForecast[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&forecast_days=${days}&timezone=Asia%2FKathmandu`,
      { headers: HEADERS },
    )
    if (!res.ok) return []
    const d = (await res.json())?.daily
    if (!d?.time) return []
    return (d.time as string[]).map((date, i) => ({
      date,
      max: d.temperature_2m_max?.[i] ?? null,
      min: d.temperature_2m_min?.[i] ?? null,
      code: d.weather_code?.[i] ?? null,
      rainChance: d.precipitation_probability_max?.[i] ?? null,
    }))
  } catch {
    return []
  }
}

// ── Wikipedia ────────────────────────────────────────────────────────────────

export type WikiSummary = {
  title: string
  extract: string
  image: string | null
  url: string
  lat: number | null
  lon: number | null
}

function wikiUrl(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
}

async function wikiSummary(title: string): Promise<WikiSummary | null> {
  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}?redirect=true`, { headers: HEADERS })
    if (!res.ok) return null
    const j = await res.json()
    if (!j || j.type === 'disambiguation' || j.type === 'no-extract' || !j.extract) return null
    return {
      title: j.title ?? title,
      extract: j.extract,
      image: j.thumbnail?.source ?? j.originalimage?.source ?? null,
      url: j.content_urls?.desktop?.page ?? wikiUrl(title),
      lat: j.coordinates?.lat ?? null,
      lon: j.coordinates?.lon ?? null,
    }
  } catch {
    return null
  }
}

/** Resolve a spelling variant to a real article title (e.g. "Chitawan District" -> "Chitwan District"). */
async function wikiSearchTitle(query: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*&srprop=`,
      { headers: HEADERS },
    )
    if (!res.ok) return null
    const j = await res.json()
    const title: string | undefined = j?.query?.search?.[0]?.title
    if (!title || /^(list of|disambiguation)/i.test(title)) return null
    return title
  } catch {
    return null
  }
}

/** Page summary + lead image. Tries the given titles, then a Wikipedia search for the first. */
export async function fetchWikiSummary(...titles: string[]): Promise<WikiSummary | null> {
  for (const t of titles) {
    if (!t) continue
    const hit = await wikiSummary(t)
    if (hit) return hit
  }
  const first = titles.find(Boolean)
  if (!first) return null
  const guess = await wikiSearchTitle(`${first} Nepal`)
  if (guess && !titles.includes(guess)) return wikiSummary(guess)
  return null
}

export type NearbyPlace = {
  title: string
  extract: string
  image: string | null
  distanceKm: number
  url: string
  lat: number
  lon: number
}

export type ProvinceAttraction = {
  title: string
  extract: string
  image: string | null
  url: string
  lat: number
  lon: number
  sitelinks: number
}

type SparqlValue = { value?: string }
type SparqlBinding = {
  placeLabel?: SparqlValue
  coord?: SparqlValue
  article?: SparqlValue
  links?: SparqlValue
}

const ATTRACTION_TYPES = [
  'Q570116',
  'Q842402',
  'Q44539',
  'Q46169',
  'Q473972',
  'Q23397',
  'Q8502',
  'Q39816',
  'Q4989906',
  'Q839954',
  'Q1779653',
  'Q337986',
  'Q33506',
  'Q16560',
  'Q57821',
]

/** Province-wide attractions from Wikidata, ranked by the number of Wikipedia
 *  language editions (a keyless popularity proxy), then hydrated with English
 *  lead extracts/images. The `wikidata` argument is a province QID. */
export async function fetchProvinceAttractions(wikidata: string, limit = 12): Promise<ProvinceAttraction[]> {
  if (!/^Q\d+$/.test(wikidata)) return []
  const query = `
SELECT DISTINCT ?place ?placeLabel ?coord ?article ?links WHERE {
  VALUES ?type { ${ATTRACTION_TYPES.map(t => `wd:${t}`).join(' ')} }
  { ?place wdt:P131 wd:${wikidata} . }
  UNION
  { ?place wdt:P131 ?district . ?district wdt:P131 wd:${wikidata} . }
  ?place wdt:P31 ?type .
  ?place wdt:P625 ?coord .
  ?place wikibase:sitelinks ?links .
  OPTIONAL { ?article schema:about ?place; schema:isPartOf <https://en.wikipedia.org/> . }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?links)
LIMIT 30`

  try {
    const res = await fetch(
      `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`,
      { headers: HEADERS },
    )
    if (!res.ok) return []
    const json = await res.json()
    const bindings: SparqlBinding[] = json?.results?.bindings ?? []
    const seen = new Set<string>()
    const picks: ProvinceAttraction[] = []
    for (const b of bindings) {
      const title = String(b.placeLabel?.value ?? '').trim()
      const article = String(b.article?.value ?? '')
      const coord = String(b.coord?.value ?? '')
      const match = coord.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/)
      if (!title || !article || !match) continue
      const key = title.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      picks.push({
        title,
        extract: '',
        image: null,
        url: article,
        lon: Number(match[1]),
        lat: Number(match[2]),
        sitelinks: Number(b.links?.value ?? 0),
      })
      if (picks.length >= limit) break
    }
    if (!picks.length) return []

    const titles = picks.map(p => p.title).join('|')
    const detRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages|extracts&exintro=1&explaintext=1&exlimit=max&piprop=thumbnail&pithumbsize=480&format=json&origin=*&redirects=1`,
      { headers: HEADERS },
    )
    if (!detRes.ok) return picks
    const det = await detRes.json()
    const normalized: Record<string, string> = {}
    for (const n of det?.query?.normalized ?? []) normalized[n.from] = n.to
    const redirects: Record<string, string> = {}
    for (const r of det?.query?.redirects ?? []) redirects[r.from] = r.to
    const pages = new Map<string, WikiPage>()
    for (const p of Object.values(det?.query?.pages ?? {}) as WikiPage[]) pages.set(p.title, p)

    return picks.map(place => {
      const key = redirects[normalized[place.title] ?? place.title] ?? normalized[place.title] ?? place.title
      const page = pages.get(key)
      return {
        ...place,
        extract: (page?.extract ?? '').trim(),
        image: page?.thumbnail?.source ?? null,
      }
    })
  } catch {
    return []
  }
}

type GeoSearchItem = { pageid: number; title: string; dist: number; lat: number; lon: number }
type WikiPage = { title: string; extract?: string; thumbnail?: { source?: string } }

/** Notable nearby places / landmarks around a point (Wikipedia geosearch).
 *  `gsradius` is capped by the API at 10 km - larger values silently return nothing. */
export async function fetchNearbyPlaces(lat: number, lon: number, radiusM = 12000, limit = 8): Promise<NearbyPlace[]> {
  const radius = Math.min(Math.round(radiusM), 10000)
  try {
    const geoRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lon}&gsradius=${radius}&gslimit=${Math.min(limit * 3, 40)}&format=json&origin=*`,
      { headers: HEADERS },
    )
    if (!geoRes.ok) return []
    const geo = await geoRes.json()
    const items: GeoSearchItem[] = geo?.query?.geosearch ?? []
    if (!items.length) return []

    const titles = items.map(i => i.title).join('|')
    const detRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(titles)}&prop=pageimages|extracts&exintro=1&explaintext=1&exlimit=max&piprop=thumbnail&pithumbsize=480&format=json&origin=*&redirects=1`,
      { headers: HEADERS },
    )
    const det = detRes.ok ? await detRes.json() : null
    const normalized: Record<string, string> = {}
    for (const n of det?.query?.normalized ?? []) normalized[n.from] = n.to
    const redirects: Record<string, string> = {}
    for (const r of det?.query?.redirects ?? []) redirects[r.from] = r.to
    const pages = new Map<string, WikiPage>()
    for (const p of Object.values(det?.query?.pages ?? {}) as WikiPage[]) pages.set(p.title, p)

    const out: NearbyPlace[] = []
    for (const item of items) {
      const key = redirects[normalized[item.title] ?? item.title] ?? normalized[item.title] ?? item.title
      const page = pages.get(key)
      const extract = (page?.extract ?? '').trim()
      if (!extract) continue
      out.push({
        title: item.title,
        extract,
        image: page?.thumbnail?.source ?? null,
        distanceKm: Math.round((item.dist / 1000) * 10) / 10,
        url: wikiUrl(item.title),
        lat: item.lat,
        lon: item.lon,
      })
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}
