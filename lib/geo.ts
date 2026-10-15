// District ↔ province geography for drill-downs (province → districts with project counts).
// Primary: DataNepal places API - complete, authoritative 77-district hierarchy
// (country → 7 provinces → 77 districts → 753 local units). Fallback: the saved
// snapshot in ./geo-constants (same source, verified 2026-10-14). Safe for client + server use.

import { fetchDataNepalPlaces } from './datanepal'
import { DISTRICTS } from './geo-constants'

export type GeoDistrict = {
  /** Display name, e.g. "Nawalparasi East", "Chitawan" */
  name: string
  /** App province display name: Koshi, Madhesh, Bagmati, Gandaki, Lumbini, Karnali, Sudurpashchim */
  province: string
}

export const PROVINCE_SLUG_TO_NAME: Record<string, string> = {
  koshi: 'Koshi',
  madhesh: 'Madhesh',
  bagmati: 'Bagmati',
  gandaki: 'Gandaki',
  lumbini: 'Lumbini',
  karnali: 'Karnali',
  'sudur-paschim': 'Sudurpashchim',
}

export const PROVINCE_NAME_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(PROVINCE_SLUG_TO_NAME).map(([slug, name]) => [name, slug]),
)

function fallbackDistricts(): GeoDistrict[] {
  return DISTRICTS.map(d => ({ name: d.name, province: d.province }))
}

let cached: Promise<GeoDistrict[]> | null = null

/** Live 77-district hierarchy (DataNepal, revalidated daily), static fallback on failure. */
export function fetchGeoDistricts(): Promise<GeoDistrict[]> {
  if (!cached) {
    cached = (async () => {
      try {
        const places = await fetchDataNepalPlaces()
        const districts = places.filter(
          p => p.admin_level === 2 && p.parent_slug != null && p.parent_slug in PROVINCE_SLUG_TO_NAME,
        )
        if (districts.length >= 77) {
          return districts.map(p => ({
            name: p.name_en,
            province: PROVINCE_SLUG_TO_NAME[p.parent_slug as string],
          }))
        }
      } catch {
        // fall through to snapshot
      }
      const fb = fallbackDistricts()
      cached = Promise.resolve(fb)
      return fb
    })()
  }
  return cached
}

/** Districts belonging to an app province display name. */
export function districtsOfProvince(all: GeoDistrict[], province: string): GeoDistrict[] {
  return all.filter(d => d.province === province).sort((a, b) => a.name.localeCompare(b.name))
}

// ── Text → district matching ──────────────────────────────────────────────
// Matches district (or well-known city inside it) mentions in project location
// strings. Whole-word matching only - "Bara" must not match "Bardiya".

const SPELL_FIX: Record<string, string> = {
  chitwan: 'chitawan',
  dhanusha: 'dhanusa',
  makawanpur: 'makwanpur',
  sindhupalchowk: 'sindhupalchok',
}

// Well-known place → canonical district display name (DataNepal spelling).
const CITY_TO_DISTRICT: Record<string, string> = {
  pokhara: 'Kaski',
  chhinedanda: 'Kaski',
  kathmandu: 'Kathmandu',
  kirtipur: 'Kathmandu',
  mulpani: 'Kathmandu',
  sundarijal: 'Kathmandu',
  pashupatinath: 'Kathmandu',
  gothatar: 'Kathmandu',
  lalitpur: 'Lalitpur',
  khokana: 'Lalitpur',
  bhaktapur: 'Bhaktapur',
  biratnagar: 'Morang',
  baijnathpur: 'Morang',
  dharan: 'Sunsari',
  chatara: 'Sunsari',
  birgunj: 'Parsa',
  janakpur: 'Dhanusa',
  gaur: 'Rautahat',
  jaleshwor: 'Mahottari',
  kalaiya: 'Bara',
  nijgadh: 'Bara',
  malangwa: 'Sarlahi',
  rajbiraj: 'Saptari',
  lahan: 'Siraha',
  gaighat: 'Udayapur',
  damak: 'Jhapa',
  bhadrapur: 'Jhapa',
  kakarbhitta: 'Jhapa',
  siddharthanagar: 'Rupandehi',
  butwal: 'Rupandehi',
  bharatpur: 'Chitawan',
  nepalgunj: 'Banke',
  jamunaha: 'Banke',
  dhangadhi: 'Kailali',
  mahendranagar: 'Kanchanpur',
  gaddachauki: 'Kanchanpur',
  daiji: 'Kanchanpur',
  hetauda: 'Makwanpur',
  melamchi: 'Sindhupalchok',
  tamakoshi: 'Dolakha',
  gaurishankar: 'Dolakha',
  jiri: 'Dolakha',
  dobhan: 'Palpa',
  siddhababa: 'Palpa',
  naubise: 'Dhading',
  jhulaghat: 'Baitadi',
  chiyobhanjyang: 'Panchthar',
  kimathanka: 'Sankhuwasabha',
  hilsa: 'Humla',
  korala: 'Mustang',
  jomsom: 'Mustang',
  gaindakot: 'Nawalparasi East',
}

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `
}

function applySpellFix(text: string): string {
  let out = text
  for (const [k, v] of Object.entries(SPELL_FIX)) {
    out = out.split(` ${k} `).join(` ${v} `)
  }
  return out
}

const staticDistricts = fallbackDistricts()

/**
 * District display names mentioned in free text (project name/location/ministry).
 * Synchronous - uses the verified static hierarchy so filtering stays deterministic.
 */
export function matchDistricts(text: string): string[] {
  const norm = applySpellFix(normalize(text))
  const hits = new Set<string>()
  for (const d of staticDistricts) {
    const n = normalize(d.name).trim()
    if (norm.includes(` ${n} `)) {
      hits.add(d.name)
      continue
    }
    // Bare "Nawalparasi" / "Rukum" (no East/West qualifier) → both halves.
    const base = n.replace(/ (east|west)$/, '')
    if (base !== n && norm.includes(` ${base} `)) hits.add(d.name)
  }
  for (const [city, district] of Object.entries(CITY_TO_DISTRICT)) {
    if (norm.includes(` ${city} `)) hits.add(district)
  }
  return [...hits]
}
