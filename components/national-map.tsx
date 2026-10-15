'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { projects, slugify } from '@/lib/data'
import { matchDistricts } from '@/lib/geo'
import { fetchBipadDistricts, fetchDistrictPolygons, fetchLocalDistricts, districtsFromPolygons, provinceBbox, normName, type BipadDistrict, type LocalDistrict } from '@/lib/district-geo'
import { fetchNaxaHydroProjects, type NaxaHydroProject } from '@/lib/naxa'
import { fetchNepalQuakes, type NepalQuake } from '@/lib/meteo'
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

type Layers = { projects: boolean; hydro: boolean; quakes: boolean; weather: boolean; incidents: boolean }

function FitHelper({ bbox }: { bbox: [[number, number], [number, number]] | null }) {
  const map = useMap()
  const first = useRef(true)
  useEffect(() => {
    if (!bbox) return
    // Suspend the fence mid-flight — maxBoundsViscosity otherwise drags the
    // animation sideways and the view lands off-target, then snaps again.
    const prev = map.options.maxBounds
    map.setMaxBounds(undefined as never)
    map.flyToBounds(bbox, { padding: [60, 60], duration: first.current ? 0.1 : 1.2 })
    first.current = false
    const restore = () => {
      map.setMaxBounds(prev as never)
      map.off('moveend', restore as never)
    }
    map.on('moveend', restore as never)
    return () => {
      map.off('moveend', restore as never)
      map.setMaxBounds(prev as never)
    }
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

type DhmStation = { id: number; name: string; latitude: number; longitude: number; condition?: string }

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
  const [districtsReady, setDistrictsReady] = useState(false)
  const [districtsLive, setDistrictsLive] = useState(false)
  const liveRef = useRef(false)
  const [localLoading, setLocalLoading] = useState(false)
  const [polyCount, setPolyCount] = useState<number | null>(null)
  const [layers, setLayers] = useState<Layers>({ projects: true, hydro: true, quakes: true, weather: false, incidents: false })

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
    fetchNepalQuakes(25).then(q => { if (!cancelled) setQuakes(q) }).catch(() => {})
    fetchDhmForecast().then(f => {
      if (cancelled) return
      setStations((f?.stations ?? []).map(s => ({
        id: s.id, name: s.name, latitude: s.latitude, longitude: s.longitude,
        condition: s.manual_forecast?.[0]?.weather?.name ?? undefined,
      })))
    }).catch(() => {})
    fetchBipadIncidents(30).then(i => { if (!cancelled) setIncidents(i.results) }).catch(() => {})
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
      const base = d ?? fallback
      if (!base || p.province === 'National') return { p, district: d?.name ?? null, lat: null as number | null, lon: null as number | null }
      const j = hash01(p.name)
      const j2 = hash01(p.location + p.name)
      return { p, district: d?.name ?? null, lat: base.lat + (j - 0.5) * 0.22, lon: base.lon + (j2 - 0.5) * 0.22 }
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
  const visibleStations = stations.filter(s => inScope(s.latitude, s.longitude))
  const visibleIncidents = incidents.filter(i => i.point && inScope(i.point.coordinates[1], i.point.coordinates[0]))

  const selectProvince = (p: string | null) => {
    setProvince(p)
    setDistrict(null)
  }

  const counts = {
    projects: visibleProjects.length,
    hydro: visibleHydro.length,
    quakes: visibleQuakes.length,
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
          maxBounds={[[24.5, 78.0] as [number, number], [32.0, 90.5] as [number, number]]}
          maxBoundsViscosity={0.3}
          style={{ height: '100%', width: '100%', background: '#eef2f0' }}
          attributionControl={true}
        ><TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
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
          {layers.projects && visibleProjects.map(({ p, district: dd, lat, lon }) => (
            <CircleMarker
              key={`p-${p.name}`}
              center={[lat as number, lon as number]}
              radius={6}
              pathOptions={{ color: '#ffffff', weight: 1.5, fillColor: STATUS_COLOR[p.status] ?? '#0d7c5f', fillOpacity: 0.95 }}
            >
              <Tooltip direction="top" sticky>{p.name} · {p.progress}%</Tooltip>
              <Popup>
                <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>
                  <strong>{p.name}</strong><br />
                  {p.status} · {p.progress}% · {p.budget}
                  {dd ? <><br />≈ {dd} district (approx.)</> : null}<br />
                  <a href={`/projects/${slugify(p.name)}`}>Open tracker →</a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {layers.hydro && visibleHydro.map((h, i) => (
            <CircleMarker
              key={`h-${h.name}-${i}`}
              center={[h.lat, h.lng]}
              radius={Math.min(11, 3 + Math.sqrt(Math.max(0, h.mw)) / 4)}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#0891b2', fillOpacity: 0.85 }}
            >
              <Tooltip direction="top" sticky>{h.name} · {h.mw} MW</Tooltip>
              <Popup>
                <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>
                  <strong>{h.name}</strong><br />
                  {h.mw} MW · {h.river} river<br />
                  Commissioned {h.startYear}
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {layers.quakes && visibleQuakes.map(q => (
            <CircleMarker
              key={`q-${q.id}`}
              center={[q.coordinates[1], q.coordinates[0]]}
              radius={3 + q.mag}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: q.mag >= 4.5 ? '#dc2626' : '#f59e0b', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" sticky>M{q.mag.toFixed(1)} · {q.place}</Tooltip>
              <Popup>
                <div style={{ fontSize: '.75rem', lineHeight: 1.45 }}>
                  <strong>Magnitude {q.mag.toFixed(1)}</strong><br />
                  {q.place}<br />
                  <a href={q.url} target="_blank" rel="noreferrer">USGS event →</a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
          {layers.weather && visibleStations.map(s => (
            <CircleMarker
              key={`w-${s.id}`}
              center={[s.latitude, s.longitude]}
              radius={4}
              pathOptions={{ color: '#ffffff', weight: 1, fillColor: '#2563eb', fillOpacity: 0.9 }}
            >
              <Tooltip direction="top" sticky>{s.name}{s.condition ? ` · ${s.condition}` : ''}</Tooltip>
            </CircleMarker>
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
              ['projects', '#16a34a', `Projects (${counts.projects})`, 'district-centroid ≈'],
              ['hydro', '#0891b2', `Hydropower (${counts.hydro})`, 'GPS exact'],
              ['quakes', '#f59e0b', `Tremors (${counts.quakes})`, 'USGS live'],
              ['weather', '#2563eb', `Weather stations (${counts.weather})`, 'DHM'],
              ['incidents', '#7c3aed', `Incidents (${counts.incidents})`, 'BIPAD'],
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
            {visibleProjects.map(({ p }) => (
              <Link key={p.name} href={`/projects/${slugify(p.name)}`} className="source-row" style={{ padding: '.5rem 0' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[p.status] ?? '#0d7c5f', flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: '.74rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</strong>
                  <p style={{ margin: 0 }}>{p.status} · {p.progress}% · {p.budget}</p>
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
