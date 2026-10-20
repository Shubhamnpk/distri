// Keyless live-environment feeds: Open-Meteo (weather + AQI) + USGS earthquakes.
// Open-Meteo: no key, CORS-open. Air quality lives on a DIFFERENT host.
// USGS FDSN: GeoJSON, bbox-filtered to Nepal (26-31N, 80-89E). Both verified live 2026-10-13.

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

export type DistrictWeather = { lat: number; lon: number }

export const NEPAL_DISTRICT_CENTERS: Record<string, DistrictWeather> = {
  Kathmandu: { lat: 27.71, lon: 85.32 },
  Pokhara: { lat: 28.21, lon: 83.99 },
  Biratnagar: { lat: 26.45, lon: 87.27 },
  Nepalgunj: { lat: 28.05, lon: 81.62 },
  Dhangadhi: { lat: 28.7, lon: 80.6 },
  Surkhet: { lat: 28.6, lon: 81.63 },
  Jumla: { lat: 29.27, lon: 82.18 },
}

export type CurrentWeather = {
  time?: string
  temperature_2m?: number
  relative_humidity_2m?: number
  rain?: number
  weather_code?: number
}

/** Current conditions for a district center (default Kathmandu). */
export async function fetchCurrentWeather(place: DistrictWeather = NEPAL_DISTRICT_CENTERS.Kathmandu): Promise<CurrentWeather | null> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,relative_humidity_2m,rain,weather_code&timezone=Asia%2FKathmandu`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    return json?.current ?? null
  } catch {
    return null
  }
}

/** Current temperatures for many points in ONE request (array lat/lon params).
 *  Returns temps aligned with the input order; null where unavailable. */
export async function fetchCurrentTemps(places: DistrictWeather[]): Promise<(number | null)[]> {
  if (!places.length) return []
  try {
    const lats = places.map(p => p.lat).join(',')
    const lons = places.map(p => p.lon).join(',')
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lats}&longitude=${lons}&current=temperature_2m&timezone=Asia%2FKathmandu`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return places.map(() => null)
    const json = await res.json()
    const arr = Array.isArray(json) ? json : [json]
    return places.map((_, i) => {
      const t = arr[i]?.current?.temperature_2m
      return typeof t === 'number' ? t : null
    })
  } catch {
    return places.map(() => null)
  }
}

/** CAMS PM2.5 ships on a ~0.4° global grid, so that is the spacing we sample at; the
 *  field is model output, not a measurement — it cannot resolve a valley or a city. */
const PM25_GRID_STEP = 0.4
/** Sampling lattice over Nepal's bounding box (26.2–30.4 N, 80.1–88.3 E) — 231 nodes. */
export const NEPAL_PM25_GRID: DistrictWeather[] = (() => {
  const pts: DistrictWeather[] = []
  for (let lat = 26.2; lat <= 30.4 + 1e-9; lat += PM25_GRID_STEP) {
    for (let lon = 80.1; lon <= 88.3 + 1e-9; lon += PM25_GRID_STEP) {
      pts.push({ lat: Number(lat.toFixed(2)), lon: Number(lon.toFixed(2)) })
    }
  }
  return pts
})()

/** Current model PM2.5 for many points in ONE request (array lat/lon params, air-quality
 *  host). Returns values aligned with the input order; null where unavailable. */
export async function fetchPm25Grid(places: DistrictWeather[]): Promise<(number | null)[]> {
  if (!places.length) return []
  try {
    const lats = places.map(p => p.lat).join(',')
    const lons = places.map(p => p.lon).join(',')
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lats}&longitude=${lons}&current=pm2_5`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return places.map(() => null)
    const json = await res.json()
    const arr = Array.isArray(json) ? json : [json]
    return places.map((_, i) => {
      const v = arr[i]?.current?.pm2_5
      return typeof v === 'number' ? v : null
    })
  } catch {
    return places.map(() => null)
  }
}

/** 7-day model highs/lows for a point — honest fallback where DHM has gaps.
 *  Always label values from here as model estimates in the UI. */
export async function fetchDailyHighLow(place: DistrictWeather): Promise<{ date: string; max: number | null; min: number | null }[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=Asia%2FKathmandu&forecast_days=7`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const json = await res.json()
    const dates: string[] = json?.daily?.time ?? []
    const maxs: (number | null)[] = json?.daily?.temperature_2m_max ?? []
    const mins: (number | null)[] = json?.daily?.temperature_2m_min ?? []
    return dates.map((date, i) => ({
      date,
      max: typeof maxs[i] === 'number' ? maxs[i] : null,
      min: typeof mins[i] === 'number' ? mins[i] : null,
    }))
  } catch {
    return []
  }
}
/** 24h temperature curve for station sparklines. */
export async function fetchHourlyTemps(place: DistrictWeather): Promise<{ time: string; value: number }[]> {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&hourly=temperature_2m&forecast_days=1&timezone=Asia%2FKathmandu`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const json = await res.json()
    const times: string[] = json?.hourly?.time ?? []
    const vals: (number | null)[] = json?.hourly?.temperature_2m ?? []
    return times
      .map((t, i) => ({ time: String(t).slice(11, 16), value: typeof vals[i] === 'number' ? (vals[i] as number) : NaN }))
      .filter(d => !Number.isNaN(d.value))
  } catch {
    return []
  }
}
export async function fetchCurrentPm25(place: DistrictWeather = NEPAL_DISTRICT_CENTERS.Kathmandu): Promise<number | null> {
  try {
    const res = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.lat}&longitude=${place.lon}&hourly=pm2_5&forecast_days=1`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return null
    const json = await res.json()
    const values: (number | null)[] = json?.hourly?.pm2_5 ?? []
    const times: string[] = json?.hourly?.time ?? []
    const idx = times.length ? times.length - 1 : -1
    const v = idx >= 0 ? values[idx] : null
    return typeof v === 'number' ? v : null
  } catch {
    return null
  }
}

export type NepalQuake = {
  id: string
  place: string
  mag: number
  time: number
  depthKm: number | null
  coordinates: [number, number]
  url: string
}

/** Recent earthquakes inside Nepal's bbox, newest first (infra-risk overlay). */
export async function fetchNepalQuakes(limit = 10): Promise<NepalQuake[]> {
  try {
    const res = await fetch(
      `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=26&maxlatitude=31&minlongitude=80&maxlongitude=89&limit=${limit}&orderby=time`,
      { headers: HEADERS, next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const json = await res.json()
    return ((json?.features ?? []) as Record<string, unknown>[]).map(f => {
      const p = (f?.properties ?? {}) as Record<string, unknown>
      const g = (f?.geometry ?? {}) as { coordinates?: [number, number, number?] }
      const coords = g?.coordinates ?? [0, 0]
      return {
        id: String(f?.id ?? ''),
        place: String(p?.place ?? ''),
        mag: Number(p?.mag ?? 0),
        time: Number(p?.time ?? 0),
        depthKm: typeof coords[2] === 'number' ? coords[2] : null,
        coordinates: [coords[0] ?? 0, coords[1] ?? 0] as [number, number],
        url: String(p?.url ?? ''),
      }
    })
  } catch {
    return []
  }
}
