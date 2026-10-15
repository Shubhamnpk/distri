// Department of Hydrology and Meteorology - MFD forecast API, keyless.
// Verified live 2026-10-13 (datetime stamped today, 20 cities, EN/NE).
// Endpoints: /mfd/api/weather, /mfd/api/manual-observation,
// /mfd/api/country-forecast, /mfd/api/three-days-forecast-latest

const DHM_BASE = 'https://dhm.gov.np/mfd/api'

const HEADERS = {
  'User-Agent': 'Drishti-Nepal-Accountability-Dashboard/1.0',
  'Accept': 'application/json',
}

async function fetchDhm<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${DHM_BASE}${path}`, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

export type DhmStationForecast = {
  id: number
  name: string
  nepali_name?: string
  latitude: number
  longitude: number
  /** "5:58:16 AM" NPT — precise day/night boundary for this station. */
  sunrise?: string
  /** "5:39:37 PM" NPT. */
  sunset?: string
  /** Station-local date, e.g. "2026-10-16". */
  datetime?: string
  manual_forecast?: {
    rain_probability: number
    from_temperature: number
    to_temperature: number | null
    day: number
    weather?: { id: number; name: string }
  }[]
  [key: string]: unknown
}

export type DhmWeather = {
  id?: string
  datetime?: string
  stations?: DhmStationForecast[]
  [key: string]: unknown
}

/** 2-day manual+model forecast for ~20 cities (rain probability, min/max temp). */
export async function fetchDhmForecast(): Promise<DhmWeather | null> {
  return fetchDhm<DhmWeather>('/weather')
}

/** Today's observed min/max temperature + rainfall per station. */
export async function fetchDhmObservations(): Promise<DhmObservations | null> {
  return fetchDhm<DhmObservations>('/manual-observation')
}

export type DhmObservedStation = {
  id: number
  name: string
  latitude: number
  longitude: number
  min_temperature: number | null
  max_temperature: number | null
  rainfall: number | null
}

export type DhmObservations = {
  issue_date?: string
  stations?: DhmObservedStation[]
}

/** Country-level forecast bulletin text. */
export async function fetchDhmCountryForecast(): Promise<Record<string, unknown> | null> {
  return fetchDhm<Record<string, unknown>>('/country-forecast')
}
