'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Waves, CalendarDays, MapPin } from 'lucide-react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { projects, slugify } from '@/lib/data'
import { forecastDayLabel, isNptDay, isDayBySun, shortClock } from '@/lib/time'
import { formatNprText } from '@/lib/currency'
import { matchDistricts } from '@/lib/geo'
import { fetchBipadDistricts, fetchDistrictPolygons, fetchLocalDistricts, districtsFromPolygons, provinceBbox, normName, type BipadDistrict, type LocalDistrict } from '@/lib/district-geo'
import { fetchNaxaHydroProjects, type NaxaHydroProject } from '@/lib/naxa'
import { fetchNepalQuakes, fetchCurrentWeather, fetchCurrentPm25, fetchHourlyTemps, type NepalQuake, type CurrentWeather } from '@/lib/meteo'
import { LineChart } from '@/components/charts'
import { WeatherIcon } from '@/components/weather-icon'
import { skyKind } from '@/lib/condition'
import { skyMarkerSvg, hydroPinSvg, quakePinSvg } from '@/lib/sky-svg'
import L from 'leaflet'
import { fetchDhmForecast } from '@/lib/dhm'
import { fetchBipadIncidents } from '@/lib/bipad'
import type { BipadIncident } from '@/lib/bipad'

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

// Name variants between BIPAD and DataNepal spellings (mirrors lib/geo SPELL_FIX).
const NAME_ALIAS: Record<string, string> = {
  chitawan: 'chitwan',
  chitwan: 'chitawan',
  dhanusa: 'dhanusha',
  dhanusha: 'dhanusa',
  makwanpur: 'makawanpur',
  makawanpur: 'makwanpur',
  sindhupalchok: 'sindhupalchowk',
  sindhupalchowk: 'sindhupalchok',
}

function hash01(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000
  return h / 1000
}

const NEPAL_BBOX: [[number, number], [number, number]] = [[26.2, 80.2], [30.4, 88.3]]

type Layers = { projects: boolean; hydro: boolean; quakes: boolean; quakesPast: boolean; weather: boolean; incidents: boolean }

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
    const base = () => {
      const isActive = target != null && target === selected
      const dimmed = selected != null && !isActive
      return {
        weight: isActive ? 2 : 1.1,
        fillOpacity: isActive ? 0.55 : dimmed ? 0.3 : 0.75,
        color: isActive ? '#0d7c5f' : '#94a3b8',
      }
    }
    l.bindTooltip(label, { sticky: true, direction: 'top' })
    l.on('click', () => { if (target) selectProvince(target) })
    l.on('mouseover', () => l.setStyle({ weight: 2.4, fillOpacity: 0.9, color: '#0d7c5f' }))
    l.on('mouseout', () => l.setStyle(base()))
  }
}

function districtStyle(f: any, district: string | null) {
  const active = f?.properties?._district === district
  return { fillColor: active ? '#0d7c5f' : '#ffffff', color: active ? '#0d7c5f' : '#64748b', weight: active ? 2.2 : 1, fillOpacity: active ? 0.85 : 0.6 }
}

function makeDistrictEach(setDistrict: (fn: (cur: string | null) => string | null) => void) {
  return (f: any, l: any) => {
    const name: string = f?.properties?._district ?? f?.properties?.name ?? ''
    l.bindTooltip(name, { sticky: true, direction: 'top' })
    l.on('click', () => setDistrict(cur => (cur === name ? null : name)))
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
  const [hydro, setHydro] = useState<NaxaHydroProject[]>([])
  const [quakes, setQuakes] = useState<NepalQuake[]>([])
  const [stations, setStations] = useState<DhmStation[]>([])
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [province, setProvince] = useState<string | null>(null)
  const [district, setDistrict] = useState<string | null>(null)
  const [stationSel, setStationSel] = useState<DhmStation | null>(null)
  const [hydroSel, setHydroSel] = useState<NaxaHydroProject | null>(null)
  const [stationWx, setStationWx] = useState<CurrentWeather | null>(null)
  const [stationPm, setStationPm] = useState<number | null>(null)
  const [stationHourly, setStationHourly] = useState<{ time: string; value: number }[]>([])
  const [stationLoading, setStationLoading] = useState(false)
  const [districtsReady, setDistrictsReady] = useState(false)
  const [districtsLive, setDistrictsLive] = useState(false)
  const liveRef = useRef(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [polyCount, setPolyCount] = useState<number | null>(null)
  const [layers, setLayers] = useState<Layers>({ projects: true, hydro: true, quakes: true, quakesPast: false, weather: false, incidents: false })
  const [quakeSel, setQuakeSel] = useState<NepalQuake | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/geo/nepal-provinces-simple.geojson')
      .then(r => r.json())
      .then(d => { if (!cancelled) setProvinceGeo(d) })
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
    fetchNaxaHydroProjects().then(h => { if (!cancelled) setHydro(h) }).catch(() => {})
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
      const hits = matchDistricts(`${p.name} ${p.location}`)
      const d = hits.map(h => byNorm.get(normName(h))).find(Boolean)
      const fallback = provCentroid.get(p.province ?? '')
      // Granularity chain: matched district → province centroid → unpinned (national).
      const base = d ?? fallback
      if (!base || p.province === 'National') return { p, district: d?.name ?? null, provinceLevel: false, lat: null as number | null, lon: null as number | null }
      const j = hash01(p.name)
      const j2 = hash01(p.location + p.name)
      return { p, district: d?.name ?? null, provinceLevel: !d, lat: base.lat + (j - 0.5) * 0.22, lon: base.lon + (j2 - 0.5) * 0.22 }
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
  const visibleHydro = hydro.filter(h => inScope(h.lat, h.lng))
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
  }

  const toggle = (k: keyof Layers) => setLayers(l => ({ ...l, [k]: !l[k] }))

  return (
    <>
      <div className="atlas-map">
        <MapContainer
          center={[28.4, 84.2] as [number, number]}
          zoom={7}
          minZoom={5}
          maxZoom={12}
          worldCopyJump={true}
          style={{ height: '100%', width: '100%', background: '#eef2f0' }}
          className={isNptDay() ? undefined : 'night-tiles'}
          attributionControl={true}
        >          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics &amp; OpenStreetMap contributors"
          />
          <FitHelper bbox={fit ?? NEPAL_BBOX} />
          <MapDeselect
            onEmptyClick={() => {
              if (district) setDistrict(null)
              else if (province) selectProvince(null)
            }}
          />
          {provinceGeo && (
            <GeoJSON
              key={`provinces-${province ?? 'all'}`}
              data={provinceGeo as any}
              style={(f: any) => {
                const id: number | undefined = f?.properties?.id
                const isActive = province != null && id != null && PROVINCE_ID_TO_NAME[id] === province
                const dimmed = province != null && !isActive
                return {
                  fillColor: isActive ? '#0d7c5f' : '#ffffff',
                  color: isActive ? '#0d7c5f' : '#94a3b8',
                  weight: isActive ? 2 : 1.1,
                  fillOpacity: isActive ? 0.55 : dimmed ? 0.3 : 0.75,
                  opacity: dimmed ? 0.6 : 1,
                }
              }}
              onEachFeature={makeProvinceEach(selectProvince, province) as any}
            />
          )}
          {province && districtFeatures.features.length > 0 && (
            <GeoJSON
              key={`districts-${province}`}
              data={districtFeatures as any}
              style={(f: any) => districtStyle(f, district)}
              onEachFeature={makeDistrictEach(setDistrict) as any}
            />
          )}
          {province && provinceDistricts.map(d => {
            const hq = localByName.get(normName(d.name))?.hq
            return (
              <CircleMarker
                key={`dc-${d.id}`}
                center={[d.lat, d.lon] as [number, number]}
                radius={district === d.name ? 9 : 6}
                pathOptions={{
                  color: district === d.name ? '#0d7c5f' : '#475569',
                  weight: 2,
                  fillColor: district === d.name ? '#0d7c5f' : '#ffffff',
                  fillOpacity: district === d.name ? 0.9 : 0.85,
                }}
                eventHandlers={{ click: () => setDistrict(cur => (cur === d.name ? null : d.name)) }}
              >
                <Tooltip direction="top" sticky>{hq ? `${d.name} · HQ ${hq}` : d.name}</Tooltip>
              </CircleMarker>
            )
          })}
          {layers.projects && visibleProjects.map(({ p, district: dd, provinceLevel, lat, lon }) => (
            <CircleMarker
              key={`p-${p.name}`}
              center={[lat as number, lon as number]}
              radius={provinceLevel ? 8 : 6}
              pathOptions={{
                color: '#ffffff', weight: 1.5,
                fillColor: STATUS_COLOR[p.status] ?? '#0d7c5f',
                fillOpacity: 0.95,
                dashArray: provinceLevel ? '3 2' : undefined,
              }}
            >
              <Tooltip direction="top" sticky>{p.name} · {p.progress}%</Tooltip>
              <Popup>
                <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>
                  <strong>{p.name}</strong><br />
                  {p.status} · {p.progress}% · {p.budget}
                  {dd ? <><br />≈ {dd} district</> : <><br />≈ {p.province} (province-level pin)</>}<br />
                  <a href={`/projects/${slugify(p.name)}`}>Open tracker →</a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {layers.hydro && visibleHydro.map((h, i) => (
            <Marker
              key={`h-${h.name}-${i}`}
              position={[h.lat, h.lng]}
              icon={L.divIcon({
                html: `<span class="hydro-pin${hydroSel?.name === h.name ? ' active' : ''}">${hydroPinSvg(h.mw)}</span>`,
                className: 'hydro-pin-wrap',
                iconSize: [34, 34],
                iconAnchor: [17, 17],
              })}
              eventHandlers={{ click: () => setHydroSel(cur => (cur?.name === h.name ? null : h)) }}
            >
              <Tooltip direction="top" sticky>{h.name} · {h.mw} MW</Tooltip>
            </Marker>
          ))}
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
              center={[i.point!.coordinates[1], i.point!.coordinates[0]]}
              radius={4}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#7c3aed', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" sticky>{i.title}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>

      <div className="atlas-float atlas-legend" aria-hidden="true">
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a', marginRight: '.25rem' }} />Projects</span>
        <span><i style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#0891b2', marginRight: '.25rem' }} />Hydro</span>
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
          <div style={{ background: 'linear-gradient(135deg, #0e7490 0%, #155e75 60%, #164e63 100%)', color: '#fff', padding: '.9rem 1rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <p className="eyebrow" style={{ margin: 0, color: '#a5f3fc' }}>HYDROPOWER · NITI/NAXA</p>
              <button onClick={() => setHydroSel(null)} aria-label="Close plant" style={{ fontSize: '.8rem', fontWeight: 700, color: '#fff', opacity: .8 }}>✕</button>
            </div>
            <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.2rem', lineHeight: 1.25 }}>{hydroSel.name}</strong>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.45rem', marginTop: '.5rem' }}>
              <strong style={{ fontSize: '2.2rem', letterSpacing: '-.04em', lineHeight: 1 }}>{hydroSel.mw}</strong>
              <span style={{ fontSize: '.72rem', opacity: .85 }}>MW installed</span>
            </div>
            <div style={{ height: 6, borderRadius: 99, background: 'rgba(255,255,255,.22)', marginTop: '.6rem', position: 'relative' }}>
              <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${Math.min(100, Math.max(4, (hydroSel.mw / 900) * 100))}%`, borderRadius: 99, background: 'linear-gradient(90deg, #67e8f9, #fff)' }} />
            </div>
            <p style={{ fontSize: '.6rem', margin: '.35rem 0 0', opacity: .7 }}>Scale vs the 900 MW class (Arun-3)</p>
          </div>
          <div style={{ padding: '.8rem 1rem .9rem', display: 'flex', flexDirection: 'column', gap: '.45rem', fontSize: '.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <Waves size={14} style={{ color: '#0891b2', flexShrink: 0 }} /> {hydroSel.river} river
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <CalendarDays size={14} style={{ color: '#0891b2', flexShrink: 0 }} /> Commissioned {hydroSel.startYear}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <MapPin size={14} style={{ color: '#0891b2', flexShrink: 0 }} /> {hydroSel.lat.toFixed(3)}°N, {hydroSel.lng.toFixed(3)}°E · GPS-exact
            </span>
          </div>
        </div>
      )}

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

      {district && !stationSel && !hydroSel && !quakeSel && (() => {
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
                </p>
              </div>
              <button onClick={() => setDistrict(null)} aria-label="Close district" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem', marginTop: '.7rem' }}>
              {[
                ['Projects', nProj, '#16a34a'],
                ['Hydro plants', nHydro, '#0891b2'],
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
              ['projects', '#16a34a', `Projects (${counts.projects})`, 'district ≈ · dashed = province'],
              ['hydro', '#0891b2', `Hydropower (${counts.hydro})`, 'GPS exact'],
              ['quakes', '#f59e0b', `Tremors 2083 (${counts.quakes})`, 'USGS live'],
              ['quakesPast', '#b45309', `Historical (${counts.quakesPast})`, 'older quakes'],
              ['weather', '#2563eb', `Stations (${counts.weather})`, 'DHM · tap for details'],
              ['incidents', '#7c3aed', `Incidents BS 2083 (${counts.incidents})`, 'BIPAD'],
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
        </div>

        <div className="panel" style={{ padding: '.9rem 1rem' }}>
          <p className="eyebrow" style={{ margin: 0 }}>
            {district ? `IN ${district.toUpperCase()}` : province ? `IN ${province.toUpperCase()}` : 'ON THIS VIEW'}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: '.4rem', maxHeight: 300, overflowY: 'auto' }}>
            {visibleProjects.length === 0 && <p className="muted" style={{ fontSize: '.7rem' }}>No tracked projects here — try clearing the district.</p>}
            {visibleProjects.map(({ p, district: dd, provinceLevel }) => (
              <Link key={p.name} href={`/projects/${slugify(p.name)}`} className="source-row" style={{ padding: '.5rem 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[p.status] ?? '#0d7c5f', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '.74rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                  <p style={{ margin: 0 }}>{p.status} · {p.progress}% · {p.budget} · ≈ {dd ?? `${p.province} province`}</p>
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
