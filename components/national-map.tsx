'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Waves, CalendarDays, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup, Tooltip, Pane, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { projects, slugify } from '@/lib/data'
import { projectSite } from '@/lib/project-coords'
import { forecastDayLabel, isNptDay, isDayBySun, shortClock } from '@/lib/time'
import { formatNprText } from '@/lib/currency'
import { matchDistricts } from '@/lib/geo'
import { fetchBipadDistricts, fetchDistrictPolygons, fetchLocalDistricts, districtsFromPolygons, provinceBbox, normName, fetchLocalMunicipalities, canonDistrictKey, fetchLocalProtected, fetchProvinceShapes, type BipadDistrict, type LocalDistrict, type LocalMunicipality } from '@/lib/district-geo'
import { fetchHydroProjects, hydroKind, HYDRO_KIND_COLOR, HYDRO_KIND_LABEL, type HydroProject, type HydroKind } from '@/lib/hydro'
import { fetchNepalHighways, type RoadFeatureCollection } from '@/lib/roads'
import { fetchNepalQuakes, fetchCurrentWeather, fetchCurrentPm25, fetchHourlyTemps, type NepalQuake, type CurrentWeather } from '@/lib/meteo'
import { LineChart } from '@/components/charts'
import { WeatherIcon } from '@/components/weather-icon'
import { skyKind } from '@/lib/condition'
import { skyMarkerSvg, quakePinSvg } from '@/lib/sky-svg'
import L from 'leaflet'
import { fetchDhmForecast } from '@/lib/dhm'
import { fetchBipadIncidents, fetchBipadRainStationsAll, fetchBipadRiverStationsAll } from '@/lib/bipad'
import type { BipadIncident, BipadStation } from '@/lib/bipad'

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'] as const

/** Local geojson uses numeric ids 1–7 ("Province No. 1/2" for Koshi/Madhesh) — match by id, never by name. */
const PROVINCE_ID_TO_NAME: Record<number, string> = {
  1: 'Koshi', 2: 'Madhesh', 3: 'Bagmati', 4: 'Gandaki', 5: 'Lumbini', 6: 'Karnali', 7: 'Sudurpashchim',
}

const PROVINCE_NAME_TO_NUM: Record<string, number> = {
  Koshi: 1, Madhesh: 2, Bagmati: 3, Gandaki: 4, Lumbini: 5, Karnali: 6, Sudurpashchim: 7,
}

const STATUS_COLOR: Record<string, string> = {
  Completed: '#0d7c5f',
  'On track': '#16a34a',
  'At risk': '#d97706',
  Delayed: '#dc2626',
}

/** Flood status from the BIPAD `status` string ("ABOVE DANGER/WARNING LEVEL"). */
function riverLevel(s: BipadStation): 'danger' | 'warn' | 'ok' {
  const st = (s.status ?? '').toUpperCase()
  const above = st.includes('ABOVE')
  if (above && st.includes('DANGER')) return 'danger'
  if (above && st.includes('WARNING')) return 'warn'
  return 'ok'
}

const RIVER_LEVEL_COLOR: Record<'danger' | 'warn' | 'ok', string> = {
  danger: '#dc2626',
  warn: '#d97706',
  ok: '#16a34a',
}

const HYDRO_HEADER: Record<HydroKind, string> = {
  operation: 'linear-gradient(135deg, #22c55e 0%, #15803d 60%, #14532d 100%)',
  generation: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 60%, #1e3a8a 100%)',
  survey: 'linear-gradient(135deg, #f59e0b 0%, #b45309 60%, #92400e 100%)',
}

/** Municipality border by palika class. Borders only — no fill — so the map
 *  underneath stays visible; the tint stays light so lines read without
 *  drowning the district. */
const MUNI_TYPE_COLOR: Record<string, string> = {
  Mahanagarpalika: '#a78bfa',
  Upamahanagarpalika: '#60a5fa',
  Nagarpalika: '#22d3ee',
  Gaunpalika: '#4ade80',
}
/** Palikas of the ACTIVE district only. Same pattern as the province layer:
 *  one stable layer for the whole province, the active district picked out by a
 *  pure predicate (no per-district refetch or remount). A dark slate outline
 *  keeps the inner boundaries legible even when every palika shares one type
 *  colour (e.g. all-green rural districts). */
function muniStyle(f: any, activeKey: string | null, selected: string | null) {
  const on = activeKey != null && f?.properties?._dkey === activeKey
  // `fill: false` (not just fillOpacity:0) so an off-district palika has NO
  // painted area and cannot swallow clicks meant for the map beneath it.
  if (!on) return { opacity: 0, fillOpacity: 0, weight: 0, fill: false }
  const c = MUNI_TYPE_COLOR[f?.properties?._type] ?? '#5eead4'
  const picked = selected != null && f?.properties?._muni === selected
  // Nearly-transparent fill: keeps the interior clickable without tinting the
  // map, so the palika's land use stays readable underneath.
  return picked
    ? { color: '#0b4f3e', weight: 2.4, opacity: 1, fillColor: c, fillOpacity: 0.14, fill: true }
    : { color: c, weight: 1, opacity: 0.85, fillColor: c, fillOpacity: 0.05, fill: true }
}

/** Protected areas of the ACTIVE district (same predicate pattern). */
function parkStyle(f: any, activeKey: string | null) {
  const on = activeKey != null && f?.properties?._dkey === activeKey
  if (!on) return { opacity: 0, fillOpacity: 0, weight: 0 }
  return { color: '#0f766e', weight: 1.6, fillColor: '#0f766e', fillOpacity: 0.1, dashArray: '6 4', opacity: 0.95 }
}

/** Hydropower marker: a water drop with a lightning bolt cut into it (hydro +
 *  power), sized by licensed capacity, coloured by licence kind. The bolt is the
 *  darker shade so it reads as a cut-out against the white drop. Colour is inline
 *  so it can never be lost to CSS load order or a stale bundle. */
function hydroIcon(p: HydroProject, active: boolean): L.DivIcon {
  const px = p.mw >= 300 ? 30 : p.mw >= 100 ? 24 : p.mw >= 10 ? 17 : 12
  const kind = hydroKind(p.licenseType)
  const theme: Record<HydroKind, [string, string, string]> = {
    operation: ['#22c55e', '#14532d', 'rgba(22,163,74,.6)'],
    generation: ['#3b82f6', '#1e3a8a', 'rgba(37,99,235,.6)'],
    survey: ['#f59e0b', '#7c2d12', 'rgba(217,119,6,.55)'],
  }
  const [c1, c2, ring] = theme[kind]
  const style = [
    `width:${px}px`, `height:${px}px`, 'display:grid', 'place-items:center',
    'border-radius:50%', 'color:#fff', 'box-sizing:border-box', 'cursor:pointer',
    `background:linear-gradient(135deg,${c1},${c2})`,
    'border:1.5px solid rgba(255,255,255,.95)',
    active
      ? `transform:scale(1.25);box-shadow:0 0 0 3px #fff,0 0 0 7px ${ring},0 6px 16px rgba(0,0,0,.35)`
      : 'box-shadow:0 1px 4px rgba(0,0,0,.28)',
  ].join(';')
  const glyph = `<svg width="${Math.round(px * 0.8)}" height="${Math.round(px * 0.8)}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 1.9c.3 0 .56.15.74.39C14.3 4.6 18.2 10 18.2 13.5A6.2 6.2 0 0 1 5.8 13.5C5.8 10 9.7 4.6 11.26 2.29A.92.92 0 0 1 12 1.9z" fill="#ffffff"/><path d="M13.7 7.1 8.7 14.1h3.4l-1.9 6.4 5.4-8h-3.4z" fill="${c2}"/></svg>`
  return L.divIcon({
    html: `<span class="hydro-node ${kind}${active ? ' active' : ''}" style="${style}">${glyph}</span>`,
    className: 'hydro-node-wrap',
    iconSize: [px, px],
    iconAnchor: [px / 2, px / 2],
  })
}

/** River-station marker: colour + pulse convey live flood status. */
function riverIcon(s: BipadStation, active: boolean): L.DivIcon {
  const lvl = riverLevel(s)
  const color = RIVER_LEVEL_COLOR[lvl]
  const style = [
    'width:22px', 'height:22px', 'display:grid', 'place-items:center', 'border-radius:50%',
    'color:#fff', 'box-sizing:border-box', 'cursor:pointer', 'position:relative',
    `background:${color}`, 'border:2px solid #fff',
    active
      ? 'transform:scale(1.3);box-shadow:0 0 0 3px rgba(37,99,235,.45),0 6px 16px rgba(0,0,0,.35)'
      : 'box-shadow:0 1px 4px rgba(0,0,0,.28)',
  ].join(';')
  const wave = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M2 12c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7.5 0"/><path d="M2 18c2.5-2.5 5-2.5 7.5 0s5 2.5 7.5 0 5-2.5 7.5 0"/></svg>`
  return L.divIcon({
    html: `<span class="river-node ${lvl}${active ? ' active' : ''}" style="${style}">${wave}</span>`,
    className: 'river-node-wrap',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  })
}

/** Rain-gauge marker: small sky-blue drop. */
function rainIcon(active: boolean): L.DivIcon {
  const style = [
    'width:15px', 'height:15px', 'display:grid', 'place-items:center', 'border-radius:50%',
    'color:#fff', 'box-sizing:border-box', 'cursor:pointer', 'background:#0ea5e9', 'border:1.5px solid #fff',
    active
      ? 'transform:scale(1.4);box-shadow:0 0 0 3px rgba(14,165,233,.45),0 4px 12px rgba(0,0,0,.3)'
      : 'box-shadow:0 1px 3px rgba(0,0,0,.25)',
  ].join(';')
  const drop = `<svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2s6 7.3 6 11a6 6 0 0 1-12 0c0-3.7 6-11 6-11z"/></svg>`
  return L.divIcon({
    html: `<span class="rain-node${active ? ' active' : ''}" style="${style}">${drop}</span>`,
    className: 'rain-node-wrap',
    iconSize: [15, 15],
    iconAnchor: [7.5, 7.5],
  })
}

/** A rain gauge / river station usable on the map. */
function stationCoord(s: BipadStation): [number, number] | null {
  const c = s.point?.coordinates
  if (!Array.isArray(c) || c.length < 2) return null
  const [lon, lat] = c
  if (typeof lon !== 'number' || typeof lat !== 'number') return null
  return [lat, lon]
}

/** District · Province for a station, using the BIPAD district list we already
 *  load (its `id` is the same numeric code the station carries) + province ids. */
function stationArea(districts: BipadDistrict[], s: BipadStation): string {
  const d = s.district != null ? districts.find(x => x.id === s.district)?.name : undefined
  const p = s.province != null ? PROVINCE_ID_TO_NAME[s.province] : undefined
  const fallback = typeof s.description === 'string' ? s.description.split(',')[0]?.trim() : ''
  const parts = [d || (fallback && fallback !== '0' ? fallback : undefined), p].filter(Boolean) as string[]
  return parts.join(' · ')
}

type RainInterval = { value: number | null; status?: { danger?: boolean; warning?: boolean }; interval: number }

/** Rain gauges describe themselves as "District,Municipality,Station,id". */
function rainLocality(s: BipadStation): string {
  const parts = typeof s.description === 'string' ? s.description.split(',') : []
  const name = parts[2]?.trim()
  return name && name !== '0' ? name : ''
}

function populationAtRisk(s: BipadStation): { people: number; households: number } | null {
  const d = s.affectedDemography as { maleCount?: number; femaleCount?: number; householdCount?: number } | undefined
  if (!d || (d.maleCount == null && d.femaleCount == null && d.householdCount == null)) return null
  return { people: (d.maleCount ?? 0) + (d.femaleCount ?? 0), households: d.householdCount ?? 0 }
}

function nptShort(iso?: string): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ''
  return new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kathmandu' })
}

// Nepali year 2083 BS ≈ 13 Apr 2026 – 14 Apr 2027 AD. Incident feed is scoped here.
const BS2083_START = Date.parse('2026-04-13T00:00:00+05:45')
const BS2083_END = Date.parse('2027-04-14T00:00:00+05:45')

function incidentDate(i: BipadIncident): number {
  const r = i as unknown as Record<string, unknown>
  for (const k of ['incidentOn', 'reportedOn', 'createdOn']) {
    const t = Date.parse(String(r[k] ?? ''))
    if (!Number.isNaN(t)) return t
  }
  return NaN
}

// Name variants between BIPAD, DataNepal and okfnepal spellings (mirrors lib/geo SPELL_FIX).
const NAME_ALIAS: Record<string, string> = {
  chitawan: 'chitwan',
  chitwan: 'chitawan',
  dhanusa: 'dhanusha',
  dhanusha: 'dhanusa',
  kabhrepalanchok: 'kavrepalanchok',
  kavrepalanchok: 'kabhrepalanchok',
  kavrepalanchowk: 'kavrepalanchok',
  makwanpur: 'makawanpur',
  makawanpur: 'makwanpur',
  nawalparasie: 'nawalparasieast',
  nawalparasieast: 'nawalparasie',
  nawalparasiw: 'nawalparasiwest',
  nawalparasiwest: 'nawalparasiw',
  rukume: 'rukumeast',
  rukumeast: 'rukume',
  rukumw: 'rukumwest',
  rukumwest: 'rukumw',
  sindhupalchok: 'sindhupalchowk',
  sindhupalchowk: 'sindhupalchok',
}

function hash01(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000
  return h / 1000
}

const NEPAL_BBOX: [[number, number], [number, number]] = [[26.2, 80.2], [30.4, 88.3]]

type Layers = { projects: boolean; hydro: boolean; quakes: boolean; quakesPast: boolean; weather: boolean; incidents: boolean; munis: boolean; parks: boolean; roads: boolean; rain: boolean; rivers: boolean }

function FitHelper({ bbox }: { bbox: [[number, number], [number, number]] | null }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (!bbox) return
    // No maxBounds on the map (free pan/zoom by design), so flights land
    // exactly — nothing left to drag the view back toward center.
    map.flyToBounds(bbox, { padding: [60, 60], duration: first.current ? 0.1 : 1.2 })
    first.current = false
  }, [map, bbox])
  return null
}

/** Fly the view to a picked palika's own bounds (click on the inner map). */
function MuniFocus({ muni }: { muni: LocalMunicipality | null }) {
  const map = useMap()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!muni) { last.current = null; return }
    if (last.current === muni.name) return
    last.current = muni.name
    try {
      const b = L.geoJSON(muni.feature as never).getBounds()
      if (b.isValid()) map.flyToBounds(b, { padding: [40, 40], maxZoom: 17, duration: 1 })
    } catch { /* geometry unusable — stay put */ }
  }, [map, muni])
  return null
}

/** Clicking empty map (not a shape, pin, popup or control) steps one level out. */
function MapDeselect({ onEmptyClick }: { onEmptyClick: () => void }) {
  const map = useMap()
  useEffect(() => {
    const handler = (e: { originalEvent: MouseEvent }) => {
      const t = e.originalEvent.target as HTMLElement | null
      if (t?.closest?.('.leaflet-interactive, .leaflet-popup, .leaflet-control')) return
      onEmptyClick()
    }
    map.on('click', handler as never)
    return () => {
      map.off('click', handler as never)
    }
  }, [map, onEmptyClick])
  return null
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeProvinceEach(selectProvince: (p: string) => void, selected: string | null) {
  return (f: any, l: any) => {
    const props: { id?: number; name?: string } = f?.properties ?? {}
    const label: string = props.name ?? ''
    const target = (typeof props.id === 'number' && PROVINCE_ID_TO_NAME[props.id]) || null
    // Outline only — a fill would hide the district boundaries underneath.
    const base = () => {
      const isActive = target != null && target === selected
      return {
        weight: isActive ? 2.2 : 1.1,
        fillOpacity: 0,
        color: isActive ? '#0b4f3e' : '#94a3b8',
      }
    }
    l.bindTooltip(label, { sticky: true, direction: 'top' })
    l.on('click', () => { if (target) selectProvince(target) })
    l.on('mouseover', () => l.setStyle({ weight: 2.6, fillOpacity: 0, color: '#0b4f3e' }))
    l.on('mouseout', () => l.setStyle(base()))
  }
}

function districtStyle(f: any, district: string | null) {
  const active = f?.properties?._district === district
  // Border-only: the active district reads from a thick outline so palika and
  // park borders inside stay fully visible. No fill on any district. The ACTIVE
  // district drops its fill hit-area too, so clicks inside it reach the palikas
  // underneath instead of being swallowed by this whole-district polygon.
  return {
    fillColor: 'transparent',
    fillOpacity: 0,
    fill: !active,
    color: active ? '#0b4f3e' : '#94a3b8',
    weight: active ? 2.2 : 1.1,
  }
}

function makeDistrictEach(setDistrict: (fn: (cur: string | null) => string | null) => void) {
  return (f: any, l: any) => {
    const name: string = f?.properties?._district ?? f?.properties?.name ?? ''
    l.bindTooltip(name, { sticky: true, direction: 'top' })
    l.on('click', () => setDistrict(cur => (cur === name ? null : name)))
  }
}

/** Hover/click each palika inside the open district: tooltip names it, click
 *  focuses it (the `<MuniFocus>` child flies the map to its bounds). */
function makeMuniEach(setMuniSel: (fn: (cur: LocalMunicipality | null) => LocalMunicipality | null) => void, byName: Map<string, LocalMunicipality>) {
  return (f: any, l: any) => {
    const name: string = f?.properties?._muni ?? ''
    const type: string = f?.properties?._type ?? ''
    l.bindTooltip(`${name}${type ? ` · ${type}` : ''}`, { sticky: true, direction: 'top' })
    l.on('click', () => {
      const m = byName.get(name)
      if (m) setMuniSel(cur => (cur?.name === name ? null : m))
    })
  }
}

type DhmStation = {
  id: number
  name: string
  latitude: number
  longitude: number
  condition?: string
  sunrise?: string
  sunset?: string
  days: { day: number; from_temperature: number | null; to_temperature: number | null; rain_probability: number; weather?: { name: string } }[]
}

export function NationalMap() {
  const [provinceGeo, setProvinceGeo] = useState<Record<string, unknown> | null>(null)
  const [districts, setDistricts] = useState<BipadDistrict[]>([])
  const [polyByName, setPolyByName] = useState<Record<string, Record<string, unknown>>>({})
  const [localDistricts, setLocalDistricts] = useState<LocalDistrict[]>([])
  const [hydro, setHydro] = useState<HydroProject[]>([])
  const [roads, setRoads] = useState<RoadFeatureCollection | null>(null)
  const [rainStations, setRainStations] = useState<BipadStation[]>([])
  const [riverStations, setRiverStations] = useState<BipadStation[]>([])
  const [quakes, setQuakes] = useState<NepalQuake[]>([])
  const [stations, setStations] = useState<DhmStation[]>([])
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [province, setProvince] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [stationSel, setStationSel] = useState<DhmStation | null>(null)
  const [hydroSel, setHydroSel] = useState<HydroProject | null>(null)
  const [riverSel, setRiverSel] = useState<BipadStation | null>(null)
  const [rainSel, setRainSel] = useState<BipadStation | null>(null)
  const [hydroKindFilter, setHydroKindFilter] = useState<'all' | HydroKind>('all')
  const [stationWx, setStationWx] = useState<CurrentWeather | null>(null)
  const [stationPm, setStationPm] = useState<number | null>(null)
  const [stationHourly, setStationHourly] = useState<{ time: string; value: number }[]>([])
  const [stationLoading, setStationLoading] = useState(false)
  const [districtsReady, setDistrictsReady] = useState(false)
  const [districtsLive, setDistrictsLive] = useState(false)
  const liveRef = useRef(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [polyCount, setPolyCount] = useState<number | null>(null)
  const [munis, setMunis] = useState<LocalMunicipality[]>([])
  const [parks, setParks] = useState<LocalMunicipality[]>([])
  const [munisLoading, setMunisLoading] = useState(false)
  const [layers, setLayers] = useState<Layers>({ projects: true, hydro: true, quakes: true, quakesPast: false, weather: false, incidents: false, munis: true, parks: true, roads: true, rain: false, rivers: false })
  const [quakeSel, setQuakeSel] = useState<NepalQuake | null>(null)
  const [muniSel, setMuniSel] = useState<LocalMunicipality | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchProvinceShapes()
      .then(d => { if (!cancelled && d.features.length) setProvinceGeo(d) })
      .catch(() => {})
    // District list first (tiny BIPAD payload, cached) — pins, zoom and
    // filtering never wait on shapes. Shapes load lazily per province below.
    fetchBipadDistricts()
      .then(d => {
        if (cancelled) return
        if (d.length) {
          setDistricts(d)
          setDistrictsLive(true)
          liveRef.current = true
        }
        setDistrictsReady(true)
      })
      .catch(() => { if (!cancelled) setDistrictsReady(true) })
    fetchDistrictPolygons()
      .then(p => { if (!cancelled) { setPolyByName(p.byName); setPolyCount(p.geojson.features.length) } })
      .catch(() => { if (!cancelled) setPolyCount(0) })
    fetchHydroProjects().then(h => { if (!cancelled) setHydro(h) }).catch(() => {})
    fetchNepalHighways().then(r => { if (!cancelled) setRoads(r) }).catch(() => {})
    fetchBipadRainStationsAll().then(s => { if (!cancelled) setRainStations(s) }).catch(() => {})
    fetchBipadRiverStationsAll().then(s => { if (!cancelled) setRiverStations(s) }).catch(() => {})
    fetchNepalQuakes(100).then(q => { if (!cancelled) setQuakes(q) }).catch(() => {})
    fetchDhmForecast().then(f => {
      if (cancelled) return
      setStations((f?.stations ?? []).map(s => ({
        id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude,
        condition: s.manual_forecast?.[0]?.weather?.name ?? undefined,
        sunrise: s.sunrise, sunset: s.sunset,
        days: (s.manual_forecast ?? []).map(d => ({
          day: d.day, from_temperature: d.from_temperature ?? null, to_temperature: d.to_temperature ?? null,
          rain_probability: d.rain_probability ?? 0, weather: d.weather ? { name: d.weather.name } : undefined,
        })),
      })))
    }).catch(() => {})
    fetchBipadIncidents(200).then(i => { if (!cancelled) setIncidents(i.results) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const provinceDistricts = useMemo(
    () => (province ? districts.filter(d => d.province === province) : []),
    [districts, province],
  )

  // Lazy shapes: only the opened province's file (~76–226KB), cached per
  // province — never the whole country, never twice.
  useEffect(() => {
    if (!province) {
      setLocalDistricts([])
      return
    }
    let cancelled = false
    const num = PROVINCE_NAME_TO_NUM[province]
    // Clear the previous province's shapes immediately — never show stale districts.
    setLocalDistricts([])
    setLocalLoading(true)
    fetchLocalDistricts(num)
      .then(local => {
        if (cancelled) return
        setLocalDistricts(local)
        setPolyCount(local.length)
        // Polygon-derived rows only when the API never answered — and only
        // then, so a fallback can never pin one province over another.
        if (!liveRef.current) {
          setDistricts(districtsFromPolygons(local))
          setDistrictsReady(true)
        }
      })
      .catch(() => { if (!cancelled) setPolyCount(0) })
      .finally(() => { if (!cancelled) setLocalLoading(false) })
    return () => { cancelled = true }
  }, [province])

  // Municipalities + protected areas of the OPENED PROVINCE (~140 features,
  // cached per province). Loaded once per province, not per district, so
  // switching districts is a pure style change with nothing to refetch.
  useEffect(() => {
    if (!province) {
      setMunis([])
      setParks([])
      return
    }
    let cancelled = false
    setMunis([])
    setParks([])
    setMunisLoading(true)
    Promise.all([fetchLocalMunicipalities(province), fetchLocalProtected(province)])
      .then(([allMunis, allParks]) => {
        if (cancelled) return
        setMunis(allMunis)
        setParks(allParks)
      })
      .catch(() => { if (!cancelled) { setMunis([]); setParks([]) } })
      .finally(() => { if (!cancelled) setMunisLoading(false) })
    return () => { cancelled = true }
  }, [province])

  const activeKey = useMemo(() => (district ? canonDistrictKey(district) : null), [district])
  const activeMunis = useMemo(() => (activeKey ? munis.filter(m => m.district === activeKey) : []), [munis, activeKey])
  const activeParks = useMemo(() => (activeKey ? parks.filter(m => m.district === activeKey) : []), [parks, activeKey])
  const muniByName = useMemo(() => new Map(munis.map(m => [m.name, m] as const)), [munis])

  // A palika belongs to one district — drop the pick when the district changes.
  useEffect(() => { setMuniSel(null) }, [district, province])

  const muniFeatures = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: munis.map(m => ({
        ...(m.feature as object),
        properties: { ...((m.feature as { properties?: object }).properties ?? {}), _muni: m.name, _type: m.type, _dkey: m.district },
      })),
    }),
    [munis],
  )

  const parkFeatures = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: parks.map(m => ({
        ...(m.feature as object),
        properties: { ...((m.feature as { properties?: object }).properties ?? {}), _muni: m.name, _type: m.type, _dkey: m.district },
      })),
    }),
    [parks],
  )

  const localByName = useMemo(() => new Map(localDistricts.map(d => [normName(d.name), d] as const)), [localDistricts])

  const districtFeatures = useMemo(() => {
    const feats: Record<string, unknown>[] = []
    for (const d of provinceDistricts) {
      const key = normName(d.name)
      const local = localByName.get(key) ?? (NAME_ALIAS[key] ? localByName.get(NAME_ALIAS[key]) : undefined)
      if (local) {
        feats.push({ ...local.feature, properties: { ...((local.feature as { properties?: object }).properties ?? {}), _district: d.name } })
        continue
      }
      const feat = polyByName[key] ?? (NAME_ALIAS[key] ? polyByName[NAME_ALIAS[key]] : undefined)
      if (feat) feats.push({ ...(feat as object), properties: { ...((feat as { properties?: object }).properties ?? {}), _district: d.name } })
    }
    return { type: 'FeatureCollection', features: feats }
  }, [provinceDistricts, polyByName, localByName])

  const fit: [[number, number], [number, number]] | null = useMemo(() => {
    if (district) {
      const d = districts.find(x => x.name === district)
      if (d?.bbox) return [[d.bbox[1], d.bbox[0]], [d.bbox[3], d.bbox[2]]]
      if (d) return [[d.lat - 0.4, d.lon - 0.4], [d.lat + 0.4, d.lon + 0.4]]
      return null
    }
    if (province) return provinceBbox(provinceDistricts)
    return null
  }, [district, province, districts, provinceDistricts])

  // Our 30 projects → district centroid (+ deterministic jitter), province fallback.
  const projectPoints = useMemo(() => {
    const byNorm = new Map(districts.map(d => [normName(d.name), d] as const))
    for (const [a, b] of Object.entries(NAME_ALIAS)) {
      if (byNorm.has(a) && !byNorm.has(b)) byNorm.set(b, byNorm.get(a)!)
    }
    const provCentroid = new Map<string, { lat: number; lon: number }>()
    for (const p of PROVINCES) {
      const ds = districts.filter(d => d.province === p)
      if (ds.length) provCentroid.set(p, { lat: ds.reduce((a, d) => a + d.lat, 0) / ds.length, lon: ds.reduce((a, d) => a + d.lon, 0) / ds.length })
    }
    return projects.map(p => {
      // 1) Researched site (dam, airfield, temple — confidence labeled).
      const site = projectSite(p.name)
      if (site) {
        return {
          p, district: null as string | null, provinceLevel: false,
          exact: true, siteLabel: site.label, confident: site.confidence === 'high',
          lat: site.lat, lon: site.lon,
        }
      }
      // 2) District centroid → 3) province centroid → unpinned (national).
      const hits = matchDistricts(`${p.name} ${p.location}`)
      const d = hits.map(h => byNorm.get(normName(h))).find(Boolean)
      const fallback = provCentroid.get(p.province ?? '')
      const base = d ?? fallback
      if (!base || p.province === 'National') return { p, district: d?.name ?? null, provinceLevel: false, exact: false, siteLabel: '', confident: false, lat: null as number | null, lon: null as number | null }
      const j = hash01(p.name)
      const j2 = hash01(p.location + p.name)
      return { p, district: d?.name ?? null, provinceLevel: !d, exact: false, siteLabel: '', confident: false, lat: base.lat + (j - 0.5) * 0.22, lon: base.lon + (j2 - 0.5) * 0.22 }
    })
  }, [districts])

  const inScope = (lat: number | null, lon: number | null): boolean => {
    if (lat == null || lon == null) return false
    if (district) {
      const d = districts.find(x => x.name === district)
      if (!d?.bbox) return true
      return lon >= d.bbox[0] && lon <= d.bbox[2] && lat >= d.bbox[1] && lat <= d.bbox[3]
    }
    if (province) {
      const ds = districts.filter(x => x.province === province)
      return ds.some(d => d.bbox && lon >= d.bbox[0] && lon <= d.bbox[2] && lat >= d.bbox[1] && lat <= d.bbox[3])
    }
    return true
  }

  const visibleProjects = projectPoints.filter(x => x.lat != null && inScope(x.lat, x.lon))
  const nationalProjects = projectPoints.filter(x => x.lat == null)
  const visibleHydro = hydro.filter(
    h =>
      (hydroKindFilter === 'all' || hydroKind(h.licenseType) === hydroKindFilter) &&
      inScope(h.lat, h.lng),
  )
  const hydroTotals = useMemo(() => {
    const t: Record<HydroKind, { n: number; mw: number }> = {
      operation: { n: 0, mw: 0 },
      generation: { n: 0, mw: 0 },
      survey: { n: 0, mw: 0 },
    }
    for (const h of hydro) {
      const k = hydroKind(h.licenseType)
      t[k].n += 1
      t[k].mw += h.mw || 0
    }
    return t
  }, [hydro])

  const visibleRain = rainStations.filter(s => { const c = stationCoord(s); return c ? inScope(c[0], c[1]) : false })
  const visibleRivers = riverStations.filter(s => { const c = stationCoord(s); return c ? inScope(c[0], c[1]) : false })
  const visibleQuakes = quakes.filter(q => inScope(q.coordinates[1], q.coordinates[0]))
  const yearQuakes = visibleQuakes.filter(q => q.time >= BS2083_START && q.time < BS2083_END)
  const pastQuakes = visibleQuakes.filter(q => !(q.time >= BS2083_START && q.time < BS2083_END))
  const visibleStations = stations.filter(s => inScope(s.latitude, s.longitude))
  const visibleIncidents = incidents.filter(i => {
    if (!i.point || !inScope(i.point.coordinates[1], i.point.coordinates[0])) return false
    const t = incidentDate(i)
    return !Number.isNaN(t) && t >= BS2083_START && t < BS2083_END
  })

  // Station drawer data — current + PM2.5 + 24h curve for the tapped station.
  useEffect(() => {
    if (!stationSel) return
    let cancelled = false
    setStationLoading(true)
    setStationWx(null)
    setStationPm(null)
    setStationHourly([])
    const at = { lat: stationSel.latitude, lon: stationSel.longitude }
    Promise.all([fetchCurrentWeather(at), fetchCurrentPm25(at), fetchHourlyTemps(at)])
      .then(([w, pm, h]) => {
        if (cancelled) return
        setStationWx(w)
        setStationPm(pm)
        setStationHourly(h)
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setStationLoading(false) })
    return () => { cancelled = true }
  }, [stationSel])

  const selectProvince = (p: string | null) => {
    setProvince(p)
    setDistrict(null)
  }

  const counts = {
    projects: visibleProjects.length,
    hydro: visibleHydro.length,
    quakes: yearQuakes.length,
    quakesPast: pastQuakes.length,
    weather: visibleStations.length,
    incidents: visibleIncidents.length,
    roads: roads?.features.length ?? 0,
    rain: visibleRain.length,
    rivers: visibleRivers.length,
  }

  const toggle = (k: keyof Layers) => setLayers(l => ({ ...l, [k]: !l[k] }))

  return (
    <>
      <div className="atlas-map">
        <MapContainer
          center={[28.4, 84.2] as [number, number]}
          zoom={7}
          minZoom={5}
          maxZoom={18}
          worldCopyJump={true}
          style={{ height: '100%', width: '100%', background: '#eef2f0' }}
          className={isNptDay() ? undefined : 'night-tiles'}
          attributionControl={true}
        >          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics &amp; OpenStreetMap contributors"
          />
          <FitHelper bbox={fit ?? NEPAL_BBOX} />
          <MuniFocus muni={muniSel} />
          <MapDeselect
            onEmptyClick={() => {
              if (district) setDistrict(null)
              else if (province) selectProvince(null)
            }}
          />
          {/* Stacking is by pane, not load order: polygons stay low so the
              asynchronously-loaded shapes can never cover the clickable pins. */}
          <Pane name="shapes" style={{ zIndex: 390 }} />
          {/* District borders get their own pane ABOVE the palika fills so the
              active district's outline is never overpainted (the palika layer
              mounts later, so load order alone can't guarantee this). */}
          <Pane name="borders" style={{ zIndex: 430 }} />
          <Pane name="points" style={{ zIndex: 620 }} />
          {layers.roads && roads && (
            <GeoJSON
              key="roads"
              pane="shapes"
              data={roads as any}
              style={() => ({ color: '#b45309', weight: 2, opacity: 0.7, fill: false })}
              onEachFeature={(f: any, l: any) => { l.bindTooltip('National highway', { sticky: true }) }}
            />
          )}
          {provinceGeo && (
            <GeoJSON
              key={`provinces-${province ?? 'all'}`}
              pane="shapes"
              data={provinceGeo as any}
              style={(f: any) => {
                const id: number | undefined = f?.properties?.id
                const isActive = province != null && id != null && PROVINCE_ID_TO_NAME[id] === province
                return {
                  fillColor: 'transparent',
                  fillOpacity: 0,
                  color: isActive ? '#0b4f3e' : '#94a3b8',
                  weight: isActive ? 2.2 : 1.1,
                  opacity: 1,
                }
              }}
              onEachFeature={makeProvinceEach(selectProvince, province) as any}
            />
          )}
          {province && districtFeatures.features.length > 0 && (
            <GeoJSON
              key={`districts-${province}`}
              pane="borders"
              data={districtFeatures as any}
              style={(f: any) => districtStyle(f, district)}
              onEachFeature={makeDistrictEach(setDistrict) as any}
            />
          )}
          {layers.munis && district && muniFeatures.features.length > 0 && (
            <GeoJSON
              key={`munis-${province}`}
              pane="shapes"
              data={muniFeatures as any}
              style={(f: any) => muniStyle(f, activeKey, muniSel?.name ?? null)}
              onEachFeature={makeMuniEach(setMuniSel, muniByName) as any}
            />
          )}
          {layers.parks && district && parkFeatures.features.length > 0 && (
            <GeoJSON
              key={`parks-${province}`}
              pane="shapes"
              data={parkFeatures as any}
              style={(f: any) => parkStyle(f, activeKey)}
            />
          )}
          {province && provinceDistricts.map(d => {
            const hq = localByName.get(normName(d.name))?.hq
            return (
              <CircleMarker
                key={`dc-${d.id}`}
                pane="points"
                center={[d.lat, d.lon] as [number, number]}
                radius={district === d.name ? 9 : 6}
                pathOptions={{
                  color: district === d.name ? '#0b4f3e' : '#475569',
                  weight: 2,
                  fillColor: district === d.name ? '#0b4f3e' : '#ffffff',
                  fillOpacity: district === d.name ? 0.9 : 0.85,
                }}
                eventHandlers={{ click: () => setDistrict(cur => (cur === d.name ? null : d.name)) }}
              >
                {district === d.name && hq ? (
                  <Tooltip permanent direction="top" offset={[0, -10]}>{`★ HQ ${hq}`}</Tooltip>
                ) : (
                  <Tooltip direction="top" sticky>{hq ? `${d.name} · HQ ${hq}` : d.name}</Tooltip>
                )}
              </CircleMarker>
            )
          })}
          {layers.projects && visibleProjects.map(({ p, district: dd, provinceLevel, exact, siteLabel, confident, lat, lon }) => (
            <CircleMarker
              key={`p-${p.name}`}
              pane="points"
              center={[lat as number, lon as number]}
              radius={exact ? 7 : provinceLevel ? 8 : 6}
              pathOptions={{
                color: '#ffffff', weight: 1.5,
                fillColor: STATUS_COLOR[p.status] ?? '#0d7c5f',
                fillOpacity: 0.95,
                dashArray: exact && confident ? undefined : '3 2',
              }}
            >
              <Tooltip direction="top" sticky>{p.name} · {p.progress}%</Tooltip>
              <Popup>
                <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>
                  <strong>{p.name}</strong><br />
                  {p.status} · {p.progress}% · {p.budget}
                  {exact
                    ? <><br />◎ {siteLabel}{confident ? ' · GPS verified' : ' · anchor, see registry'}</>
                    : dd ? <><br />≈ {dd} district</> : <><br />≈ {p.province} (province-level pin)</>}<br />
                  <a href={`/projects/${slugify(p.name)}`}>Open tracker →</a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {layers.hydro && visibleHydro.map(h => {
            const active = hydroSel?.name === h.name
            return (
              <Marker
                key={`h-${h.name}-${h.licNo}`}
                pane="points"
                position={[h.lat, h.lng]}
                icon={hydroIcon(h, active)}
                eventHandlers={{ click: () => setHydroSel(cur => (cur?.name === h.name ? null : h)) }}
              >
                {active
                  ? <Tooltip permanent direction="top" offset={[0, -6]}>{`⚡ ${h.name} · ${h.mw} MW`}</Tooltip>
                  : <Tooltip direction="top" sticky>{h.name} · {h.mw} MW · {h.licenseType}</Tooltip>}
              </Marker>
            )
          })}
          {layers.quakes && yearQuakes.map(q => {
            const qc = q.mag >= 4.5 ? '#dc2626' : '#f59e0b'
            const big = q.mag >= 4.5
            return (
              <Marker
                key={`q-${q.id}`}
                position={[q.coordinates[1], q.coordinates[0]]}
                icon={L.divIcon({
                  html: `<span class="quake-ripples${big ? ' big' : ''}${quakeSel?.id === q.id ? ' selected' : ''}" style="--qc:${qc}"><span class="quake-pin">${quakePinSvg(qc)}</span></span>`,
                  className: 'quake-pin-wrap',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
                eventHandlers={{ click: () => setQuakeSel(cur => (cur?.id === q.id ? null : q)) }}
              >
                <Tooltip direction="top" sticky>M{q.mag.toFixed(1)} · {q.place}</Tooltip>
              </Marker>
            )
          })}
          {layers.quakesPast && pastQuakes.map(q => {
            const qc = q.mag >= 4.5 ? '#dc2626' : '#b45309'
            return (
              <Marker
                key={`qp-${q.id}`}
                position={[q.coordinates[1], q.coordinates[0]]}
                icon={L.divIcon({
                  html: `<span class="quake-pin" style="opacity:.8">${quakePinSvg(qc)}</span>`,
                  className: 'quake-pin-wrap',
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                })}
                eventHandlers={{ click: () => setQuakeSel(cur => (cur?.id === q.id ? null : q)) }}
              >
                <Tooltip direction="top" sticky>M{q.mag.toFixed(1)} · {q.place}</Tooltip>
              </Marker>
            )
          })}
          {layers.weather && visibleStations.map(s => (
            <Marker
              key={`w-${s.id}`}
              position={[s.latitude, s.longitude]}
              icon={L.divIcon({
                html: `<span class="sky-pin${stationSel?.id === s.id ? ' active' : ''}">${skyMarkerSvg(skyKind(s.condition), !isNptDay())}</span>`,
                className: 'sky-pin-wrap',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              })}
              eventHandlers={{ click: () => setStationSel(cur => (cur?.id === s.id ? null : s)) }}
            >
              <Tooltip direction="top" sticky>{s.name}{s.condition ? ` · ${s.condition}` : ''}</Tooltip>
            </Marker>
          ))}
          {layers.incidents && visibleIncidents.map(i => (
            <CircleMarker
              key={`i-${i.id}`}
              pane="points"
              center={[i.point!.coordinates[1], i.point!.coordinates[0]]}
              radius={4}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#7c3aed', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" sticky>{i.title}</Tooltip>
            </CircleMarker>
          ))}
          {layers.rain && visibleRain.map(s => {
            const c = stationCoord(s)!
            return (
              <Marker
                key={`rn-${s.id}`}
                pane="points"
                position={c}
                icon={rainIcon(rainSel?.id === s.id)}
                eventHandlers={{ click: () => setRainSel(cur => (cur?.id === s.id ? null : s)) }}
              >
                <Tooltip direction="top" sticky>{s.title}{s.elevation != null ? ` · ${s.elevation} m` : ''}</Tooltip>
              </Marker>
            )
          })}
          {layers.rivers && visibleRivers.map(s => {
            const c = stationCoord(s)!
            const active = riverSel?.id === s.id
            return (
              <Marker
                key={`rv-${s.id}`}
                pane="points"
                position={c}
                icon={riverIcon(s, active)}
                eventHandlers={{ click: () => setRiverSel(cur => (cur?.id === s.id ? null : s)) }}
              >
                <Tooltip direction="top" sticky>{s.title} · {s.status ?? ''}</Tooltip>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      <div className="atlas-float atlas-legend" aria-hidden="true">
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0d7c5f', marginRight: '.25rem' }} />Projects</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginRight: '.25rem' }} />Hydro operational</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#2563eb', marginRight: '.25rem' }} />Hydro generation</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#d97706', marginRight: '.25rem' }} />Hydro survey</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0ea5e9', marginRight: '.25rem' }} />Rain gauge</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626', marginRight: '.25rem' }} />River level</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: '.25rem' }} />Tremors</span>
      </div>

      {stationSel && (
        <div className="atlas-float atlas-station">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>DHM STATION</p>
              <strong style={{ fontSize: '.95rem' }}>{stationSel.name}</strong>
              <p className="muted" style={{ margin: '.1rem 0 0', fontSize: '.62rem' }}>
                {stationSel.latitude.toFixed(2)}°N, {stationSel.longitude.toFixed(2)}°E
              </p>
            </div>
            <button onClick={() => setStationSel(null)} aria-label="Close station" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
          </div>
          {stationLoading ? (
            <p className="muted" style={{ fontSize: '.72rem', margin: '.7rem 0 0' }}>Reading live sensors…</p>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.7rem', marginTop: '.6rem' }}>
                <WeatherIcon kind={skyKind(stationSel.condition)} size={54} night={!isNptDay()} />
                <div>
                  <strong style={{ fontSize: '1.9rem', letterSpacing: '-.04em', lineHeight: 1, display: 'block' }}>
                    {stationWx?.temperature_2m != null ? `${stationWx.temperature_2m.toFixed(1)}°C` : '—'}
                  </strong>
                  <span style={{ fontSize: '.68rem' }} className="text-secondary">
                    {stationSel.condition ?? ''}{stationPm != null ? ` · PM2.5 ${stationPm.toFixed(1)}` : ''}
                  </span>
                </div>
              </div>
              {stationSel.sunrise && stationSel.sunset && (
                <p style={{ margin: '.45rem 0 0', fontSize: '.66rem' }} className="text-secondary">
                  ↑ {shortClock(stationSel.sunrise)} · ↓ {shortClock(stationSel.sunset)}
                </p>
              )}
              {stationHourly.length > 1 && (
                <div style={{ marginTop: '.5rem' }}>
                  <LineChart
                    data={stationHourly.filter((_, i) => i % 2 === 0).map(h => ({ year: h.time, value: h.value }))}
                    color="var(--primary)"
                    height={90}
                    formatValue={v => `${v.toFixed(1)}°C`}
                    title="Last 24 hours"
                  />
                </div>
              )}
              {stationSel.days.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', marginTop: '.4rem' }}>
                  {[...stationSel.days].sort((a, b) => (a.day ?? 0) - (b.day ?? 0)).slice(0, 3).map(d => (
                    <div key={d.day} className="signal" style={{ padding: '.5rem 0' }}>
                      <WeatherIcon kind={skyKind(d.weather?.name)} size={30} night={!isNptDay()} />
                      <div>
                        <strong>{d.from_temperature ?? '—'}° / {d.to_temperature ?? '—'}°</strong>
                        <p>{forecastDayLabel(d.day, undefined)} · {d.weather?.name ?? ''} · {d.rain_probability}% rain</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href={`/environment/${slugify(stationSel.name)}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.35rem',
                  marginTop: '.7rem', padding: '.55rem', borderRadius: 9,
                  fontSize: '.72rem', fontWeight: 800, background: 'var(--primary)', color: '#fff',
                }}
              >
                View full details →
              </Link>
            </>
          )}
        </div>
      )}

      {hydroSel && (
        <div className="atlas-float atlas-station" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ background: HYDRO_HEADER[hydroKind(hydroSel.licenseType)], color: '#fff', padding: '.9rem 1rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <p className="eyebrow" style={{ margin: 0, color: 'rgba(255,255,255,.85)' }}>HYDROPOWER · LICENCE REGISTER</p>
              <button onClick={() => setHydroSel(null)} aria-label="Close plant" style={{ fontSize: '.8rem', fontWeight: 700, color: '#fff', opacity: .8 }}>✕</button>
            </div>
            <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.2rem', lineHeight: 1.25 }}>{hydroSel.name}</strong>
            <span style={{ display: 'inline-block', marginTop: '.35rem', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.06em', padding: '.15rem .45rem', borderRadius: 99, background: 'rgba(255,255,255,.2)' }}>
              {hydroKind(hydroSel.licenseType) === 'operation' ? '● OPERATIONAL' : `○ ${HYDRO_KIND_LABEL[hydroKind(hydroSel.licenseType)].toUpperCase()}`}
            </span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.45rem', marginTop: '.5rem' }}>
              <strong style={{ fontSize: '2.2rem', letterSpacing: '-.04em', lineHeight: 1 }}>{hydroSel.mw}</strong>
              <span style={{ fontSize: '.72rem', opacity: .85 }}>MW licensed</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.22)', marginTop: '.6rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(4, (hydroSel.mw / 900) * 100))}%`, borderRadius: 99, background: 'linear-gradient(90deg, #67e8f9, #fff)' }} />
            </div>
            <p style={{ fontSize: '.6rem', margin: '.35rem 0 0', opacity: .7 }}>Scale vs the 900 MW class (Arun-3)</p>
          </div>
          <div style={{ padding: '.8rem 1rem .9rem', display: 'flex', flexDirection: 'column', gap: '.45rem', fontSize: '.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <MapPin size={14} style={{ color: HYDRO_KIND_COLOR[hydroKind(hydroSel.licenseType)], flexShrink: 0 }} /> {hydroSel.district}{hydroSel.municipality ? ` · ${hydroSel.municipality}` : ''}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <Waves size={14} style={{ color: HYDRO_KIND_COLOR[hydroKind(hydroSel.licenseType)], flexShrink: 0 }} /> {hydroSel.river} river
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <CalendarDays size={14} style={{ color: HYDRO_KIND_COLOR[hydroKind(hydroSel.licenseType)], flexShrink: 0 }} /> Licence {hydroSel.issueDate} · valid to {hydroSel.validity}
            </span>
            {hydroSel.promoter && (
              <span style={{ fontSize: '.66rem' }} className="text-tertiary">Promoter: {hydroSel.promoter}</span>
            )}
            <span style={{ fontSize: '.62rem' }} className="text-tertiary">
              {hydroSel.lat.toFixed(3)}°N, {hydroSel.lng.toFixed(3)}°E · Lic {hydroSel.licNo}
            </span>
          </div>
        </div>
      )}

      {riverSel && (() => {
        const lvl = riverLevel(riverSel)
        const cur = riverSel.waterLevel
        const dang = riverSel.dangerLevel
        const warn = riverSel.warningLevel
        const risk = populationAtRisk(riverSel)
        const area = stationArea(districts, riverSel)
        const pct = cur != null && dang != null && dang > 0 ? Math.min(100, Math.max(0, (cur / dang) * 100)) : null
        const warnPct = warn != null && dang != null && dang > 0 ? Math.min(100, (warn / dang) * 100) : null
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>RIVER STATION · BIPAD / HYDROLOGY</p>
                <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{riverSel.title}</strong>
                {area && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.25rem', fontSize: '.66rem' }} className="text-secondary">
                    <MapPin size={12} /> {area}{riverSel.elevation != null ? ` · ${riverSel.elevation} m` : ''}
                  </span>
                )}
              </div>
              <button onClick={() => setRiverSel(null)} aria-label="Close station" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginTop: '.6rem' }}>
              <strong style={{ fontSize: '2.1rem', letterSpacing: '-.04em', lineHeight: 1, color: RIVER_LEVEL_COLOR[lvl] }}>
                {cur != null ? cur.toFixed(2) : '—'}
              </strong>
              <span style={{ fontSize: '.7rem' }} className="text-secondary">m water level</span>
              <span style={{ marginLeft: 'auto', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.2rem .45rem', borderRadius: 99, color: '#fff', background: RIVER_LEVEL_COLOR[lvl] }}>
                {lvl === 'danger' ? 'Danger' : lvl === 'warn' ? 'Warning' : 'Normal'}
              </span>
            </div>
            {pct != null && (
              <div className="level-gauge" title={`Current ${cur} m · Warning ${warn ?? '—'} m · Danger ${dang} m`}>
                <span className="fill" style={{ width: `${pct}%`, background: RIVER_LEVEL_COLOR[lvl] }} />
                {warnPct != null && <span className="mark" style={{ left: `${warnPct}%` }} />}
                <span className="mark danger" style={{ left: '100%' }} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem', marginTop: '.6rem' }}>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Warning</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem' }}>{warn != null ? `${warn} m` : '—'}</strong>
              </div>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Danger</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem', color: 'var(--danger)' }}>{dang != null ? `${dang} m` : '—'}</strong>
              </div>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Trend</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem' }}>{riverSel.steady ? riverSel.steady.toLowerCase() : '—'}</strong>
              </div>
            </div>
            <p style={{ margin: '.6rem 0 0', fontSize: '.68rem' }} className="text-secondary">
              <strong>{riverSel.status ?? 'No reading'}</strong>{riverSel.basin ? ` · ${riverSel.basin} basin` : ''}
            </p>
            {risk && (
              <p style={{ margin: '.35rem 0 0', fontSize: '.66rem' }} className="text-secondary">
                Downstream reach: <strong>{risk.people.toLocaleString()}</strong> people · {risk.households.toLocaleString()} households
              </p>
            )}
            {typeof riverSel.description === 'string' && riverSel.description.trim() !== '' && riverSel.description !== '0' && (
              <p style={{ margin: '.35rem 0 0', fontSize: '.64rem' }} className="text-tertiary">{riverSel.description}</p>
            )}
            <p style={{ margin: '.4rem 0 0', fontSize: '.62rem' }} className="text-tertiary">
              {riverSel.waterLevelOn ? `Reading ${nptShort(riverSel.waterLevelOn)} NPT · ` : ''}
              {typeof riverSel.dataSource === 'string' && riverSel.dataSource ? `${riverSel.dataSource} · ` : ''}
              <a href="https://bipadportal.gov.np" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>BIPAD →</a>
            </p>
          </div>
        )
      })()}

      {rainSel && (() => {
        const avgs = (Array.isArray(rainSel.averages) ? rainSel.averages : []) as RainInterval[]
        const at = (iv: number) => avgs.find(a => a.interval === iv)
        const seeded = avgs.filter(a => a.value != null)
        const peak = seeded.reduce<RainInterval | null>((m, a) => (m == null || (a.value ?? 0) > (m.value ?? 0) ? a : m), null)
        const head = at(24)?.value ?? peak?.value ?? null
        const headIv = at(24)?.value != null ? 24 : peak?.interval
        const tone = peak?.status?.danger ? '#dc2626' : peak?.status?.warning ? '#d97706' : '#0ea5e9'
        const anyDanger = avgs.some(a => a.status?.danger)
        const risk = populationAtRisk(rainSel)
        const area = stationArea(districts, rainSel)
        const locality = rainLocality(rainSel)
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>RAIN GAUGE · BIPAD / HYDROLOGY</p>
                <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{rainSel.title}{locality && locality.toLowerCase() !== rainSel.title.toLowerCase() ? ` · ${locality}` : ''}</strong>
                {area && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', marginTop: '.25rem', fontSize: '.66rem' }} className="text-secondary">
                    <MapPin size={12} /> {area}{rainSel.elevation != null ? ` · ${rainSel.elevation} m` : ''}
                  </span>
                )}
              </div>
              <button onClick={() => setRainSel(null)} aria-label="Close gauge" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginTop: '.6rem' }}>
              <strong style={{ fontSize: '2.1rem', letterSpacing: '-.04em', lineHeight: 1, color: tone }}>
                {head != null ? head.toFixed(1) : '—'}
              </strong>
              <span style={{ fontSize: '.7rem' }} className="text-secondary">mm{headIv ? ` / ${headIv}h` : ''}</span>
              {anyDanger && (
                <span style={{ marginLeft: 'auto', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.2rem .45rem', borderRadius: 99, color: '#fff', background: '#dc2626' }}>Danger</span>
              )}
            </div>
            {seeded.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '.3rem', marginTop: '.6rem' }}>
                {[1, 3, 6, 12, 24].map(iv => {
                  const a = at(iv)
                  const danger = !!a?.status?.danger
                  return (
                    <div key={iv} style={{ padding: '.45rem .25rem', textAlign: 'center' }} className="bg-sunken rounded-[8px]">
                      <span style={{ fontSize: '.52rem', fontWeight: 700 }} className="text-tertiary">{iv}h</span>
                      <strong style={{ display: 'block', fontSize: '.72rem', marginTop: '.1rem', color: danger ? 'var(--danger)' : undefined }}>
                        {a?.value != null ? a.value.toFixed(1) : '—'}
                      </strong>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ margin: '.6rem 0 0', fontSize: '.68rem' }} className="text-tertiary">No rainfall recorded by this gauge yet.</p>
            )}
            <p style={{ margin: '.6rem 0 0', fontSize: '.68rem' }} className="text-secondary">
              <strong>{rainSel.status ?? 'No live reading'}</strong>{rainSel.basin ? ` · ${rainSel.basin} basin` : ''}
            </p>
            {risk && (
              <p style={{ margin: '.35rem 0 0', fontSize: '.66rem' }} className="text-secondary">
                Catchment reach: <strong>{risk.people.toLocaleString()}</strong> people · {risk.households.toLocaleString()} households
              </p>
            )}
            <p style={{ margin: '.4rem 0 0', fontSize: '.62rem' }} className="text-tertiary">
              {rainSel.measuredOn ? `Reading ${nptShort(rainSel.measuredOn)} NPT · ` : ''}
              {typeof rainSel.dataSource === 'string' && rainSel.dataSource ? `${rainSel.dataSource} · ` : ''}
              <a href="https://bipadportal.gov.np" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>BIPAD →</a>
            </p>
          </div>
        )
      })()}

      {quakeSel && (
        <div className="atlas-float atlas-station">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>TREMOR · USGS {quakeSel.time >= BS2083_START ? 'BS 2083' : 'ARCHIVE'}</p>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{quakeSel.place.replace(/, Nepal$/, '')}</strong>
            </div>
            <button onClick={() => setQuakeSel(null)} aria-label="Close tremor" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginTop: '.6rem' }}>
            <strong style={{ fontSize: '2.2rem', letterSpacing: '-.04em', lineHeight: 1, color: quakeSel.mag >= 4.5 ? 'var(--danger)' : 'var(--warning)' }}>
              M{quakeSel.mag.toFixed(1)}
            </strong>
            <span style={{ fontSize: '.7rem' }} className="text-secondary">magnitude</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', marginTop: '.6rem' }}>
            <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
              <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">When</span>
              <strong style={{ display: 'block', fontSize: '.76rem', marginTop: '.1rem' }}>
                {new Date(quakeSel.time).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kathmandu' })} NPT
              </strong>
            </div>
            <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
              <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Depth</span>
              <strong style={{ display: 'block', fontSize: '.76rem', marginTop: '.1rem' }}>{quakeSel.depthKm != null ? `${Math.round(quakeSel.depthKm)} km` : '—'}</strong>
            </div>
          </div>
          <p style={{ margin: '.55rem 0 0', fontSize: '.66rem' }} className="text-secondary">
            {quakeSel.coordinates[1].toFixed(3)}°N, {quakeSel.coordinates[0].toFixed(3)}°E ·{' '}
            <a href={quakeSel.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>USGS event page →</a>
          </p>
        </div>
      )}

      {muniSel && !stationSel && !hydroSel && !quakeSel && !riverSel && !rainSel && (
        <div className="atlas-float atlas-station">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>
                {canonDistrictKey(district ?? '') === muniSel.district ? (district?.toUpperCase() ?? '') + ' · PALIKA' : 'PALIKA'}
              </p>
              <strong style={{ fontSize: '1.1rem', display: 'block', marginTop: '.15rem' }}>{muniSel.name} {muniSel.type}</strong>
              <p className="muted" style={{ margin: '.1rem 0 0', fontSize: '.64rem' }}>
                {activeMunis.length} palikas in {district} · this one highlighted
              </p>
            </div>
            <button onClick={() => setMuniSel(null)} aria-label="Close palika" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
          </div>
          <p className="muted" style={{ fontSize: '.62rem', margin: '.6rem 0 0' }}>
            Click another palika to switch, or the district outline to step back out.
          </p>
        </div>
      )}

      {district && !muniSel && !stationSel && !hydroSel && !quakeSel && !riverSel && !rainSel && (() => {
        const d = districts.find(x => x.name === district)
        if (!d) return null
        const hq = localByName.get(normName(d.name))?.hq
        const inBox = d.bbox
        const nProj = projectPoints.filter(x => x.district === d.name).length
        const nHydro = inBox ? hydro.filter(h => h.lng >= inBox[0] && h.lng <= inBox[2] && h.lat >= inBox[1] && h.lat <= inBox[3]).length : 0
        const nQuake = inBox ? quakes.filter(q => q.coordinates[0] >= inBox[0] && q.coordinates[0] <= inBox[2] && q.coordinates[1] >= inBox[1] && q.coordinates[1] <= inBox[3]).length : 0
        const nInc = inBox ? incidents.filter(i => i.point && i.point.coordinates[0] >= inBox[0] && i.point.coordinates[0] <= inBox[2] && i.point.coordinates[1] >= inBox[1] && i.point.coordinates[1] <= inBox[3]).length : 0
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>{d.province.toUpperCase()} PROVINCE</p>
                <strong style={{ fontSize: '1.1rem', display: 'block', marginTop: '.15rem' }}>{d.name}</strong>
                <p className="muted" style={{ margin: '.1rem 0 0', fontSize: '.64rem' }}>
                  {hq ? `HQ ${hq} · ` : ''}{d.lat.toFixed(2)}°N, {d.lon.toFixed(2)}°E
                  {munisLoading
                    ? ' · loading palikas…'
                    : `${activeMunis.length > 0 ? ` · ${activeMunis.length} palikas` : ''}${activeParks.length > 0 ? ` · ${activeParks.length} protected` : ''}`}
                </p>
              </div>
              <button onClick={() => setDistrict(null)} aria-label="Close district" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', marginTop: '.7rem' }}>
              {[
                ['Projects', nProj, '#0d7c5f'],
                ['Hydro plants', nHydro, '#16a34a'],
                ['Tremors', nQuake, '#f59e0b'],
                ['Incidents', nInc, '#7c3aed'],
              ].map(([label, n, c]) => (
                <div key={label as string} style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
                  <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">{label}</span>
                  <strong style={{ display: 'block', fontSize: '1rem', marginTop: '.1rem', color: c as string }}>{n as number}</strong>
                </div>
              ))}
            </div>
            <p className="muted" style={{ fontSize: '.62rem', margin: '.6rem 0 0' }}>Projects in scope are listed in the right panel.</p>
          </div>
        )
      })()}

      <aside className="atlas-float atlas-side">
        <div className="panel" style={{ padding: '.9rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap' }}>
            <button onClick={() => selectProvince(null)} style={{ fontSize: '.68rem', fontWeight: 700 }} className="text-accent">
              {province ? (district ? `${province} / ${district}` : province) : 'Nepal'} ⌄
            </button>
            {(province || district) && (
              <button onClick={() => selectProvince(null)} style={{ fontSize: '.64rem', fontWeight: 600 }} className="text-tertiary">
                Reset ✕
              </button>
            )}
          </div>
          {province && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.6rem', maxHeight: 132, overflowY: 'auto' }}>
              {!districtsReady && <span className="muted" style={{ fontSize: '.66rem' }}>Loading 77 districts…</span>}
              {districtsReady && provinceDistricts.length === 0 && (
                <span style={{ fontSize: '.66rem', color: 'var(--danger)' }}>District list failed to load — check connection and retry.</span>
              )}
              {provinceDistricts.map(d => (
                <button
                  key={d.id}
                  onClick={() => setDistrict(cur => (cur === d.name ? null : d.name))}
                  style={{
                    fontSize: '.64rem', fontWeight: 600, padding: '.28rem .55rem', borderRadius: 16, cursor: 'pointer',
                    border: '1px solid var(--border-light)',
                    background: district === d.name ? 'var(--accent)' : 'var(--bg-sunken)',
                    color: district === d.name ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
          {province && !localLoading && localDistricts.length === 0 && (
            <p style={{ fontSize: '.64rem', margin: '.5rem 0 0' }} className="text-tertiary">
              Boundary shapes unavailable — district pins still work.
            </p>
          )}
          {province && localLoading && (
            <p style={{ fontSize: '.64rem', margin: '.5rem 0 0' }} className="text-tertiary">
              Loading {province} shapes…
            </p>
          )}
        </div>

        <div className="panel" style={{ padding: '.9rem 1rem' }}>
          <p className="eyebrow" style={{ margin: 0 }}>LAYERS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginTop: '.5rem' }}>
            {([
              ['projects', '#0d7c5f', `Projects (${counts.projects})`, '◎ exact · dashed ≈'],
              ['hydro', '#16a34a', `Hydropower (${counts.hydro})`, 'green op · blue gen · amber survey'],
              ['quakes', '#f59e0b', `Tremors 2083 (${counts.quakes})`, 'USGS live'],
              ['quakesPast', '#b45309', `Historical (${counts.quakesPast})`, 'older quakes'],
              ['weather', '#2563eb', `Stations (${counts.weather})`, 'DHM · tap for details'],
              ['incidents', '#7c3aed', `Incidents BS 2083 (${counts.incidents})`, 'BIPAD'],
              ['roads', '#b45309', `Highways (${counts.roads})`, 'ICIMOD network'],
              ['rain', '#0ea5e9', `Rain gauges (${counts.rain})`, 'tap for rainfall'],
              ['rivers', '#dc2626', `River stations (${counts.rivers})`, 'colour = flood level'],
              ['munis', '#94a3b8', `Municipalities (${district ? activeMunis.length : '—'})`, 'palika borders in district'],
              ['parks', '#0f766e', `Protected (${district ? activeParks.length : '—'})`, 'parks & reserves'],
            ] as [keyof Layers, string, string, string][]).map(([k, c, label, note]) => (
              <button
                key={k}
                onClick={() => toggle(k)}
                style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.72rem', fontWeight: 600, cursor: 'pointer', opacity: layers[k] ? 1 : 0.45, textAlign: 'left' }}
              >
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ flex: 1 }}>{label}</span>
                <span style={{ fontSize: '.58rem', fontWeight: 400 }} className="text-tertiary">{note}</span>
              </button>
            ))}
          </div>
          {layers.hydro && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem', marginTop: '.55rem' }}>
              {([['all', 'All'], ['operation', 'Operational'], ['generation', 'Generation'], ['survey', 'Survey']] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setHydroKindFilter(k)}
                  style={{
                    fontSize: '.6rem', fontWeight: 700, padding: '.22rem .5rem', borderRadius: 16, cursor: 'pointer',
                    border: '1px solid var(--border-light)',
                    background: hydroKindFilter === k ? (k === 'all' ? 'var(--accent)' : HYDRO_KIND_COLOR[k]) : 'var(--bg-sunken)',
                    color: hydroKindFilter === k ? '#fff' : 'var(--text-secondary)',
                  }}
                >
                  {k !== 'all' && <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: 99, marginRight: '.3rem', background: hydroKindFilter === k ? '#fff' : HYDRO_KIND_COLOR[k] }} />}
                  {label}
                </button>
              ))}
            </div>
          )}
          <div style={{ marginTop: '.7rem', display: 'flex', flexDirection: 'column', gap: '.32rem' }}>
            <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Licensed capacity</span>
            {(['operation', 'generation', 'survey'] as const).map(k => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.66rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: HYDRO_KIND_COLOR[k], flexShrink: 0 }} />
                <span style={{ flex: 1 }} className="text-secondary">{HYDRO_KIND_LABEL[k]}</span>
                <strong style={{ minWidth: 34, textAlign: 'right' }}>{hydroTotals[k].n}</strong>
                <span className="text-tertiary" style={{ minWidth: 66, textAlign: 'right' }}>{hydroTotals[k].mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW</span>
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.66rem', borderTop: '1px solid var(--border-light)', paddingTop: '.32rem', marginTop: '.05rem' }}>
              <span style={{ flex: 1, fontWeight: 700 }}>Total register</span>
              <strong style={{ minWidth: 34, textAlign: 'right' }}>{hydroTotals.operation.n + hydroTotals.generation.n + hydroTotals.survey.n}</strong>
              <span className="text-tertiary" style={{ minWidth: 66, textAlign: 'right' }}>{(hydroTotals.operation.mw + hydroTotals.generation.mw + hydroTotals.survey.mw).toLocaleString(undefined, { maximumFractionDigits: 0 })} MW</span>
            </div>
          </div>
        </div>

        <div className="panel" style={{ padding: '.9rem 1rem' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {district ? `IN ${district.toUpperCase()}` : province ? `IN ${province.toUpperCase()}` : 'ON THIS VIEW'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '.4rem', maxHeight: 300, overflowY: 'auto' }}>
            {visibleProjects.length === 0 && <p className="muted" style={{ fontSize: '.7rem' }}>No tracked projects here — try clearing the district.</p>}
            {visibleProjects.map(({ p, district: dd, provinceLevel, exact, siteLabel }) => (
              <Link key={p.name} href={`/projects/${slugify(p.name)}`} className="source-row" style={{ padding: '.5rem 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[p.status] ?? '#0d7c5f', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '.74rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                  <p style={{ margin: 0 }}>{p.status} · {p.progress}% · {p.budget} · {exact ? `◎ ${siteLabel}` : `≈ ${dd ?? `${p.province} province`}`}</p>
                </div>
              </Link>
            ))}
            {nationalProjects.length > 0 && !district && (
              <p className="muted" style={{ fontSize: '.64rem', marginTop: '.4rem' }}>
                + {nationalProjects.length} national-scope projects (corridors, rail) listed in the tracker, not pinned.
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  )
}
