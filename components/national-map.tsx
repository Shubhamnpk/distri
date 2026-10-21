'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import Link from 'next/link'
import {
  Waves, CalendarDays, MapPin, ArrowLeft, Zap, Building2, Activity, History,
  AlertTriangle, CloudRain, SunMedium, Navigation, Landmark, TreePine,
  Plus, Minus, RotateCcw, SlidersHorizontal, ChevronDown, X, Sun, Moon,
  Maximize, Minimize, Search, Layers as LayersIcon, Check,
} from 'lucide-react'
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Marker, Popup, Tooltip, Pane, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { projects, slugify } from '@/lib/data'
import { projectSite } from '@/lib/project-coords'
import { forecastDayLabel, isNptDay, isDayBySun, shortClock } from '@/lib/time'
import { formatNpr, formatNprText } from '@/lib/currency'
import { matchDistricts } from '@/lib/geo'
import { fetchBipadDistricts, fetchDistrictPolygons, fetchLocalDistricts, districtsFromPolygons, provinceBbox, normName, fetchLocalMunicipalities, canonDistrictKey, fetchLocalProtected, fetchProvinceShapes, type BipadDistrict, type LocalDistrict, type LocalMunicipality } from '@/lib/district-geo'
import { fetchHydroProjects, hydroKind, HYDRO_KIND_COLOR, HYDRO_KIND_LABEL, type HydroProject, type HydroKind } from '@/lib/hydro'
import { OsmRoads } from '@/components/osm-roads'
import { fetchNepalQuakes, fetchCurrentWeather, fetchCurrentPm25, fetchHourlyTemps, fetchPm25Grid, NEPAL_PM25_GRID, type NepalQuake, type CurrentWeather } from '@/lib/meteo'
import { LineChart } from '@/components/charts'
import { WeatherIcon } from '@/components/weather-icon'
import { skyKind } from '@/lib/condition'
import { skyMarkerSvg, quakePinSvg } from '@/lib/sky-svg'
import { hazardPinSvg } from '@/lib/hazard-svg'
import L from 'leaflet'
import { fetchDhmForecast } from '@/lib/dhm'
import { fetchBipadIncidents, fetchBipadRainStationsAll, fetchBipadRiverStationsAll, fetchBipadDistrictProfile, fetchBipadDistrictIds, fetchBipadQuakeRisk, fetchBipadRoadBlocks, fetchBipadPalikaCensus, fetchBipadHazards, fetchBipadIncidentDetail, fetchBipadLoss, fetchBipadIncidentPlace, type PalikaCensus } from '@/lib/bipad'
import type { BipadIncident, BipadStation, DistrictProfile, BipadQuakeRisk, BipadRoadBlock, BipadHazard, BipadIncidentDetail, BipadLoss, BipadIncidentPlace } from '@/lib/bipad'
import { useTheme } from '@/components/theme-provider'

const PROVINCES = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'] as const

/** Local geojson uses numeric ids 1–7 ("Province No. 1/2" for Koshi/Madhesh): match by id, never by name. */
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

/** Municipality border by palika class. Borders only (no fill) so the map
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

/** Protected areas — globally visible when parks layer is on.
 *  Selected park gets strongest highlight; active-district parks get medium;
 *  all others show as a faint translucent green presence. */
function parkStyle(f: any, activeKey: string | null, selectedPark: string | null) {
  const inActiveDistrict = activeKey != null && f?.properties?._dkey === activeKey
  const isSelected = selectedPark != null && f?.properties?._muni === selectedPark
  if (isSelected) return { color: '#065f46', weight: 2.2, fillColor: '#10b981', fillOpacity: 0.28, dashArray: undefined, opacity: 1 }
  if (inActiveDistrict) return { color: '#0f766e', weight: 1.6, fillColor: '#0f766e', fillOpacity: 0.18, dashArray: '6 4', opacity: 0.95 }
  return { color: '#0f766e', weight: 0.8, fillColor: '#0f766e', fillOpacity: 0.06, dashArray: '4 3', opacity: 0.55 }
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

/** Rainfall window the heat map shows, in hours. */
const RAIN_HEAT_INTERVAL = 24
/** Readings past this are sensor faults, not weather (Nepal's 24 h records sit well under it). */
const RAIN_SANE_MM = 500
/** A gauge whose last reading is older than this is stale - kept out of a "now" heat map. */
const RAIN_FRESH_H = 48

/** A gauge's 24 h rainfall, or null when its reading is missing, implausible or stale. */
function rainReading(s: BipadStation): number | null {
  const avgs = Array.isArray(s.averages) ? s.averages : []
  const v = avgs.find(a => a?.interval === RAIN_HEAT_INTERVAL)?.value
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > RAIN_SANE_MM) return null
  const at = s.measuredOn ? Date.parse(s.measuredOn) : NaN
  if (Number.isNaN(at) || Date.now() - at > RAIN_FRESH_H * 3_600_000) return null
  return v
}

/** Drizzle → cloudburst. Colour climbs with the accumulation; alpha climbs with it too. */
const RAIN_RAMP: [number, [number, number, number]][] = [
  [0.2, [56, 189, 248]],
  [2, [34, 197, 94]],
  [6, [250, 204, 21]],
  [15, [249, 115, 22]],
  [30, [239, 68, 68]],
  [60, [190, 24, 93]],
]

/** The neutral band for a watched, rainless cell. Slate rather than near-white: the
 *  basemap is already pale, so a light grey wash would be invisible on it. */
const RAIN_NEUTRAL_RGB: [number, number, number] = [100, 116, 139]
/** Ground no gauge reaches at all: barely tinted, so a real hole stays distinguishable
 *  from "watched, and it did not rain". */
const RAIN_VEIL_A = 0.05
/** A watched-but-dry cell: a solid neutral cell, so the honeycomb reads across the dry
 *  half of the country without claiming rain there. */
const RAIN_DRY_A = 0.45
/** A gauge tints its cell out to the next gauge, but never past this reach, so we never
 *  paint rainfall over ground no gauge actually watches. Wide enough that the thin gauge
 *  network up in the high mountains still falls inside someone's cell. */
const RAIN_COVER_KM = 250
/** Field resolution: one sample per N screen px, smoothed up to full size afterwards.
 *  Small enough that the cell seams read as a honeycomb rather than a blur. */
const RAIN_SAMPLE_PX = 6
/** The canvas is oversized by this much on every side: panning inside the margin is free
 *  (Leaflet drags the pane), and a redraw only happens on zoom or past the margin. */
const RAIN_MARGIN_PX = 300
/** Spatial-bucket size for the nearest-gauge search. Kept small and fixed: sizing it to
 *  the gauge reach would put every gauge in the country in a sample's neighbourhood. */
const RAIN_BUCKET_PX = 48

function rainColor(mm: number): [number, number, number] {
  let c = RAIN_RAMP[0][1]
  for (const [at, rgb] of RAIN_RAMP) if (mm >= at) c = rgb
  return c
}

const RAIN_HEAT_GRADIENT =
  'linear-gradient(90deg, #38bdf8 0%, #22c55e 22%, #facc15 45%, #f97316 65%, #ef4444 82%, #be185d 100%)'

/** PM2.5 bands are the WHO 24 h air-quality guidelines and interim targets (15, 25, 35,
 *  50) with the guide value 5 at the clean end and the unhealthiest band on top. */
const PM25_RAMP: [number, [number, number, number]][] = [
  [5, [34, 197, 94]],
  [15, [250, 204, 21]],
  [25, [249, 115, 22]],
  [35, [239, 68, 68]],
  [50, [153, 27, 27]],
  [75, [126, 34, 206]],
]
/** A grid node owns its cell out to `coverKm`, so this reaches the half-diagonal of the
 *  ~0.4° sampling lattice - every point in Nepal still lands inside someone's cell. */
const PM25_COVER_KM = 45

function pm25Color(v: number): [number, number, number] {
  let c = PM25_RAMP[0][1]
  for (const [at, rgb] of PM25_RAMP) if (v >= at) c = rgb
  return c
}

const PM25_HEAT_GRADIENT =
  'linear-gradient(90deg, #22c55e 0%, #facc15 24%, #f97316 44%, #ef4444 62%, #991b1b 80%, #7e22ce 100%)'

const ROAD_STATUS: Record<string, { color: string; label: string }> = {
  CLOSED: { color: '#dc2626', label: 'Closed' },
  PARTIAL_OPEN: { color: '#f59e0b', label: 'Partially open' },
  OPEN: { color: '#16a34a', label: 'Reopened' },
}

/** Only live obstructions are mapped: DoR's `status` is the latest reported state, so
 *  reopened (OPEN) events are dropped rather than drawn as if the road were still shut. */
const roadBlocked = (r: BipadRoadBlock) => r.status === 'CLOSED' || r.status === 'PARTIAL_OPEN'
const roadClosed = (r: BipadRoadBlock) => r.status === 'CLOSED'

/** "NH03" and "NH3" are the same highway — group labels and the DoR log on this key. */
const roadRefKey = (s?: string | null) =>
  (s ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NH0*(\d+)$/, 'NH$1')

/** BIPAD's 24px line-art icons disappear at pin size, so incidents reuse the
 *  hydro/quake approach: a bold inline-SVG glyph on the hazard's own colour. */
function incidentPin(h?: BipadHazard, id?: number | null) {
  return L.divIcon({
    className: 'atlas-incident-pin',
    html: hazardPinSvg(id ?? h?.id, h?.color || '#7c3aed'),
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

/** DoR timestamps occasionally arrive as BS dates ("2083-03-29") — refuse those rather than print a year that cannot exist. */
function roadWhen(s?: string | null): string | null {
  if (!s) return null
  const d = new Date(s)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000 || d.getFullYear() > 2100) return null
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** The shape the heat fields are clipped to: country, open province, or open district. */
type RainBoundary = { type?: string; features?: { properties?: { id?: number }; geometry?: unknown }[] } | null

type HeatSample = { id: number; lat: number; lon: number; v: number }
/** Colour for one field sample: `null` means no sample was within reach of that pixel. */
type HeatPaint = (v: number | null) => [number, number, number, number]

/** A nearest-sample wash on a coarse canvas field, shared by every heat layer: each field
 *  pixel takes the value of the nearest sample within `coverKm`, `paint` decides the RGBA,
 *  and the whole raster is clipped to the focused boundary. Extracted from the rain layer
 *  so a second indicator (PM2.5) gets the same pan/zoom/anchor behaviour for free. */
function HeatFieldLayer({
  paneName, zIndex, samples, boundary, coverKm, paint, onPick,
  samplePx = RAIN_SAMPLE_PX, marginPx = RAIN_MARGIN_PX, bucketPx = RAIN_BUCKET_PX,
}: {
  paneName: string
  zIndex: number
  samples: HeatSample[]
  boundary: RainBoundary
  coverKm: number
  paint: HeatPaint
  onPick?: (id: number) => void
  samplePx?: number
  marginPx?: number
  bucketPx?: number
}) {
  const map = useMap()
  const points = useRef(samples)
  points.current = samples
  const edge = useRef(boundary)
  edge.current = boundary
  const pick = useRef(onPick)
  pick.current = onPick
  const paintRef = useRef(paint)
  paintRef.current = paint
  const drawRef = useRef<() => void>(() => {})
  const fieldRef = useRef<{ canvas: HTMLCanvasElement; img: ImageData; w: number; h: number } | null>(null)
  const clipRef = useRef<{ source: RainBoundary; path: Path2D; minX: number; minY: number; maxX: number; maxY: number } | null>(null)

  useEffect(() => {
    const pane = map.getPane(paneName) ?? map.createPane(paneName)
    pane.style.zIndex = String(zIndex) // above the tiles, below the district/palika shapes
    pane.style.pointerEvents = 'none'
    const canvas = L.DomUtil.create('canvas', 'rain-heat leaflet-zoom-animated') as HTMLCanvasElement
    pane.appendChild(canvas)
    let raf = 0
    // A zoom animation scales every zoom-aware layer through its own transform. Without
    // this the wash would sit unscaled while the map zooms around it, then snap on zoomend.
    let animating = false

    /** Nepal's outline (the seven provinces joined) as a Path2D in scale-0 world pixels,
     *  plus its bounding box so sampling can skip everything outside the country.
     *  Leaflet projects the world linearly per zoom, so one build serves every zoom and
     *  the ~142k boundary vertices are never reprojected while panning or zooming. */
    const borderPath = (): { path: Path2D; minX: number; minY: number; maxX: number; maxY: number } | null => {
      const src = edge.current
      if (!src?.features?.length) return null
      if (clipRef.current?.source === src) return clipRef.current
      const path = new Path2D()
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      for (const f of src.features) {
        const g = f.geometry as { type?: string; coordinates?: unknown } | undefined
        const polys =
          g?.type === 'Polygon' ? [g.coordinates as number[][][]]
            : g?.type === 'MultiPolygon' ? (g.coordinates as number[][][][])
              : []
        for (const poly of polys) {
          for (const ring of poly) {
            for (let i = 0; i < ring.length; i++) {
              const p = map.project([ring[i][1], ring[i][0]], 0)
              if (i) path.lineTo(p.x, p.y)
              else path.moveTo(p.x, p.y)
              if (p.x < minX) minX = p.x
              if (p.x > maxX) maxX = p.x
              if (p.y < minY) minY = p.y
              if (p.y > maxY) maxY = p.y
            }
            path.closePath()
          }
        }
      }
      const built = { path, minX, minY, maxX, maxY }
      clipRef.current = { source: src, ...built }
      return built
    }

    /** Where the canvas sits in layer px, so a pan is carried by Leaflet moving the map
     *  pane instead of us resampling the country on every frame. */
    const anchor = { x: NaN, y: NaN, z: NaN }

    drawRef.current = () => {
      const size = map.getSize()
      const z = map.getZoom()
      const tl = map.containerPointToLayerPoint([0, 0])
      const m = marginPx
      // Mid-animation the pane transform is carrying the canvas: resampling now would both
      // fight the animation and cost a rebuild per frame. zoomend repaints.
      if (animating) return
      // Panning inside the margin needs no work at all: the pane drags the canvas along.
      if (anchor.z === z && Math.abs(tl.x - anchor.x) <= m && Math.abs(tl.y - anchor.y) <= m) return
      anchor.z = z
      anchor.x = Math.round(tl.x)
      anchor.y = Math.round(tl.y)
      const origin = L.point(anchor.x - m, anchor.y - m) // canvas top-left, layer px
      const cw = size.x + m * 2
      const ch = size.y + m * 2
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw
        canvas.height = ch
        canvas.style.width = `${cw}px`
        canvas.style.height = `${ch}px`
      }
      L.DomUtil.setPosition(canvas, origin)
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const scale = Math.pow(2, z)
      const pixelOrigin = map.getPixelOrigin()
      const bp = borderPath()
      // Nepal's outline in canvas px: outside it nothing is ever shown, so nothing is
      // sampled either (the canvas reaches a margin beyond the viewport, most of which is
      // India and Tibet).
      const cx0 = bp ? bp.minX * scale - (pixelOrigin.x + origin.x) : 0
      const cy0 = bp ? bp.minY * scale - (pixelOrigin.y + origin.y) : 0
      const cx1 = bp ? bp.maxX * scale - (pixelOrigin.x + origin.x) : cw
      const cy1 = bp ? bp.maxY * scale - (pixelOrigin.y + origin.y) : ch

      // Sample reach in screen px at this zoom (metres-per-pixel from the Web-Mercator scale).
      const metersPerPx = (156543.03392 * Math.cos((map.getCenter().lat * Math.PI) / 180)) / Math.pow(2, z)
      const coverPx = (coverKm * 1000) / metersPerPx

      // Project the samples into canvas-local px, keeping only those a cell could reach.
      const cells: { x: number; y: number; v: number }[] = []
      for (const g of points.current) {
        const p = map.latLngToLayerPoint([g.lat, g.lon])
        const x = p.x - origin.x
        const y = p.y - origin.y
        if (x < -coverPx || y < -coverPx || x > cw + coverPx || y > ch + coverPx) continue
        cells.push({ x, y, v: g.v })
      }

      const step = samplePx
      const w = Math.max(1, Math.ceil(cw / step))
      const h = Math.max(1, Math.ceil(ch / step))
      let field = fieldRef.current
      if (!field || field.w !== w || field.h !== h) {
        const fc = document.createElement('canvas')
        fc.width = w
        fc.height = h
        field = { canvas: fc, img: new ImageData(w, h), w, h }
        fieldRef.current = field
      }
      const { data } = field.img

      // Bucket the samples on a fixed, small cell so the common case tests a handful of
      // candidates instead of every sample in the country; the rare far-from-anyone sample
      // falls back to a full scan, which is what keeps remote valleys filled.
      const b = Math.max(step, Math.min(coverPx, bucketPx))
      const cols = Math.ceil(cw / b) + 1
      const rows = Math.ceil(ch / b) + 1
      const buckets: (number[] | undefined)[] = new Array(cols * rows)
      const clampX = (i: number) => Math.min(cols - 1, Math.max(0, i))
      const clampY = (i: number) => Math.min(rows - 1, Math.max(0, i))
      for (let i = 0; i < cells.length; i++) {
        const k = clampY(Math.floor(cells[i].y / b)) * cols + clampX(Math.floor(cells[i].x / b))
        if (buckets[k]) buckets[k]!.push(i)
        else buckets[k] = [i]
      }

      const cover2 = coverPx * coverPx
      data.fill(0) // transparent everywhere; only Nepal's box is sampled below
      const gx0 = Math.max(0, Math.floor(cx0 / step))
      const gx1 = Math.min(w, Math.ceil(cx1 / step) + 1)
      const gy0 = Math.max(0, Math.floor(cy0 / step))
      const gy1 = Math.min(h, Math.ceil(cy1 / step) + 1)
      for (let gy = gy0; gy < gy1; gy++) {
        const py = gy * step + step * 0.5
        const cy = clampY(Math.floor(py / b))
        for (let gx = gx0; gx < gx1; gx++) {
          const px = gx * step + step * 0.5
          const cx = clampX(Math.floor(px / b))
          let v = NaN
          let best = cover2
          for (let oy = -1; oy <= 1; oy++) {
            const ny = cy + oy
            if (ny < 0 || ny >= rows) continue
            for (let ox = -1; ox <= 1; ox++) {
              const nx = cx + ox
              if (nx < 0 || nx >= cols) continue
              const bucket = buckets[ny * cols + nx]
              if (!bucket) continue
              for (const i of bucket) {
                const c = cells[i]
                const dx = c.x - px
                const dy = c.y - py
                const d2 = dx * dx + dy * dy
                if (d2 < best) { best = d2; v = c.v }
              }
            }
          }
          if (Number.isNaN(v)) {
            // Nothing within a bucket's reach: find the truly nearest sample.
            for (const c of cells) {
              const dx = c.x - px
              const dy = c.y - py
              const d2 = dx * dx + dy * dy
              if (d2 < best) { best = d2; v = c.v }
            }
          }
          const o = (gy * w + gx) * 4
          const [R, G, B, A] = paintRef.current(Number.isNaN(v) ? null : v)
          data[o] = R
          data[o + 1] = G
          data[o + 2] = B
          data[o + 3] = Math.round(255 * Math.min(1, Math.max(0, A)))
        }
      }

      const fctx = field.canvas.getContext('2d')
      if (!fctx) return
      fctx.putImageData(field.img, 0, 0)
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.clearRect(0, 0, cw, ch)

      // Clip to Nepal: the scale-0 world path mapped into canvas px, then the field painted
      // in the same space, so the wash covers the country and stops dead at the border.
      ctx.save()
      if (bp) {
        ctx.setTransform(scale, 0, 0, scale, -(pixelOrigin.x + origin.x), -(pixelOrigin.y + origin.y))
        ctx.clip(bp.path)
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(field.canvas, 0, 0, w, h, 0, 0, cw, ch)
      ctx.restore()
    }
    const schedule = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; drawRef.current() })
    }
    /** Ride the zoom animation: move the canvas to where its anchor lands at the target
     *  zoom and scale it, exactly like the tile layers do. */
    const onZoomAnim = (e: L.ZoomAnimEvent) => {
      if (!Number.isFinite(anchor.x)) return
      animating = true
      const corner = map.layerPointToLatLng(L.point(anchor.x - marginPx, anchor.y - marginPx))
      const viewHalf = map.getSize().divideBy(2)
      const panePos = L.DomUtil.getPosition(map.getPane('mapPane') as HTMLElement) ?? L.point(0, 0)
      const newTopLeft = map.project(e.center, e.zoom).subtract(viewHalf).add(panePos)
      L.DomUtil.setTransform(canvas, map.project(corner, e.zoom).subtract(newTopLeft), map.getZoomScale(e.zoom))
    }
    const onZoomEnd = () => { animating = false }
    drawRef.current()
    map.on('move zoom viewreset resize', schedule)
    map.on('zoomanim', onZoomAnim)
    map.on('zoomend', onZoomEnd)
    return () => {
      map.off('move zoom viewreset resize', schedule)
      map.off('zoomanim', onZoomAnim)
      map.off('zoomend', onZoomEnd)
      if (raf) cancelAnimationFrame(raf)
      canvas.remove()
    }
  }, [map])

  useEffect(() => { drawRef.current() }, [samples])
  // Boundaries arrive async: repaint once Nepal's outline is there to clip against.
  useEffect(() => { drawRef.current() }, [boundary])

  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      if (!pick.current) return
      let best: { id: number; d: number } | null = null
      for (const g of points.current) {
        const p = map.latLngToContainerPoint([g.lat, g.lon])
        const d = Math.hypot(p.x - e.containerPoint.x, p.y - e.containerPoint.y)
        if (d <= 20 && (!best || d < best.d)) best = { id: g.id, d }
      }
      if (best && pick.current) pick.current(best.id)
    }
    map.on('click', handler)
    return () => { map.off('click', handler) }
  }, [map])

  return null
}

/** Rain-gauge 24 h totals on the shared heat field: honeycomb cells (nearest gauge wins),
 *  grey where a gauge reports dry, and a bare veil where no gauge reaches at all. */
function RainHeatLayer({ gauges, boundary, onPick }: { gauges: { id: number; lat: number; lon: number; mm: number }[]; boundary: RainBoundary; onPick: (id: number) => void }) {
  const samples = useMemo(() => gauges.map(g => ({ id: g.id, lat: g.lat, lon: g.lon, v: g.mm })), [gauges])
  const paint = useCallback<HeatPaint>((v) => {
    if (v == null) return [...RAIN_NEUTRAL_RGB, RAIN_VEIL_A]
    if (v <= 0) return [...RAIN_NEUTRAL_RGB, RAIN_DRY_A]
    const t = Math.min(1, Math.log1p(v) / Math.log1p(60))
    const [R, G, B] = rainColor(v)
    return [R, G, B, Math.min(1, RAIN_VEIL_A + 0.55 + 0.4 * t)]
  }, [])
  return (
    <HeatFieldLayer
      paneName="rainheat"
      zIndex={350}
      samples={samples}
      boundary={boundary}
      coverKm={RAIN_COVER_KM}
      paint={paint}
      onPick={onPick}
    />
  )
}

/** Model PM2.5 on the shared heat field, sampled at CAMS' own ~0.4° grid spacing. */
function Pm25HeatLayer({ nodes, boundary }: { nodes: HeatSample[]; boundary: RainBoundary }) {
  const paint = useCallback<HeatPaint>((v) => {
    if (v == null) return [0, 0, 0, 0]
    const t = Math.min(1, v / 75)
    const [R, G, B] = pm25Color(v)
    return [R, G, B, 0.32 + 0.28 * t]
  }, [])
  return (
    <HeatFieldLayer
      paneName="pmheat"
      zIndex={345}
      samples={nodes}
      boundary={boundary}
      coverKm={PM25_COVER_KM}
      paint={paint}
    />
  )
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

type BasemapKey = 'osm' | 'terrain' | 'topo' | 'satellite'

const BASEMAPS: Record<BasemapKey, { name: string; url: string; attribution: string; bg: string; maxNativeZoom?: number }> = {
  osm: {
    name: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    bg: 'linear-gradient(135deg, #f6f2e8 0%, #e9e2d2 35%, #dce7d6 70%, #efe9dc 100%)',
  },
  terrain: {
    name: 'Terrain',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; OpenTopoMap (CC-BY-SA)',
    bg: 'linear-gradient(135deg, #eef1e2 0%, #d9e3c4 40%, #e6d8c0 72%, #c8d8bc 100%)',
    maxNativeZoom: 17,
  },
  topo: {
    name: 'Topo',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    bg: 'linear-gradient(135deg, #e8f0d8 0%, #b8cfa0 40%, #d4b896 70%, #a8c8a0 100%)',
  },
  satellite: {
    name: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri, Maxar',
    bg: 'linear-gradient(135deg, #1a2a1a 0%, #2a3a1a 30%, #1a2a30 60%, #0a1a0a 100%)',
  },
}

const BASEMAP_KEYS: BasemapKey[] = ['osm', 'terrain', 'topo', 'satellite']

function BasemapPreview({ kind, className = '' }: { kind: BasemapKey; className?: string }) {
  const strokes: Record<BasemapKey, ReactElement> = {
    osm: <><path d="M0 23h64M32 0v46M0 9h64M0 37h64" stroke="#fff" strokeWidth="3.2"/><path d="M0 23h64M32 0v46" stroke="#e0d6bf" strokeWidth=".9"/><path d="M6 0v46M52 0v46" stroke="#f4d59a" strokeWidth="1.2"/></>,
    terrain: <><path d="M0 18Q16 10 30 16T64 12M0 27Q18 20 32 26T64 22M0 36Q18 30 34 35T64 31" stroke="#8a9a62" strokeWidth="1.3" fill="none"/><path d="M8 44Q22 36 36 42T64 39" stroke="#b08a5a" strokeWidth="1.6" fill="none"/></>,
    topo: <><path d="M0 20Q16 14 32 18T64 16M0 30Q20 24 40 28T64 26M8 40Q24 34 40 38" stroke="#4a7c40" strokeWidth="1.5" fill="none"/><path d="M12 8q8-6 16 0t16 0" stroke="#78986c" fill="none"/></>,
    satellite: <><path d="M0 11Q13 5 23 13T48 10T64 14M0 34Q14 28 25 36T50 32T64 37" stroke="#91a77a" strokeWidth="3" fill="none" opacity=".65"/><path d="M9 0v46M37 0v46" stroke="#6c7160" strokeWidth="1" opacity=".7"/></>,
  }
  return <div className={`atlas-basemap-preview ${className}`} style={{ background: BASEMAPS[kind].bg }}><svg viewBox="0 0 64 46" preserveAspectRatio="none" aria-hidden="true">{strokes[kind]}</svg></div>
}

const COUNTRY_CAPITAL = { name: 'Kathmandu', lat: 27.7172, lng: 85.324 }
const PROVINCE_CAPITALS: Record<string, { name: string; lat: number; lng: number }> = {
  Koshi: { name: 'Biratnagar', lat: 26.455, lng: 87.270 },
  Madhesh: { name: 'Janakpurdham', lat: 26.7288, lng: 85.925 },
  Bagmati: { name: 'Hetauda', lat: 27.4284, lng: 85.0322 },
  Gandaki: { name: 'Pokhara', lat: 28.2096, lng: 83.9855 },
  Lumbini: { name: 'Deukhuri · Bhalubang', lat: 27.84112, lng: 82.76103 },
  Karnali: { name: 'Birendranagar', lat: 28.59669, lng: 81.61658 },
  Sudurpashchim: { name: 'Godawari', lat: 28.91, lng: 80.59 },
}

// A few district HQ names are older spellings or town names while the local
// boundary files use the current municipality name.
const HQ_LOCALITY_ALIASES: Record<string, string> = {
  ilam: 'illam', taplejung: 'phungling', diktel: 'rupakotmajhuwagadhi', dudhkunda: 'solududhakunda',
  pokhara: 'pokharalekhnath', jomsom: 'gharapjhong', kusma: 'kushma',
  dhunche: 'gosaikunda', jaleshwar: 'jaleswor', malangwa: 'malangawa',
  birganj: 'birgunj', salyan: 'sharada', dunai: 'thulibheri', simikot: 'simkot',
  manma: 'khandachakra', gamghadi: 'chhayanathrara', khalanga: 'bheri',
  tribhuwannagar: 'ghorahi', liwang: 'rolpa', nepalganj: 'nepalgunj',
  'dipayalsilgadhi': 'dipayalsilgadi', jayaprithvi: 'jayaprithivi',
  dasharathchand: 'dasharathchanda', darchula: 'mahakali', bhimeshwar: 'bhimeshwor',
  nilkantha: 'nilakantha', chautara: 'chautarasangachokgadhi', besisahar: 'besishahar',
  kapilvastu: 'kapilbastu', parasi: 'ramgram', rukumkot: 'sisne', martadi: 'badimalika',
}

function headquartersIcon(level: 'country' | 'province' | 'district') {
  return L.divIcon({
    html: `<span class="atlas-hq-marker atlas-hq-${level}"><span></span></span>`,
    className: 'atlas-hq-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  })
}

type Layers = { projects: boolean; hydro: boolean; quakes: boolean; quakesPast: boolean; weather: boolean; incidents: boolean; parks: boolean; roads: boolean; rain: boolean; pm25: boolean; rivers: boolean; capitals: boolean }

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function pointInGeometry(lng: number, lat: number, geometry: any): boolean {
  if (!geometry) return false
  if (geometry.type === 'Polygon') {
    const [outer, ...holes] = geometry.coordinates as number[][][]
    return !!outer && pointInRing(lng, lat, outer) && !holes.some(ring => pointInRing(lng, lat, ring))
  }
  if (geometry.type === 'MultiPolygon') {
    return (geometry.coordinates as number[][][][]).some(polygon => pointInGeometry(lng, lat, { type: 'Polygon', coordinates: polygon }))
  }
  return false
}

function MapInstanceBridge({
  onMapReady,
  onMove,
  onZoom,
  autoZoomPending,
}: {
  onMapReady: (map: L.Map) => void
  onMove: (lat: number, lng: number, zoom: number) => void
  onZoom: (lat: number, lng: number, zoom: number) => void
  autoZoomPending: { current: boolean }
}) {
  const map = useMap()
  const onMapReadyRef = useRef(onMapReady)
  const onMoveRef = useRef(onMove)
  const onZoomRef = useRef(onZoom)
  onMapReadyRef.current = onMapReady
  onMoveRef.current = onMove
  onZoomRef.current = onZoom

  useEffect(() => {
    onMapReadyRef.current(map)
    const handleMove = () => {
      const c = map.getCenter()
      onMoveRef.current(c.lat, c.lng, map.getZoom())
    }
    const handleZoom = () => {
      if (!autoZoomPending.current) return
      autoZoomPending.current = false
      const c = map.getCenter()
      onZoomRef.current(c.lat, c.lng, map.getZoom())
    }
    const container = map.getContainer()
    let zoomIntentTimer = 0
    const armZoomIntent = () => {
      autoZoomPending.current = true
      window.clearTimeout(zoomIntentTimer)
      zoomIntentTimer = window.setTimeout(() => { autoZoomPending.current = false }, 1500)
    }
    const handleTouchStart = (event: TouchEvent) => { if (event.touches.length > 1) armZoomIntent() }
    const handleKeyDown = (event: KeyboardEvent) => { if (['+', '=', '-', '_'].includes(event.key)) armZoomIntent() }
    container.addEventListener('wheel', armZoomIntent, { passive: true })
    container.addEventListener('dblclick', armZoomIntent)
    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('keydown', handleKeyDown)
    const handleMoveStart = () => {
      map.getContainer().classList.add('map-is-moving')
      const closeLayerTooltips = (layer: L.Layer) => {
        layer.closeTooltip()
        if (layer instanceof L.LayerGroup) layer.eachLayer(closeLayerTooltips)
      }
      map.eachLayer(closeLayerTooltips)
    }
    const handleMoveEnd = () => {
      map.getContainer().classList.remove('map-is-moving')
    }
    // Report settled map state only. Updating React state on every animation
    // frame re-renders all React-Leaflet layers and interrupts marker zooming.
    map.on('moveend', handleMove)
    map.on('zoomend', handleMove)
    map.on('zoomend', handleZoom)
    map.on('movestart', handleMoveStart)
    map.on('moveend', handleMoveEnd)
    handleMove()
    return () => {
      map.off('moveend', handleMove)
      map.off('zoomend', handleMove)
      map.off('zoomend', handleZoom)
      map.off('movestart', handleMoveStart)
      map.off('moveend', handleMoveEnd)
      container.removeEventListener('wheel', armZoomIntent)
      container.removeEventListener('dblclick', armZoomIntent)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('keydown', handleKeyDown)
      window.clearTimeout(zoomIntentTimer)
      autoZoomPending.current = false
    }
  }, [map, autoZoomPending])
  return null
}

function FitHelper({ bbox, skipNextFit }: { bbox: [[number, number], [number, number]] | null; skipNextFit: { current: boolean } }) {
  const map = useMap()
  const first = useRef(true)
  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    if (!bbox) return
    const key = `${bbox[0][0]},${bbox[0][1]},${bbox[1][0]},${bbox[1][1]}`
    if (lastKey.current === key) return
    lastKey.current = key
    if (skipNextFit.current) { skipNextFit.current = false; return }
    map.flyToBounds(bbox, { padding: [60, 60], duration: first.current ? 0.1 : 1.2 })
    first.current = false
  }, [map, bbox])
  return null
}

/** Drill into a picked blockage: at national zoom the tiles carry no named alignment,
 *  so the road it sits on only becomes visible (and highlights) from z8 up. */
function RoadFocus({ road }: { road: BipadRoadBlock | null }) {
  const map = useMap()
  const last = useRef<number | null>(null)
  useEffect(() => {
    if (!road?.point) { last.current = null; return }
    if (last.current === road.id) return
    last.current = road.id
    const [lon, lat] = road.point.coordinates
    if (map.getZoom() < 8) map.flyTo([lat, lon], 9, { duration: 0.9 })
  }, [map, road])
  return null
}

/** Centre of a polygon's coordinate bbox — only used to pick the right palika
 *  census row when the boundary file's name differs from BIPAD's (e.g. the
 *  boundary still says "Pokhara Lekhnath" while BIPAD files "Pokhara"). */
function featureCenter(feature: unknown): [number, number] | null {
  let w = 180, s = 90, e = -180, n = -90
  const walk = (a: unknown) => {
    if (!Array.isArray(a)) return
    if (typeof a[0] === 'number' && typeof a[1] === 'number') {
      const [lng, lat] = a as [number, number]
      if (lng < w) w = lng
      if (lng > e) e = lng
      if (lat < s) s = lat
      if (lat > n) n = lat
      return
    }
    for (const b of a) walk(b)
  }
  walk((feature as { geometry?: { coordinates?: unknown } })?.geometry?.coordinates)
  return w <= e ? [(w + e) / 2, (s + n) / 2] : null
}

/** Census row for a palika: name match first, then the nearest BIPAD centroid
 *  (within the district's own palika list, so a rename cannot cross districts). */
function palikaRow(c: { byName: Record<string, PalikaCensus>; rows: PalikaCensus[] }, m: LocalMunicipality): PalikaCensus | null {
  const hit = c.byName[normName(m.name)]
  if (hit) return hit
  const ctr = featureCenter(m.feature)
  if (!ctr) return null
  let best: PalikaCensus | null = null
  let bestD = Infinity
  for (const r of c.rows) {
    if (!r.centroid) continue
    const d = (r.centroid[0] - ctr[0]) ** 2 + (r.centroid[1] - ctr[1]) ** 2
    if (d < bestD) { bestD = d; best = r }
  }
  return best
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
    } catch { /* geometry unusable: stay put */ }
  }, [map, muni])
  return null
}

/** Clicking empty map (not a shape, pin, popup or control) steps one level out. */
function MapDeselect({ onEmptyClick }: { onEmptyClick: () => void }) {
  const map = useMap()
  const onClickRef = useRef(onEmptyClick)
  onClickRef.current = onEmptyClick

  useEffect(() => {
    const handler = (e: { originalEvent: MouseEvent }) => {
      const t = e.originalEvent.target as HTMLElement | null
      if (t?.closest?.('.leaflet-interactive, .leaflet-popup, .leaflet-control, .atlas-topbar, .atlas-bottom-controls, .atlas-station, .atlas-inspector, .atlas-legend-floating, .atlas-float')) return
      onClickRef.current()
    }
    map.on('click', handler as never)
    return () => {
      map.off('click', handler as never)
    }
  }, [map])
  return null
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeProvinceEach(selectProvince: (p: string) => void, selected: string | null, quiet = false) {
  return (f: any, l: any) => {
    const props: { id?: number; name?: string } = f?.properties ?? {}
    const label: string = props.name ?? ''
    const target = (typeof props.id === 'number' && PROVINCE_ID_TO_NAME[props.id]) || null
    // Outline only: a fill would hide the district boundaries underneath.
    const base = () => {
      const isActive = target != null && target === selected
      return {
        weight: isActive ? 2.2 : 1.1,
        fillOpacity: 0,
        color: isActive ? '#0b4f3e' : '#94a3b8',
      }
    }
    l.on('click', () => { if (target) selectProvince(target) })
    // With the rain wash on, hovering must not restyle the outline out from under the
    // readings, so the layer stays quiet: click still drills into the province.
    if (quiet) return
    l.bindTooltip(label, { sticky: true, direction: 'top' })
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

function makeDistrictEach(setDistrict: (fn: (cur: string | null) => string | null) => void, quiet = false) {
  return (f: any, l: any) => {
    const name: string = f?.properties?._district ?? f?.properties?.name ?? ''
    if (!quiet) l.bindTooltip(name, { sticky: true, direction: 'top' })
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
  const [rainStations, setRainStations] = useState<BipadStation[]>([])
  const [pm25Nodes, setPm25Nodes] = useState<(number | null)[] | null>(null)
  const [roadBlocks, setRoadBlocks] = useState<BipadRoadBlock[]>([])
  const [roadSel, setRoadSel] = useState<BipadRoadBlock | null>(null)
  const [highwaySel, setHighwaySel] = useState<{ ref: string; name?: string } | null>(null)
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [incidentSel, setIncidentSel] = useState<BipadIncident | null>(null)
  const [incidentExtra, setIncidentExtra] = useState<{ id: number; detail: BipadIncidentDetail | null; loss: BipadLoss | null; place: BipadIncidentPlace | null; loading: boolean } | null>(null)
  const [hazards, setHazards] = useState<Record<number, BipadHazard>>({})
  const [quakeRisk, setQuakeRisk] = useState<Record<number, BipadQuakeRisk>>({})
  const [districtIds, setDistrictIds] = useState<Record<string, number> | null>(null)
  const [profiles, setProfiles] = useState<Record<number, DistrictProfile | null>>({})
  const [palikaCensus, setPalikaCensus] = useState<Record<number, { year: string; rows: PalikaCensus[]; byName: Record<string, PalikaCensus> } | null>>({})
  const [riverStations, setRiverStations] = useState<BipadStation[]>([])
  const [quakes, setQuakes] = useState<NepalQuake[]>([])
  const [stations, setStations] = useState<DhmStation[]>([])
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
  const [allParks, setAllParks] = useState<LocalMunicipality[]>([])
  const [munisLoading, setMunisLoading] = useState(false)
  // The map opens quiet: only the live weather stations and the civic capital markers.
  const [layers, setLayers] = useState<Layers>({ projects: false, hydro: false, quakes: false, quakesPast: false, weather: true, incidents: false, parks: false, roads: true, rain: false, pm25: false, rivers: false, capitals: true })
  const [parkSel, setParkSel] = useState<LocalMunicipality | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const [quakeSel, setQuakeSel] = useState<NepalQuake | null>(null)
  const [muniSel, setMuniSel] = useState<LocalMunicipality | null>(null)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [zoomLevel, setZoomLevel] = useState(7)
  const [centerCoord, setCenterCoord] = useState<{ lat: number; lng: number }>({ lat: 28.4, lng: 84.2 })
  const [basemap, setBasemap] = useState<BasemapKey>('osm')
  const skipNextRegionFit = useRef(false)
  const autoZoomPending = useRef(false)
  const [isBasemapMenuOpen, setIsBasemapMenuOpen] = useState(false)
  const [isInspectorOpen, setIsInspectorOpen] = useState(false)
  const [isLegendOpen, setIsLegendOpen] = useState(false)
  const [isRegionMenuOpen, setIsRegionMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLegendExpanded, setIsLegendExpanded] = useState(true)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [gpsPosition, setGpsPosition] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const { theme, toggle: toggleTheme } = useTheme()

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
      setIsFullscreen(true)
    } else {
      document.exitFullscreen().catch(() => {})
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const locateMe = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.')
      return
    }
    // If we already have a position, clear it (toggle off)
    if (gpsPosition) {
      setGpsPosition(null)
      setGpsError(null)
      return
    }
    setGpsLoading(true)
    setGpsError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords
        setGpsPosition({ lat, lng, accuracy })
        setGpsLoading(false)
        // Fly to user location
        mapInstance?.flyTo([lat, lng], Math.max(13, zoomLevel), { duration: 1.2 })
      },
      (err) => {
        setGpsLoading(false)
        setGpsError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Please allow location in browser settings.'
            : err.code === err.TIMEOUT
            ? 'Location request timed out.'
            : 'Could not determine your location.',
        )
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchFocused) { setSearchQuery(''); searchRef.current?.blur(); setSearchFocused(false) }
        else if (isRegionMenuOpen) setIsRegionMenuOpen(false)
        else if (isInspectorOpen) setIsInspectorOpen(false)
        else if (isLegendOpen) setIsLegendOpen(false)
        else if (stationSel) setStationSel(null)
        else if (hydroSel) setHydroSel(null)
        else if (riverSel) setRiverSel(null)
        else if (rainSel) setRainSel(null)
        else if (incidentSel) setIncidentSel(null)
        else if (highwaySel) setHighwaySel(null)
        else if (roadSel) setRoadSel(null)
        else if (quakeSel) setQuakeSel(null)
        else if (parkSel) setParkSel(null)
        else if (muniSel) setMuniSel(null)
        else if (district) setDistrict(null)
        else if (province) selectProvince(null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [searchFocused, isRegionMenuOpen, isInspectorOpen, isLegendOpen, stationSel, hydroSel, riverSel, rainSel, roadSel, highwaySel, incidentSel, quakeSel, parkSel, muniSel, district, province])

  /** The pin only knows the slim list row; the card joins the full record, the
   *  linked loss row (casualties/damage) and the ward → palika → district names. */
  useEffect(() => {
    const i = incidentSel
    if (!i) { setIncidentExtra(null); return }
    let cancelled = false
    setIncidentExtra({ id: i.id, detail: null, loss: null, place: null, loading: true })
    ;(async () => {
      const detail = await fetchBipadIncidentDetail(i.id)
      const [loss, place] = await Promise.all([
        i.loss ? fetchBipadLoss(i.loss) : Promise.resolve(null),
        detail?.wards?.[0] ? fetchBipadIncidentPlace(detail.wards[0]) : Promise.resolve(null),
      ])
      if (!cancelled) setIncidentExtra({ id: i.id, detail, loss, place, loading: false })
    })()
    return () => { cancelled = true }
  }, [incidentSel])

  useEffect(() => {
    let cancelled = false
    fetchProvinceShapes()
      .then(d => { if (!cancelled && d.features.length) setProvinceGeo(d) })
      .catch(() => {})
    // District list first (tiny BIPAD payload, cached): pins, zoom and
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
    fetchBipadRainStationsAll().then(s => { if (!cancelled) setRainStations(s) }).catch(() => {})
    fetchBipadRiverStationsAll().then(s => { if (!cancelled) setRiverStations(s) }).catch(() => {})
    // The PM2.5 field is ~230 model nodes in one request, like the rain gauges.
    fetchPm25Grid(NEPAL_PM25_GRID).then(n => { if (!cancelled) setPm25Nodes(n) }).catch(() => {})
    // Department of Roads blockage log: ~405 events over ~6 months, one request.
    fetchBipadRoadBlocks().then(r => { if (!cancelled) setRoadBlocks(r.results) }).catch(() => {})
    // Per-district seismic risk: 77 rows, one request, keyed by BIPAD district id.
    fetchBipadQuakeRisk().then(list => {
      if (!cancelled) setQuakeRisk(Object.fromEntries(list.map(r => [r.district, r])))
    }).catch(() => {})
    // Name → BIPAD id: district ids in this component can come from polygon files,
    // whose ids are synthetic, so the census/risk joins go through the name.
    fetchBipadDistrictIds().then(m => { if (!cancelled) setDistrictIds(m) }).catch(() => { if (!cancelled) setDistrictIds({}) })
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
    fetchBipadIncidents(1000, 'id,title,point,hazard,incident_on,source,verified,loss').then(i => { if (!cancelled) setIncidents(i.results) }).catch(() => {})
    fetchBipadHazards().then(h => {
      if (!cancelled) setHazards(Object.fromEntries(h.results.map(x => [Number(x.id), x])))
    }).catch(() => {})
    // Load protected areas for ALL provinces upfront so parks show nation-wide
    const PROVINCES_ALL = ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim']
    Promise.all(PROVINCES_ALL.map(p => fetchLocalProtected(p)))
      .then(results => {
        if (cancelled) return
        // A protected area can be listed under every province it touches
        // (Koshi Tappu sits in Koshi + Madhesh) - keep one row per name.
        setAllParks([...new Map(results.flat().map(m => [m.name, m])).values()])
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const provinceDistricts = useMemo(
    () => (province ? districts.filter(d => d.province === province) : []),
    [districts, province],
  )

  // Lazy shapes: only the opened province's file (~76–226KB), cached per
  // province: never the whole country, never twice.
  useEffect(() => {
    if (!province) {
      setLocalDistricts([])
      return
    }
    let cancelled = false
    const num = PROVINCE_NAME_TO_NUM[province]
    // Clear the previous province's shapes immediately: never show stale districts.
    setLocalDistricts([])
    setLocalLoading(true)
    fetchLocalDistricts(num)
      .then(local => {
        if (cancelled) return
        setLocalDistricts(local)
        setPolyCount(local.length)
        // Polygon-derived rows only when the API never answered (and only
        // then, so a fallback can never pin one province over another).
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
  const displayParks = useMemo(() => (allParks.length > 0 ? allParks : parks), [allParks, parks])
  const muniByName = useMemo(() => new Map(munis.map(m => [m.name, m] as const)), [munis])

  // A palika belongs to one district: drop the pick when the district changes.
  useEffect(() => { setMuniSel(null) }, [district, province])

  const districtId = district && districtIds ? districtIds[canonDistrictKey(district)] ?? null : null
  /** Census profile: the API files it per palika, so it is fetched once per district opened
   *  (11–22 rows) and cached in `profiles` for the rest of the session. */
  useEffect(() => {
    if (districtId == null || profiles[districtId] !== undefined) return
    let cancelled = false
    fetchBipadDistrictProfile(districtId)
      .then(p => { if (!cancelled) setProfiles(cur => ({ ...cur, [districtId]: p })) })
      .catch(() => { if (!cancelled) setProfiles(cur => ({ ...cur, [districtId]: null })) })
    return () => { cancelled = true }
  }, [districtId, profiles])

  /** Palika-level census, fetched only when a palika is opened (one extra request
   *  per district) and cached like the district profile. */
  useEffect(() => {
    if (!muniSel || districtId == null || palikaCensus[districtId] !== undefined) return
    let cancelled = false
    fetchBipadPalikaCensus(districtId)
      .then(c => { if (!cancelled) setPalikaCensus(cur => ({ ...cur, [districtId]: c })) })
      .catch(() => { if (!cancelled) setPalikaCensus(cur => ({ ...cur, [districtId]: null })) })
    return () => { cancelled = true }
  }, [muniSel, districtId, palikaCensus])

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

  const districtHeadquarters = useMemo(() => provinceDistricts.flatMap(d => {
    const hq = localByName.get(normName(d.name))?.hq
    if (!hq) return []
    const hqKey = normName(hq)
    const localityKey = HQ_LOCALITY_ALIASES[hqKey] ?? hqKey
    const candidates = munis.filter(m => normName(m.name) === localityKey)
    const districtKey = canonDistrictKey(d.name)
    const locality = candidates.find(m => canonDistrictKey(m.district) === districtKey) ?? (candidates.length === 1 ? candidates[0] : undefined)
    if (!locality) return []
    try {
      const bounds = L.geoJSON(locality.feature as never).getBounds()
      if (!bounds.isValid()) return []
      const center = bounds.getCenter()
      return [{ district: d.name, hq, lat: center.lat, lng: center.lng }]
    } catch {
      return []
    }
  }), [provinceDistricts, localByName, munis])

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
      // 1) Researched site (dam, airfield, temple: confidence labeled).
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

  const visibleRivers = riverStations.filter(s => { const c = stationCoord(s); return c ? inScope(c[0], c[1]) : false })
  // Heat inputs: in-scope rain gauges carrying a fresh, plausible 24 h reading. A clear
  // day keeps every mm at 0, so the field simply stays empty instead of drawing zeros.
  const rainHeat = useMemo(
    () =>
      rainStations.flatMap(s => {
        const c = stationCoord(s)
        if (!c || !inScope(c[0], c[1])) return []
        const mm = rainReading(s)
        return mm != null
          ? [{ id: s.id, lat: c[0], lon: c[1], mm, name: s.title, area: stationArea(districts, s) }]
          : []
      }),
    [rainStations, districts, province, district],
  )
  // The wash is limited to whatever the map is focused on: the whole country, the open
  // province, or the open district - never across the level above it.
  const rainClip = useMemo((): RainBoundary => {
    if (district) {
      const key = normName(district)
      const f = polyByName[key] ?? (NAME_ALIAS[key] ? polyByName[NAME_ALIAS[key]] : undefined)
      if (f) return { type: 'FeatureCollection', features: [f] }
    }
    if (province) {
      const geo = provinceGeo as { features?: { properties?: { id?: number } }[] } | null
      const f = geo?.features?.find(x => x.properties?.id != null && PROVINCE_ID_TO_NAME[x.properties.id] === province)
      if (f) return { type: 'FeatureCollection', features: [f] }
    }
    return provinceGeo as RainBoundary
  }, [district, province, provinceGeo, polyByName])

  // PM2.5 nodes: the model lattice carries no scope filter - the clip decides what shows,
  // and keeping every node means a focused district still fills to its edges.
  const pm25Heat = useMemo(
    () =>
      (pm25Nodes ?? []).flatMap((v, i) => {
        const p = NEPAL_PM25_GRID[i]
        return typeof v === 'number' && p ? [{ id: i, lat: p.lat, lon: p.lon, v }] : []
      }),
    [pm25Nodes],
  )

  // Every gauge carries its number - tiny at national zoom, legible as you zoom in.
  const rainZoom = zoomLevel >= 10 ? 'hi' : zoomLevel >= 8 ? 'md' : 'lo'
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

  const handleMapMove = useCallback((lat: number, lng: number, z: number) => {
    setCenterCoord(prev => {
      if (Math.abs(prev.lat - lat) < 0.0001 && Math.abs(prev.lng - lng) < 0.0001) return prev
      return { lat, lng }
    })
    setZoomLevel(prev => (prev === z ? prev : z))
  }, [])

  const handleMapZoom = useCallback((lat: number, lng: number, z: number) => {
    const geo = provinceGeo as { features?: { properties?: { id?: number }; geometry?: unknown }[] } | null
    const provinceFeature = geo?.features?.find(feature => {
      const id = feature.properties?.id
      return typeof id === 'number' && pointInGeometry(lng, lat, feature.geometry)
    })
    const provinceName = provinceFeature?.properties?.id != null
      ? PROVINCE_ID_TO_NAME[provinceFeature.properties.id]
      : undefined

    if (z < 7.2) {
      if (province || district) {
        skipNextRegionFit.current = true
        setProvince(null)
        setDistrict(null)
      }
      return
    }
    if (!provinceName || z < 8) return

    let districtName: string | null = null
    if (z >= 10) {
      districtName = districts.find(d => {
        if (d.province !== provinceName) return false
        const key = normName(d.name)
        const geometry = polyByName[key] ?? (NAME_ALIAS[key] ? polyByName[NAME_ALIAS[key]] : undefined)
        return pointInGeometry(lng, lat, (geometry as { geometry?: unknown } | undefined)?.geometry)
      })?.name ?? null
    }

    if (province !== provinceName || district !== districtName) {
      skipNextRegionFit.current = true
      setProvince(provinceName)
      setDistrict(districtName)
      setMuniSel(null)
    }
  }, [provinceGeo, province, district, districts, polyByName])

  const handleEmptyClick = useCallback(() => {
    if (district) setDistrict(null)
    else if (province) selectProvince(null)
  }, [district, province])

  const counts = {
    projects: visibleProjects.length,
    hydro: visibleHydro.length,
    quakes: yearQuakes.length,
    quakesPast: pastQuakes.length,
    weather: visibleStations.length,
    incidents: visibleIncidents.length,
    roadblocks: roadBlocks.filter(r => r.point && roadBlocked(r)).length,
    roadClosed: roadBlocks.filter(r => r.point && roadClosed(r)).length,
    roadPartial: roadBlocks.filter(r => r.point && r.status === 'PARTIAL_OPEN').length,
    rain: rainHeat.filter(g => g.mm > 0).length,
    pm25: pm25Heat.filter(p => p.v > 25).length,
    rivers: visibleRivers.length,
    capitals: (!province || province === 'Bagmati' ? 1 : 0)
      + Object.keys(PROVINCE_CAPITALS).filter(p => !province || p === province).length
      + districtHeadquarters.length,
  }

  // Rain and PM2.5 are both whole-country washes, so only one can be on at a time:
  // switching either on switches the other off rather than stacking two quantities.
  const toggle = (k: keyof Layers) => setLayers(l => {
    if (k === 'rain') return { ...l, rain: !l.rain, pm25: l.rain ? l.pm25 : false }
    if (k === 'pm25') return { ...l, pm25: !l.pm25, rain: l.pm25 ? l.rain : false }
    return { ...l, [k]: !l[k] }
  })

  /** A heat wash is up: outlines go quiet so hovering cannot restyle over the field. */
  const washOn = layers.rain || layers.pm25

  const handleSelectProject = (pt: (typeof projectPoints)[0]) => {
    if (!layers.projects) setLayers(l => ({ ...l, projects: true }))
    if (pt.lat != null && pt.lon != null) {
      mapInstance?.flyTo([pt.lat, pt.lon], 12, { duration: 1.2 })
    }
    if (pt.district) {
      const d = districts.find(x => x.name.toLowerCase() === pt.district?.toLowerCase())
      if (d) {
        selectProvince(d.province)
        setDistrict(d.name)
      }
    } else if (pt.p.province && pt.p.province !== 'National') {
      selectProvince(pt.p.province)
    }
    setSearchQuery('')
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  const handleSelectHydro = (h: HydroProject) => {
    if (!layers.hydro) setLayers(l => ({ ...l, hydro: true }))
    setHydroSel(h)
    mapInstance?.flyTo([h.lat, h.lng], 13, { duration: 1.2 })
    setSearchQuery('')
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  const handleSelectPark = (p: LocalMunicipality) => {
    if (!layers.parks) setLayers(l => ({ ...l, parks: true }))
    setParkSel(p)
    try {
      const b = L.geoJSON(p.feature as never).getBounds()
      if (b.isValid()) mapInstance?.flyToBounds(b, { padding: [40, 40], maxZoom: 13, duration: 1.2 })
    } catch {}
    setSearchQuery('')
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  const handleSelectDistrict = (d: BipadDistrict) => {
    selectProvince(d.province)
    setDistrict(d.name)
    setSearchQuery('')
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  const handleSelectProvince = (p: string) => {
    selectProvince(p)
    setSearchQuery('')
    setSearchFocused(false)
    searchRef.current?.blur()
  }

  return (
    <>
      <div className="atlas-map">
        <MapContainer
          center={[28.4, 84.2] as [number, number]}
          zoom={7}
          minZoom={5}
          maxZoom={18}
          worldCopyJump={true}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%', background: '#eef2f0' }}
        >
          <TileLayer
            key={basemap}
            url={BASEMAPS[basemap].url}
            attribution={BASEMAPS[basemap].attribution}
            maxNativeZoom={BASEMAPS[basemap].maxNativeZoom}
          />
          <MapInstanceBridge
            onMapReady={setMapInstance}
            onMove={handleMapMove}
            onZoom={handleMapZoom}
            autoZoomPending={autoZoomPending}
          />
          <FitHelper bbox={fit ?? NEPAL_BBOX} skipNextFit={skipNextRegionFit} />
          <MuniFocus muni={muniSel} />
          <RoadFocus road={roadSel} />
          <MapDeselect onEmptyClick={handleEmptyClick} />
          {/* Stacking is by pane, not load order: polygons stay low so the
              asynchronously-loaded shapes can never cover the clickable pins. */}
          <Pane name="shapes" style={{ zIndex: 390 }} />
          {/* District borders get their own pane ABOVE the palika fills so the
              active district's outline is never overpainted (the palika layer
              mounts later, so load order alone can't guarantee this). */}
          <Pane name="borders" style={{ zIndex: 430 }} />
          <Pane name="points" style={{ zIndex: 620 }} />
          <Pane name="gps" style={{ zIndex: 700 }} />
          {gpsPosition && (
            <Marker
              pane="gps"
              position={[gpsPosition.lat, gpsPosition.lng]}
              icon={L.divIcon({
                html: '<span class="atlas-gps-marker"><span class="atlas-gps-ring"></span><span class="atlas-gps-dot"></span></span>',
                className: 'gps-location-icon',
                iconSize: [28, 28],
                iconAnchor: [14, 14],
              })}
              interactive={false}
            />
          )}
          {layers.roads && (
            <OsmRoads
              visible={layers.roads}
              selectedRef={highwaySel?.ref ?? roadSel?.roadRefno ?? null}
              color={highwaySel ? '#b45309' : ROAD_STATUS[roadSel?.status ?? '']?.color ?? '#dc2626'}
              outline={provinceGeo}
              onSelectRef={(ref, name) => { setHighwaySel({ ref, name }); setRoadSel(null) }}
            />
          )}
          {provinceGeo && (
            <GeoJSON
              key={`provinces-${province ?? 'all'}-${washOn}`}
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
              onEachFeature={makeProvinceEach(selectProvince, province, washOn) as any}
            />
          )}
          {province && districtFeatures.features.length > 0 && (
            <GeoJSON
              key={`districts-${province}-${washOn}`}
              pane="borders"
              data={districtFeatures as any}
              style={(f: any) => districtStyle(f, district)}
              onEachFeature={makeDistrictEach(setDistrict, washOn) as any}
            />
          )}
          {district && muniFeatures.features.length > 0 && (
            <GeoJSON
              key={`munis-${province}`}
              pane="shapes"
              data={muniFeatures as any}
              style={(f: any) => muniStyle(f, activeKey, muniSel?.name ?? null)}
              onEachFeature={makeMuniEach(setMuniSel, muniByName) as any}
            />
          )}
          {layers.parks && displayParks.length > 0 && (
            <GeoJSON
              key={`allparks-${displayParks.length}`}
              pane="shapes"
              data={{
                type: 'FeatureCollection',
                features: displayParks.map(m => ({
                  ...(m.feature as object),
                  properties: { ...((m.feature as { properties?: object }).properties ?? {}), _muni: m.name, _type: m.type, _dkey: m.district },
                })),
              } as any}
              style={(f: any) => parkStyle(f, activeKey, parkSel?.name ?? null)}
              onEachFeature={(f: any, l: any) => {
                const name: string = f?.properties?._muni ?? ''
                const type: string = f?.properties?._type ?? ''
                l.bindTooltip(`${name}${type ? ` · ${type}` : ''}`, { sticky: true, direction: 'top' })
                l.on('click', () => {
                  const m = displayParks.find(p => p.name === name)
                  if (m) setParkSel(cur => (cur?.name === name ? null : m))
                })
              }}
            />
          )}
          {layers.capitals && (!province || province === 'Bagmati') && (
            <Marker position={[COUNTRY_CAPITAL.lat, COUNTRY_CAPITAL.lng]} icon={headquartersIcon('country')} pane="points">
              <Tooltip direction="top" offset={[0, -9]}>{`National capital · ${COUNTRY_CAPITAL.name}`}</Tooltip>
            </Marker>
          )}
          {layers.capitals && Object.entries(PROVINCE_CAPITALS)
            .filter(([capitalProvince]) => !province || capitalProvince === province)
            .map(([capitalProvince, capital]) => (
              <Marker key={`province-hq-${capitalProvince}`} position={[capital.lat, capital.lng]} icon={headquartersIcon('province')} pane="points">
                <Tooltip direction="top" offset={[0, -9]}>{`${capitalProvince} provincial capital · ${capital.name}`}</Tooltip>
              </Marker>
            ))}
          {layers.capitals && districtHeadquarters.map(hq => (
            <Marker
              key={`district-hq-${hq.district}`}
              position={[hq.lat, hq.lng]}
              icon={headquartersIcon('district')}
              pane="points"
              eventHandlers={{ click: () => setDistrict(cur => cur === hq.district ? null : hq.district) }}
            >
              <Tooltip direction="top" offset={[0, -9]}>{`${hq.district} district HQ · ${hq.hq} (locality marker)`}</Tooltip>
            </Marker>
          ))}
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
              <Tooltip direction="top" offset={[0, -8]}>{p.name} · {p.progress}%</Tooltip>
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
                  : <Tooltip direction="top" offset={[0, -8]}>{h.name} · {h.mw} MW · {h.licenseType}</Tooltip>}
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
                <Tooltip direction="top" offset={[0, -8]}>M{q.mag.toFixed(1)} · {q.place}</Tooltip>
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
                <Tooltip direction="top" offset={[0, -8]}>M{q.mag.toFixed(1)} · {q.place}</Tooltip>
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
              <Tooltip direction="top" offset={[0, -18]}>{s.name}{s.condition ? ` · ${s.condition}` : ''}</Tooltip>
            </Marker>
          ))}
          {layers.incidents && visibleIncidents.map(i => {
            const hz = i.hazard != null ? hazards[i.hazard] : undefined
            const kind = hz?.title ?? hz?.titleEn ?? 'Incident'
            return (
              <Marker
                key={`i-${i.id}`}
                pane="points"
                position={[i.point!.coordinates[1], i.point!.coordinates[0]]}
                icon={incidentPin(hz, i.hazard)}
                eventHandlers={{ click: () => setIncidentSel(cur => (cur?.id === i.id ? null : i)) }}
              >
                <Tooltip direction="top" offset={[0, -10]}>
                  <strong>{kind}</strong> · {i.title}
                </Tooltip>
              </Marker>
            )
          })}
          {layers.roads && roadBlocks.filter(r => r.point && roadBlocked(r)).map(r => {
            const st = ROAD_STATUS[r.status ?? ''] ?? ROAD_STATUS.CLOSED
            const shut = roadClosed(r)
            return (
              <CircleMarker
                key={`rb-${r.id}`}
                pane="points"
                center={[r.point!.coordinates[1], r.point!.coordinates[0]]}
                radius={shut ? 7 : 5}
                pathOptions={{ color: '#ffffff', weight: 1, fillColor: st.color, fillOpacity: shut ? 0.95 : 0.8 }}
                eventHandlers={{ click: () => { setRoadSel(cur => (cur?.id === r.id ? null : r)); setHighwaySel(null) } }}
              >
                <Tooltip direction="top" offset={[0, -6]} permanent={shut}>
                  {shut
                    ? `${r.roadRefno ?? 'Road'} · closed`
                    : `${r.roadRefno ?? 'Road'} · ${st.label.toLowerCase()} · ${r.location ?? r.title}`}
                </Tooltip>
              </CircleMarker>
            )
          })}
          {layers.rain && (
            <RainHeatLayer
              gauges={rainHeat}
              boundary={rainClip}
              onPick={id => setRainSel(cur => (cur?.id === id ? null : rainStations.find(s => s.id === id) ?? null))}
            />
          )}
          {layers.pm25 && <Pm25HeatLayer nodes={pm25Heat} boundary={rainClip} />}
          {layers.rain && rainHeat.map(g => {
            const wet = g.mm > 0
            const [R, G, B] = rainColor(g.mm)
            return (
              <Marker
                key={`rm-${g.id}`}
                pane="points"
                position={[g.lat, g.lon]}
                icon={L.divIcon({
                  html: `<span class="rain-mm${wet ? '' : ' dry'}${rainSel?.id === g.id ? ' active' : ''}" style="--rc:rgb(${R},${G},${B})">${wet ? (g.mm < 10 ? g.mm.toFixed(1) : Math.round(g.mm)) : '0'}</span>`,
                  className: `rain-mm-wrap ${rainZoom}`,
                  iconAnchor: [0, 0],
                })}
                eventHandlers={{ click: () => setRainSel(cur => (cur?.id === g.id ? null : rainStations.find(s => s.id === g.id) ?? null)) }}
              >
                <Tooltip direction="top" offset={[0, -4]}>{g.name}{g.area ? ` · ${g.area}` : ''} — {g.mm.toFixed(1)} mm / 24 h</Tooltip>
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
                <Tooltip direction="top" offset={[0, -8]}>{s.title} · {s.status ?? ''}</Tooltip>
              </Marker>
            )
          })}
        </MapContainer>
      </div>

      {/* Top Floating Control Bar */}
      <header className="atlas-topbar">
        {/* Left: Back Link & Region Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Link
            href="/projects"
            className="atlas-topbar-pill text-accent"
            style={{ fontSize: '.74rem', fontWeight: 700, textDecoration: 'none', padding: '5px 10px', height: 34 }}
            title="Return to Drishti Projects Tracker"
          >
            <ArrowLeft size={14} /> Drishti
          </Link>

          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsRegionMenuOpen(o => !o)}
              className="atlas-topbar-pill text-ink"
              style={{
                fontSize: '.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: province ? '1.5px solid var(--accent)' : '1px solid var(--border-light)',
                padding: '5px 11px',
                height: 34,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
              title="Click to select Province or District"
            >
              <MapPin size={13} className={province ? 'text-accent' : 'text-tertiary'} />
              <span>{district ? `${province} › ${district}` : province ? `${province} Province` : 'Nepal (All)'}</span>
              <ChevronDown size={13} className="text-tertiary" />
            </button>

            {isRegionMenuOpen && (
              <div
                className="atlas-float"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  left: 0,
                  width: 270,
                  maxHeight: 380,
                  overflowY: 'auto',
                  padding: '.8rem',
                  zIndex: 900,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.6rem' }}>
                  <span style={{ fontSize: '.58rem', fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase' }} className="text-tertiary">
                    Select Jurisdiction
                  </span>
                  {(province || district) && (
                    <button
                      onClick={() => { selectProvince(null); setIsRegionMenuOpen(false); }}
                      style={{ fontSize: '.64rem', fontWeight: 700, color: 'var(--accent)', border: 'none', background: 'transparent', cursor: 'pointer' }}
                    >
                      Reset ✕
                    </button>
                  )}
                </div>
                <button
                  onClick={() => { selectProvince(null); setIsRegionMenuOpen(false); }}
                  style={{
                    width: '100%',
                    padding: '.4rem .6rem',
                    borderRadius: 8,
                    fontSize: '.72rem',
                    fontWeight: !province ? 700 : 500,
                    background: !province ? 'var(--accent-light)' : 'transparent',
                    color: !province ? 'var(--accent)' : 'var(--text)',
                    cursor: 'pointer',
                    border: 'none',
                    textAlign: 'left',
                    marginBottom: '.3rem',
                  }}
                >
                  🇳🇵 All Nepal (Overview)
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem' }}>
                  {PROVINCES.map(p => {
                    const isCurProv = province === p
                    return (
                      <div key={p}>
                        <button
                          onClick={() => {
                            selectProvince(isCurProv ? null : p)
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '.35rem .6rem',
                            borderRadius: 8,
                            fontSize: '.72rem',
                            fontWeight: isCurProv ? 700 : 500,
                            background: isCurProv ? 'var(--accent-light)' : 'transparent',
                            color: isCurProv ? 'var(--accent)' : 'var(--text)',
                            cursor: 'pointer',
                            border: 'none',
                            textAlign: 'left',
                          }}
                        >
                          <span>{p} Province</span>
                          <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>
                            {districts.filter(d => d.province === p).length} districts
                          </span>
                        </button>
                        {isCurProv && provinceDistricts.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '.3rem .4rem .5rem 1rem' }}>
                            {provinceDistricts.map(d => (
                              <button
                                key={d.id}
                                onClick={() => {
                                  setDistrict(cur => (cur === d.name ? null : d.name))
                                  setIsRegionMenuOpen(false)
                                }}
                                style={{
                                  fontSize: '.62rem',
                                  fontWeight: district === d.name ? 700 : 500,
                                  padding: '2px 7px',
                                  borderRadius: 99,
                                  border: '1px solid var(--border-light)',
                                  background: district === d.name ? 'var(--accent)' : 'var(--bg-sunken)',
                                  color: district === d.name ? '#fff' : 'var(--text-secondary)',
                                  cursor: 'pointer',
                                }}
                              >
                                {d.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {(province || district) && (
            <button
              onClick={() => selectProvince(null)}
              className="atlas-topbar-pill text-tertiary"
              style={{ fontSize: '.68rem', fontWeight: 600, padding: '5px 8px', height: 34, cursor: 'pointer' }}
              title="Reset view to whole country"
            >
              ✕
            </button>
          )}
        </div>

        {/* Center: Search Bar */}
        <div className="atlas-search-wrap">
          <div className={`atlas-search-box${searchFocused ? ' is-focused' : ''}`}>
            <Search size={14} className={searchFocused ? 'text-accent' : 'text-tertiary'} style={{ flexShrink: 0 }} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search projects, districts, hydro, parks…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 240)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const q = searchQuery.trim().toLowerCase()
                  const pMatch = projectPoints.find(pt => pt.p.name.toLowerCase().includes(q) || (pt.p.category && pt.p.category.toLowerCase().includes(q)))
                  if (pMatch) { handleSelectProject(pMatch); return }
                  const hMatch = hydro.find(h => h.name.toLowerCase().includes(q) || (h.river && h.river.toLowerCase().includes(q)))
                  if (hMatch) { handleSelectHydro(hMatch); return }
                  const dMatch = districts.find(d => d.name.toLowerCase().includes(q))
                  if (dMatch) { handleSelectDistrict(dMatch); return }
                  const pkMatch = displayParks.find(p => p.name.toLowerCase().includes(q))
                  if (pkMatch) { handleSelectPark(pkMatch); return }
                  const prMatch = PROVINCES.find(p => p.toLowerCase().includes(q))
                  if (prMatch) { handleSelectProvince(prMatch); return }
                } else if (e.key === 'Escape') {
                  setSearchQuery('')
                  setSearchFocused(false)
                  searchRef.current?.blur()
                }
              }}
              className="atlas-search-input"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); searchRef.current?.focus() }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 0, lineHeight: 1, fontSize: '.8rem', flexShrink: 0 }} aria-label="Clear search">✕</button>
            )}
          </div>
          {searchFocused && searchQuery.trim().length >= 1 && (() => {
            const q = searchQuery.trim().toLowerCase()
            const projMatches = projectPoints.filter(pt =>
              pt.p.name.toLowerCase().includes(q) ||
              (pt.p.category && pt.p.category.toLowerCase().includes(q)) ||
              (pt.p.location && pt.p.location.toLowerCase().includes(q)) ||
              (pt.siteLabel && pt.siteLabel.toLowerCase().includes(q))
            ).slice(0, 5)
            const hydroMatches = hydro.filter(h =>
              h.name.toLowerCase().includes(q) ||
              (h.river && h.river.toLowerCase().includes(q)) ||
              (h.promoter && h.promoter.toLowerCase().includes(q)) ||
              (h.district && h.district.toLowerCase().includes(q))
            ).slice(0, 4)
            const distMatches = districts.filter(d =>
              d.name.toLowerCase().includes(q) || d.province.toLowerCase().includes(q)
            ).slice(0, 5)
            const parkMatches = displayParks.filter(p =>
              p.name.toLowerCase().includes(q) || p.type.toLowerCase().includes(q)
            ).slice(0, 4)
            const provMatches = PROVINCES.filter(p => p.toLowerCase().includes(q)).slice(0, 3)

            const totalMatches = projMatches.length + hydroMatches.length + distMatches.length + parkMatches.length + provMatches.length

            if (totalMatches === 0) {
              return (
                <div className="atlas-search-results atlas-search-empty">
                  <span style={{ fontSize: '.72rem', color: 'var(--text-tertiary)' }}>No projects, districts or parks found for &ldquo;{searchQuery}&rdquo;</span>
                </div>
              )
            }

            return (
              <div className="atlas-search-results">
                {projMatches.length > 0 && <div style={{ padding: '.45rem .7rem .2rem', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }} className="text-tertiary">Projects</div>}
                {projMatches.map(pt => (
                  <button
                    key={`sproj-${pt.p.name}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectProject(pt) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, width: '100%', padding: '.4rem .7rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    className="atlas-search-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <Building2 size={13} style={{ color: STATUS_COLOR[pt.p.status] ?? 'var(--accent)', flexShrink: 0 }} />
                      <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pt.p.name}</span>
                    </div>
                    <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{pt.p.progress}%</span>
                  </button>
                ))}

                {hydroMatches.length > 0 && <div style={{ padding: '.45rem .7rem .2rem', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }} className="text-tertiary">Hydropower</div>}
                {hydroMatches.map(h => (
                  <button
                    key={`shydro-${h.name}-${h.licNo}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectHydro(h) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, width: '100%', padding: '.4rem .7rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    className="atlas-search-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                      <Zap size={13} style={{ color: HYDRO_KIND_COLOR[hydroKind(h.licenseType)], flexShrink: 0 }} />
                      <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{h.name}</span>
                    </div>
                    <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', flexShrink: 0 }}>{h.mw} MW</span>
                  </button>
                ))}

                {distMatches.length > 0 && <div style={{ padding: '.45rem .7rem .2rem', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }} className="text-tertiary">District</div>}
                {distMatches.map(d => (
                  <button
                    key={`sd-${d.id}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectDistrict(d) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, width: '100%', padding: '.4rem .7rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    className="atlas-search-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><MapPin size={12} className="text-tertiary" /><span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>{d.name}</span></div>
                    <span style={{ fontSize: '.62rem', color: 'var(--text-tertiary)' }}>{d.province}</span>
                  </button>
                ))}

                {provMatches.length > 0 && <div style={{ padding: '.45rem .7rem .2rem', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }} className="text-tertiary">Province</div>}
                {provMatches.map(p => (
                  <button
                    key={`sp-${p}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectProvince(p) }}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', padding: '.4rem .7rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    className="atlas-search-row"
                  >
                    <MapPin size={12} className="text-accent" />
                    <span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>{p} Province</span>
                  </button>
                ))}

                {parkMatches.length > 0 && <div style={{ padding: '.45rem .7rem .2rem', fontSize: '.56rem', fontWeight: 800, letterSpacing: '.07em', textTransform: 'uppercase' }} className="text-tertiary">Protected Area</div>}
                {parkMatches.map(p => (
                  <button
                    key={`sk-${p.name}`}
                    onMouseDown={(e) => { e.preventDefault(); handleSelectPark(p) }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 7, width: '100%', padding: '.4rem .7rem', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    className="atlas-search-row"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><TreePine size={12} style={{ color: '#0f766e' }} /><span style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</span></div>
                    <span style={{ fontSize: '.62rem', color: 'var(--text-tertiary)' }}>{p.type}</span>
                  </button>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Layer Toggles */}
        <div className="atlas-layer-bar">
          {([
            { key: 'hydro', label: 'Hydro', color: '#16a34a', count: counts.hydro },
            { key: 'projects', label: 'Projects', color: '#0d7c5f', count: counts.projects },
            { key: 'quakes', label: 'Tremors', color: '#f59e0b', count: counts.quakes },
            { key: 'quakesPast', label: 'History', color: '#b45309', count: counts.quakesPast },
            { key: 'incidents', label: 'Incidents', color: '#7c3aed', count: counts.incidents },
            { key: 'rain', label: 'Rain 24 h', color: '#0ea5e9', count: counts.rain },
            { key: 'pm25', label: 'Air PM2.5', color: '#7e22ce', count: counts.pm25 },
            { key: 'rivers', label: 'Rivers', color: '#dc2626', count: counts.rivers },
            { key: 'weather', label: 'Weather', color: '#2563eb', count: counts.weather },
            { key: 'roads', label: 'Roads', color: '#b45309', count: counts.roadblocks },
            { key: 'parks', label: 'Protected', color: '#0f766e', count: displayParks.length },
            { key: 'capitals', label: 'Capitals', color: '#475569', count: counts.capitals },
          ] as { key: keyof Layers; label: string; color: string; count: number | null }[]).map(({ key, label, color, count }) => {
            const active = layers[key]
            return (
              <button
                key={key}
                onClick={() => toggle(key)}
                className={`atlas-layer-chip ${active ? 'active' : 'inactive'}`}
                style={{
                  borderColor: active ? color : 'transparent',
                }}
                title={`${label}${count != null ? ` (${count})` : ''} · Click to toggle on/off`}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    boxShadow: active ? `0 0 6px ${color}` : 'none',
                  }}
                />
                <span>{label}</span>
                {count != null && (
                  <span
                    style={{
                      fontSize: '.62rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: 99,
                      background: active ? `${color}25` : 'var(--bg-sunken)',
                      color: active ? color : 'var(--text-tertiary)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}

          {layers.hydro && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: '2px 3px', borderRadius: 99, background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', marginLeft: 2 }}>
              {(['all', 'operation', 'generation', 'survey'] as const).map(k => (
                <button
                  key={k}
                  onClick={(e) => { e.stopPropagation(); setHydroKindFilter(k) }}
                  style={{
                    fontSize: '.58rem',
                    fontWeight: hydroKindFilter === k ? 800 : 500,
                    padding: '2px 6px',
                    borderRadius: 99,
                    cursor: 'pointer',
                    border: 'none',
                    background: hydroKindFilter === k ? (k === 'all' ? 'var(--accent)' : HYDRO_KIND_COLOR[k]) : 'transparent',
                    color: hydroKindFilter === k ? '#fff' : 'var(--text-secondary)',
                    transition: 'all 0.15s ease',
                  }}
                  title={k === 'all' ? 'All hydropower plants' : `${HYDRO_KIND_LABEL[k]} hydro`}
                >
                  {k === 'all' ? 'All' : k === 'operation' ? 'Op' : k === 'generation' ? 'Gen' : 'Surv'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => setIsInspectorOpen(o => !o)}
            className={`atlas-topbar-pill ${isInspectorOpen ? 'text-accent' : 'text-ink'}`}
            style={{
              fontSize: '.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: isInspectorOpen ? '1.5px solid var(--accent)' : '1px solid var(--border-light)',
              height: 34,
              padding: '5px 11px',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
            title="Toggle projects & hydro data inspector"
          >
            <SlidersHorizontal size={14} className={isInspectorOpen ? 'text-accent' : 'text-secondary'} />
            <span>Data ({visibleProjects.length})</span>
          </button>

          <button
            onClick={toggleTheme}
            className="atlas-topbar-pill text-ink"
            style={{ width: 34, height: 34, padding: 0, justifyContent: 'center', cursor: 'pointer' }}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="atlas-topbar-pill text-ink"
            style={{ width: 34, height: 34, padding: 0, justifyContent: 'center', cursor: 'pointer' }}
            title={isFullscreen ? 'Exit full screen' : 'Full screen map'}
            aria-label="Toggle full screen"
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>
        </div>
      </header>

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
                    {stationWx?.temperature_2m != null ? `${stationWx.temperature_2m.toFixed(1)}°C` : '-'}
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
                        <strong>{d.from_temperature ?? '-'}° / {d.to_temperature ?? '-'}°</strong>
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
                {cur != null ? cur.toFixed(2) : '-'}
              </strong>
              <span style={{ fontSize: '.7rem' }} className="text-secondary">m water level</span>
              <span style={{ marginLeft: 'auto', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.2rem .45rem', borderRadius: 99, color: '#fff', background: RIVER_LEVEL_COLOR[lvl] }}>
                {lvl === 'danger' ? 'Danger' : lvl === 'warn' ? 'Warning' : 'Normal'}
              </span>
            </div>
            {pct != null && (
              <div className="level-gauge" title={`Current ${cur} m · Warning ${warn ?? '-'} m · Danger ${dang} m`}>
                <span className="fill" style={{ width: `${pct}%`, background: RIVER_LEVEL_COLOR[lvl] }} />
                {warnPct != null && <span className="mark" style={{ left: `${warnPct}%` }} />}
                <span className="mark danger" style={{ left: '100%' }} />
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem', marginTop: '.6rem' }}>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Warning</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem' }}>{warn != null ? `${warn} m` : '-'}</strong>
              </div>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Danger</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem', color: 'var(--danger)' }}>{dang != null ? `${dang} m` : '-'}</strong>
              </div>
              <div style={{ padding: '.5rem .55rem' }} className="bg-sunken rounded-[8px]">
                <span style={{ fontSize: '.54rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Trend</span>
                <strong style={{ display: 'block', fontSize: '.74rem', marginTop: '.1rem' }}>{riverSel.steady ? riverSel.steady.toLowerCase() : '-'}</strong>
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
                {head != null ? head.toFixed(1) : '-'}
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
                        {a?.value != null ? a.value.toFixed(1) : '-'}
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
              <strong style={{ display: 'block', fontSize: '.76rem', marginTop: '.1rem' }}>{quakeSel.depthKm != null ? `${Math.round(quakeSel.depthKm)} km` : '-'}</strong>
            </div>
          </div>
          <p style={{ margin: '.55rem 0 0', fontSize: '.66rem' }} className="text-secondary">
            {quakeSel.coordinates[1].toFixed(3)}°N, {quakeSel.coordinates[0].toFixed(3)}°E ·{' '}
            <a href={quakeSel.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>USGS event page →</a>
          </p>
        </div>
      )}

      {muniSel && !stationSel && !hydroSel && !quakeSel && !riverSel && !rainSel && !parkSel && (
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
          {(() => {
            const c = districtId != null ? palikaCensus[districtId] : undefined
            if (districtId == null) return null
            const row = c ? palikaRow(c, muniSel) : null
            if (c === undefined) return <p className="muted" style={{ fontSize: '.62rem', margin: '.55rem 0 0' }}>Loading palika census…</p>
            if (c === null || !row) return <p className="muted" style={{ fontSize: '.62rem', margin: '.55rem 0 0' }}>No census row matched this palika.</p>
            const dist = profiles[districtId]?.population ?? 0
            const share = dist > 0 ? (row.population / dist) * 100 : null
            const femaleShare = row.population > 0 ? (row.female / row.population) * 100 : null
            return (
              <div style={{ marginTop: '.75rem', paddingTop: '.7rem', borderTop: '1px solid var(--border-light)' }}>
                <p className="eyebrow" style={{ margin: '0 0 .45rem' }}>CENSUS PROFILE · {row.censusYear}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                  {[
                    ['Population', row.population.toLocaleString('en-US'), '#2563eb'],
                    ['Households', row.households.toLocaleString('en-US'), '#0891b2'],
                    ['Literate · 5+', row.literacy != null ? `${row.literacy.toFixed(0)}%` : '—', '#16a34a'],
                    ['Share of district', share != null ? `${share.toFixed(1)}%` : '—', '#7c3aed'],
                  ].map(([label, val, c2]) => (
                    <div key={label as string} style={{ padding: '.45rem .6rem' }} className="bg-sunken rounded-[8px]">
                      <span style={{ fontSize: '.52rem', letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">{label}</span>
                      <strong style={{ display: 'block', fontSize: '.95rem', marginTop: '.05rem', color: c2 as string }}>{val}</strong>
                    </div>
                  ))}
                </div>
                {femaleShare != null && (
                  <div style={{ marginTop: '.6rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.55rem', fontWeight: 700 }} className="text-tertiary">
                      <span>Male {row.male.toLocaleString('en-US')}</span>
                      <span>Female {row.female.toLocaleString('en-US')}</span>
                    </div>
                    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: '.25rem' }}>
                      <span style={{ width: `${100 - femaleShare}%`, background: '#2563eb' }} />
                      <span style={{ width: `${femaleShare}%`, background: '#db2777' }} />
                    </div>
                  </div>
                )}
                <p className="muted" style={{ fontSize: '.58rem', margin: '.55rem 0 0' }}>
                  Census {row.censusYear} counts as filed for this palika (NDRRMA/BIPAD){share == null ? '' : ' — the share is computed here from the district total'}.
                </p>
              </div>
            )
          })()}
        </div>
      )}

      {/* Park / Protected Area info panel */}
      {parkSel && !stationSel && !hydroSel && !quakeSel && !riverSel && !rainSel && (
        <div className="atlas-float atlas-station" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #0f766e 100%)', color: '#fff', padding: '.9rem 1rem 1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <p className="eyebrow" style={{ margin: 0, color: 'rgba(255,255,255,.8)' }}>PROTECTED AREA · NEPAL</p>
              <button onClick={() => setParkSel(null)} aria-label="Close park" style={{ fontSize: '.8rem', fontWeight: 700, color: '#fff', opacity: .8 }}>✕</button>
            </div>
            <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: '.2rem', lineHeight: 1.25 }}>{parkSel.name}</strong>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '.35rem', fontSize: '.6rem', fontWeight: 700, letterSpacing: '.06em', padding: '.15rem .45rem', borderRadius: 99, background: 'rgba(255,255,255,.2)' }}>
              <TreePine size={10} /> {parkSel.type.toUpperCase()}
            </span>
          </div>
          <div style={{ padding: '.8rem 1rem .9rem', display: 'flex', flexDirection: 'column', gap: '.45rem', fontSize: '.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }} className="text-secondary">
              <MapPin size={14} style={{ color: '#0f766e', flexShrink: 0 }} />
              {parkSel.district.replace(/\b\w/g, c => c.toUpperCase())} District
            </span>
            <p style={{ margin: 0, fontSize: '.68rem' }} className="text-secondary">
              Nepal’s protected area network covers over 23% of its total land area, conserving ecosystems from sub-tropical plains to alpine zones.
            </p>
            <a href="https://dnpwc.gov.np" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', marginTop: '.3rem', fontSize: '.68rem', fontWeight: 700, color: '#0f766e' }}>DNPWC Nepal →</a>
          </div>
        </div>
      )}

      {/* Incident card: slim list row + full record + linked loss + ward/palika/district */}
      {incidentSel && layers.incidents && (() => {
        const i = incidentSel
        const hz = i.hazard != null ? hazards[i.hazard] : undefined
        const kind = hz?.title ?? hz?.titleEn ?? 'Incident'
        const t = incidentDate(i)
        const when = Number.isNaN(t) ? null : new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kathmandu' })
        const extra = incidentExtra?.id === i.id ? incidentExtra : null
        const det = extra?.detail
        const loss = extra?.loss
        const place = extra?.place
        const raw = i as unknown as Record<string, unknown>
        const source = (typeof det?.source === 'string' ? det.source : null) ?? (typeof raw.source === 'string' ? raw.source : typeof raw.dataSource === 'string' ? raw.dataSource : null)
        const coords = i.point ? `${i.point.coordinates[1].toFixed(3)}°N, ${i.point.coordinates[0].toFixed(3)}°E` : null
        const local = place
          ? [[place.municipality, place.municipalityType].filter(Boolean).join(' ') + (place.ward ? `-${place.ward}` : ''), place.district].filter(Boolean).join(', ')
          : ''
        const rows: [string, string][] = [
          ['Date', when ?? 'not given'],
          ['Location', local || coords || '—'],
          ['Source', source ? source.replace(/_/g, ' ') : 'not given'],
          ['Verified', i.verified ? 'yes' : 'not verified'],
        ]
        const n = (v?: number | null) => typeof v === 'number' ? v.toLocaleString('en-US') : '—'
        const impact: [string, string][] = loss ? [
          ['Deaths', n(loss.peopleDeathCount)],
          ['Missing', n(loss.peopleMissingCount)],
          ['Injured', n(loss.peopleInjuredCount)],
          ['Families', n(loss.familyAffectedCount)],
        ] : []
        const detailRows: [string, string][] = []
        if (loss) {
          if (loss.peopleAffectedCount) detailRows.push(['People affected', n(loss.peopleAffectedCount)])
          if (loss.familyRelocatedCount) detailRows.push(['Relocated', n(loss.familyRelocatedCount)])
          if (loss.familyEvacuatedCount) detailRows.push(['Evacuated', n(loss.familyEvacuatedCount)])
          if (loss.infrastructureDestroyedHouseCount) detailRows.push(['Houses destroyed', n(loss.infrastructureDestroyedHouseCount)])
          if (loss.infrastructureAffectedHouseCount) detailRows.push(['Houses damaged', n(loss.infrastructureAffectedHouseCount)])
          if (loss.livestockDestroyedCount) detailRows.push(['Livestock lost', n(loss.livestockDestroyedCount)])
          detailRows.push(['Estimated loss', typeof loss.estimatedLoss === 'number' ? formatNpr(loss.estimatedLoss) : 'not filed'])
        }
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>INCIDENT · BIPAD</p>
                <strong style={{ fontSize: '.9rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{i.title}</strong>
                {det?.titleNe && (
                  <p lang="ne" className="text-secondary" style={{ margin: '.15rem 0 0', fontSize: '.66rem', lineHeight: 1.45 }}>{det.titleNe}</p>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '.35rem', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.15rem .45rem', borderRadius: 99, background: `${hz?.color ?? '#7c3aed'}1f`, color: hz?.color ?? '#7c3aed' }}>
                  <span style={{ display: 'inline-flex', lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: hazardPinSvg(i.hazard, hz?.color, 14) }} />
                  {kind}
                </span>
              </div>
              <button onClick={() => setIncidentSel(null)} aria-label="Close incident" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.28rem', fontSize: '.66rem' }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                  <span style={{ width: 62, flexShrink: 0 }} className="text-tertiary">{k}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
              {coords && local && (
                <div style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                  <span style={{ width: 62, flexShrink: 0 }} className="text-tertiary">Coords</span>
                  <span style={{ flex: 1 }}>{coords}</span>
                </div>
              )}
            </div>
            {impact.length > 0 && (
              <>
                <p className="eyebrow" style={{ margin: '.7rem 0 .3rem', fontSize: '.52rem' }}>LOSS · LINKED BIPAD RECORD</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
                  {impact.map(([k, v]) => (
                    <div key={k} className="bg-sunken" style={{ borderRadius: 6, padding: '.35rem .2rem', textAlign: 'center' }}>
                      <strong style={{ display: 'block', fontSize: '.82rem', lineHeight: 1.2, color: k === 'Deaths' && Number(v.replace(/,/g, '')) > 0 ? '#b91c1c' : undefined }}>{v}</strong>
                      <span className="text-tertiary" style={{ display: 'block', fontSize: '.48rem', fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 1 }}>{k}</span>
                    </div>
                  ))}
                </div>
                {detailRows.length > 0 && (
                  <div style={{ marginTop: '.4rem', display: 'flex', flexDirection: 'column', gap: '.24rem', fontSize: '.64rem' }}>
                    {detailRows.map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                        <span style={{ width: 96, flexShrink: 0 }} className="text-tertiary">{k}</span>
                        <span style={{ flex: 1 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {extra?.loading && (
              <p className="muted" style={{ fontSize: '.58rem', margin: '.55rem 0 0' }}>Loading the linked BIPAD loss record…</p>
            )}
            {extra && !extra.loading && !loss && (
              <p className="muted" style={{ fontSize: '.58rem', margin: '.55rem 0 0' }}>
                No loss record is linked to this incident; casualties and damage may not have been filed yet.
              </p>
            )}
            {det?.cause && (
              <p style={{ margin: '.55rem 0 0', fontSize: '.64rem' }} className="text-secondary">
                <strong>Cause:</strong> {det.cause}
              </p>
            )}
            {det?.description && (
              <p style={{ margin: '.3rem 0 0', fontSize: '.64rem' }} className="text-secondary">
                <strong>Details:</strong> {det.description}
              </p>
            )}
            {det?.verificationMessage && (
              <p style={{ margin: '.3rem 0 0', fontSize: '.6rem' }} className="text-tertiary">
                <strong>Verification note:</strong> {det.verificationMessage}
              </p>
            )}
            <p className="muted" style={{ fontSize: '.56rem', margin: '.55rem 0 0' }}>
              Incident and loss figures are as filed on BIPAD (NDRRMA); zeros are filed zeros, not missing values. Relief payouts are a separate, sparse dataset.
            </p>
          </div>
        )
      })()}

      {/* Highway card: opened by clicking an NHxx label on the road layer */}
      {highwaySel && layers.roads && !roadSel && (() => {
        const hw = highwaySel.ref
        const key = roadRefKey(hw)
        const rows = roadBlocks.filter(r => roadRefKey(r.roadRefno) === key)
        const active = rows.filter(roadBlocked)
        const closed = active.filter(roadClosed).length
        const partial = active.length - closed
        const names = new Map<string, number>()
        for (const r of active) if (r.title) names.set(r.title, (names.get(r.title) ?? 0) + 1)
        const name = highwaySel.name ?? [...names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `Highway ${hw}`
        const hit = [...new Set(active.map(r => r.district).filter((x): x is number => typeof x === 'number'))]
          .map(id => districts.find(d => d.id === id)?.name ?? `District ${id}`)
        const causes = new Map<string, number>()
        for (const r of active) if (r.closureReason) causes.set(r.closureReason, (causes.get(r.closureReason) ?? 0) + 1)
        const cause = [...causes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
        const starts = active.map(r => r.dateRoadblockStart ?? '').filter(s => /^\d{4}-\d{2}-\d{2}/.test(s) && Number(s.slice(0, 4)) < 2100).sort()
        const latest = roadWhen(starts[starts.length - 1])
        const list = [...active].sort((a, b) => (b.dateRoadblockStart ?? '').localeCompare(a.dateRoadblockStart ?? '')).slice(0, 5)
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>HIGHWAY · {hw}</p>
                <strong style={{ fontSize: '.95rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{name}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '.35rem', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.15rem .45rem', borderRadius: 99, background: `${closed ? '#dc2626' : partial ? '#f59e0b' : '#16a34a'}1f`, color: closed ? '#dc2626' : partial ? '#f59e0b' : '#16a34a' }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: closed ? '#dc2626' : partial ? '#f59e0b' : '#16a34a' }} />
                  {active.length ? `${closed} closed · ${partial} partial` : 'no live blockage'}
                </span>
              </div>
              <button onClick={() => setHighwaySel(null)} aria-label="Close highway" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <div style={{ marginTop: '.55rem', display: 'flex', flexDirection: 'column', gap: '.28rem', fontSize: '.66rem' }}>
              {([
                ['Live blocks', String(active.length)],
                ['Events in log', `${rows.length} (last ~6 months)`],
                ['Districts', hit.length ? `${hit.slice(0, 4).join(', ')}${hit.length > 4 ? ` +${hit.length - 4}` : ''}` : 'not given'],
                ['Latest block', latest ?? 'not given'],
                ['Main cause', cause ?? 'not recorded'],
                ['Length', 'not published in this log'],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                  <span style={{ width: 84, flexShrink: 0 }} className="text-tertiary">{k}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
            </div>
            {list.length > 0 && (
              <div style={{ marginTop: '.6rem', borderTop: '1px solid var(--border-light, #e7e5e4)', paddingTop: '.45rem' }}>
                <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.52rem' }}>BLOCKAGES ON THIS HIGHWAY</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {list.map(r => {
                    const st = ROAD_STATUS[r.status ?? ''] ?? ROAD_STATUS.CLOSED
                    return (
                      <button key={r.id} onClick={() => { setRoadSel(r); setHighwaySel(null) }}
                        title={`Open ${r.location ?? r.title}`}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left', padding: '2px 0', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '.63rem', color: 'var(--text)' }}>
                        <span style={{ width: 6, height: 6, borderRadius: 99, background: st.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.location ?? r.title}</span>
                        <span style={{ fontSize: '.55rem', color: st.color, fontWeight: 800, flexShrink: 0 }}>{st.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            <p style={{ margin: '.55rem 0 0', fontSize: '.6rem', fontWeight: 700, color: '#b45309' }}>
              ━ {hw} alignment highlighted on the map
            </p>
            <p className="muted" style={{ fontSize: '.56rem', margin: '.35rem 0 0' }}>
              DoR blockage log via BIPAD; alignment from OpenStreetMap. Blockage history covers roughly six months, so “live blocks” is a snapshot, not a road condition.
            </p>
          </div>
        )
      })()}

      {/* Road blockage card: Department of Roads log carried by BIPAD */}
      {roadSel && (() => {
        const r = roadSel
        const st = ROAD_STATUS[r.status ?? ''] ?? ROAD_STATUS.CLOSED
        const shut = roadClosed(r)
        const started = roadWhen(r.dateRoadblockStart)
        const ended = roadWhen(r.dateRoadblockEnd)
        const eta = roadWhen(r.dateRoadblockEndEstimated)
        const rows: [string, string][] = [
          ['Location', r.location ?? '—'],
          ['Division', r.division ?? '—'],
          ['Chainage', r.chainage ?? '—'],
          ['Blocked since', started ?? 'date not given'],
          ['Reopen ETA', r.repairEta || eta || 'not given'],
        ]
        if (ended) rows.push(['Reopened (reported)', ended])
        if (r.actualRepairTime && !shut) rows.push(['Actual repair', r.actualRepairTime])
        if (r.contactPerson) rows.push(['Roads contact', r.contactPerson])
        return (
          <div className="atlas-float atlas-station">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '.5rem' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>ROAD BLOCK · {r.roadRefno ?? 'NEPAL'}</p>
                <strong style={{ fontSize: '.95rem', display: 'block', marginTop: '.15rem', lineHeight: 1.3 }}>{r.title}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: '.35rem', fontSize: '.58rem', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', padding: '.15rem .45rem', borderRadius: 99, background: `${st.color}1f`, color: st.color }}>
                  <span style={{ width: 6, height: 6, borderRadius: 99, background: st.color }} />
                  {st.label}
                </span>
              </div>
              <button onClick={() => setRoadSel(null)} aria-label="Close road block" style={{ fontSize: '.8rem', fontWeight: 700 }} className="text-tertiary">✕</button>
            </div>
            <p style={{ margin: '.55rem 0 0', fontSize: '.7rem', fontWeight: 600 }}>
              {r.closureReason ?? 'Cause not recorded'}
            </p>
            <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.28rem', fontSize: '.66rem' }}>
              {rows.map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '.5rem', alignItems: 'baseline' }}>
                  <span style={{ width: 86, flexShrink: 0 }} className="text-tertiary">{k}</span>
                  <span style={{ flex: 1 }}>{v}</span>
                </div>
              ))}
            </div>
            {r.effortsBeingMade && (
              <p style={{ margin: '.55rem 0 0', fontSize: '.64rem' }} className="text-secondary">
                <strong>Efforts:</strong> {r.effortsBeingMade}
              </p>
            )}
            {r.remarks && r.remarks.toLowerCase() !== (r.division ?? '').toLowerCase() && (
              <p style={{ margin: '.3rem 0 0', fontSize: '.62rem' }} className="text-secondary">
                <strong>Remarks:</strong> {r.remarks}
              </p>
            )}
            {r.images && r.images.length > 0 && (
              <div style={{ marginTop: '.65rem', borderTop: '1px solid var(--border-light, #e7e5e4)', paddingTop: '.55rem' }}>
                <p className="eyebrow" style={{ margin: '0 0 .35rem', fontSize: '.52rem' }}>SITE PHOTOS · {r.images.length}</p>
                <div style={{ display: 'grid', gridTemplateColumns: r.images.length === 1 ? '1fr' : 'repeat(3, 1fr)', gap: 4 }}>
                  {r.images.slice(0, 3).map((u, i) => (
                    <a key={`${u}-${i}`} href={u} target="_blank" rel="noreferrer" title={`Open site photo ${i + 1}`}
                      className="bg-sunken"
                      style={{ display: 'block', aspectRatio: r.images!.length === 1 ? '16 / 9' : '4 / 3', overflow: 'hidden', borderRadius: 6 }}>
                      <img src={u} alt={`${r.title} site photo ${i + 1}`} loading="lazy" referrerPolicy="no-referrer"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </a>
                  ))}
                </div>
                {r.images.length > 3 && (
                  <a href={r.images[0]} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '.35rem', fontSize: '.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                    View all {r.images.length} photos ↗
                  </a>
                )}
              </div>
            )}
            {r.roadRefno && (
              <p style={{ margin: '.55rem 0 0', fontSize: '.6rem', fontWeight: 700, color: st.color }}>
                ━ {r.roadRefno} alignment highlighted on the map
              </p>
            )}
            <p className="muted" style={{ fontSize: '.56rem', margin: '.55rem 0 0' }}>
              Department of Roads blockage log via BIPAD; road lines from OpenStreetMap. Only closed and partially open roads are mapped; {roadBlocks.length - counts.roadblocks} reopened events are left off.
            </p>
          </div>
        )
      })()}

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
            {(() => {
              const prof = districtId != null ? profiles[districtId] : undefined
              const risk = districtId != null ? quakeRisk[districtId] : undefined
              if (districtIds === null || (districtId != null && prof === undefined)) return <p className="muted" style={{ fontSize: '.62rem', margin: '.55rem 0 0' }}>Loading district profile…</p>
              if (prof == null && !risk) return <p className="muted" style={{ fontSize: '.62rem', margin: '.55rem 0 0' }}>No NDRRMA profile matched this district.</p>
              const peak = prof ? Math.max(1, ...prof.ageBands.map(b => Math.max(b.male, b.female))) : 1
              return (
                <div style={{ marginTop: '.75rem', paddingTop: '.7rem', borderTop: '1px solid var(--border-light)' }}>
                  <p className="eyebrow" style={{ margin: '0 0 .45rem' }}>CENSUS PROFILE{prof?.censusYear ? ` · ${prof.censusYear}` : ''}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                    {[
                      ['Population', prof ? prof.population.toLocaleString('en-US') : '—', '#2563eb'],
                      ['Households', prof ? prof.households.toLocaleString('en-US') : '—', '#0891b2'],
                      ['Literate · 5+', prof?.literacy != null ? `${prof.literacy.toFixed(0)}%` : '—', '#16a34a'],
                      ['Seismic risk', risk ? `${risk.riskScore.toFixed(1)} · #${risk.rank}` : '—', '#dc2626'],
                    ].map(([label, val, c]) => (
                      <div key={label as string} style={{ padding: '.45rem .6rem' }} className="bg-sunken rounded-[8px]">
                        <span style={{ fontSize: '.52rem', letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">{label}</span>
                        <strong style={{ display: 'block', fontSize: '.95rem', marginTop: '.05rem', color: c as string }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                  {prof && prof.ageBands.length > 0 && (
                    <div style={{ marginTop: '.6rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.55rem', letterSpacing: '.07em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">
                        <span>‹ Male</span><span>Age band</span><span>Female ›</span>
                      </div>
                      <div style={{ marginTop: '.25rem', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {prof.ageBands.map(b => (
                          <div key={b.band} style={{ display: 'flex', alignItems: 'center', gap: '.3rem', fontSize: '.55rem' }}>
                            <span style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
                              <span style={{ width: `${(b.male / peak) * 100}%`, height: 6, background: '#2563eb', borderRadius: '3px 0 0 3px', minWidth: b.male > 0 ? 1 : 0 }} />
                            </span>
                            <span className="text-tertiary" style={{ width: 34, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>{b.band}</span>
                            <span style={{ flex: 1 }}>
                              <span style={{ width: `${(b.female / peak) * 100}%`, height: 6, display: 'block', background: '#db2777', borderRadius: '0 3px 3px 0', minWidth: b.female > 0 ? 1 : 0 }} />
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <p className="muted" style={{ fontSize: '.58rem', margin: '.55rem 0 0' }}>
                    {prof ? `${prof.units} palika rows summed here — the API files census counts per palika, so this district total is computed, not published. ` : ''}
                    Seismic risk score is NDRRMA&apos;s own per-district ranking.
                  </p>
                </div>
              )
            })()}
            <p className="muted" style={{ fontSize: '.62rem', margin: '.6rem 0 0' }}>Projects in scope are listed in the right panel.</p>
          </div>
        )
      })()}

      {/* Bottom-left: Legend + Scale Bar */}
      <div className="atlas-bottom-left">
        <div className="atlas-legend-dock">
          <div className="legend-header" onClick={() => setIsLegendExpanded(v => !v)}>
            <span style={{ fontSize: '.58rem', letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 800 }}>🗺 Map Legend</span>
            <span style={{ fontSize: '.62rem', color: 'var(--text-tertiary)' }}>{isLegendExpanded ? '▲' : '▼'}</span>
          </div>
          {isLegendExpanded && (
            <div className="legend-items">
              {([
                { key: 'projects', color: '#0d7c5f', label: 'Projects' },
                { key: 'hydro', color: '#16a34a', label: 'Hydro Op.' },
                { key: 'hydro', color: '#2563eb', label: 'Hydro Gen.' },
                { key: 'hydro', color: '#d97706', label: 'Hydro Surv.' },
                { key: 'rain', color: '#0ea5e9', label: 'Rain 24 h' },
                { key: 'pm25', color: '#7e22ce', label: 'Air PM2.5' },
                { key: 'rivers', color: '#dc2626', label: 'River Level' },
                { key: 'quakes', color: '#f59e0b', label: 'Tremors' },
                { key: 'quakesPast', color: '#b45309', label: 'Historic EQ' },
                { key: 'incidents', color: '#7c3aed', label: 'Incidents' },
                { key: 'weather', color: '#2563eb', label: 'Weather Stn' },
                { key: 'roads', color: '#b45309', label: 'Roads' },
                { key: 'parks', color: '#0f766e', label: 'Protected Areas' },
              ] as { key: keyof Layers; color: string; label: string }[]).map(({ key, color, label }, i) => (
                <button key={`${key}-${i}`} onClick={() => toggle(key)} className="atlas-legend-dot"
                  style={{ opacity: layers[key] ? 1 : 0.45, border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontWeight: 700, fontSize: '.63rem' }}
                  title={`${label} - click to ${layers[key] ? 'hide' : 'show'}`}>
                  <span style={{ width: key === 'rain' || key === 'pm25' ? 22 : 8, height: 8, borderRadius: key === 'roads' ? 2 : key === 'rain' ? 99 : '50%', background: key === 'rain' ? RAIN_HEAT_GRADIENT : key === 'pm25' ? PM25_HEAT_GRADIENT : color, flexShrink: 0 }} />
                  {label}
                </button>
              ))}
              {layers.roads && (
                <span className="atlas-hq-legend-item" style={{ gap: 6 }} title="Department of Roads blockage events carried by BIPAD. Only closed and partially open roads are drawn; reopened events are left off.">
                  <span style={{ display: 'inline-flex', gap: 3 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: '#dc2626' }} />
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: '#f59e0b' }} />
                  </span>
                  {counts.roadClosed} closed · {counts.roadPartial} partial
                </span>
              )}
              {layers.roads && (
                <span className="atlas-hq-legend-item" style={{ fontSize: '.52rem', opacity: 0.65 }} title="Road geometry: OpenStreetMap via OpenFreeMap vector tiles">
                  Road lines © OpenStreetMap contributors · OpenFreeMap
                </span>
              )}
              {layers.rain && (
                <span className="atlas-hq-legend-item" style={{ gap: 6 }} title="Rain-gauge heat field: daily accumulation, gauges reading in the last 48 h">
                  <span style={{ width: 46, height: 6, borderRadius: 99, background: RAIN_HEAT_GRADIENT }} />
                  0 → 60+ mm / 24 h · grey tick = dry
                </span>
              )}
              {layers.pm25 && (
                <span className="atlas-hq-legend-item" style={{ gap: 6 }} title="CAMS model PM2.5 on its native ~0.4° grid — a regional picture, not a street-level reading. It cannot resolve valleys, so Kathmandu's real PM2.5 runs far higher than the model shows.">
                  <span style={{ width: 46, height: 6, borderRadius: 99, background: PM25_HEAT_GRADIENT }} />
                  5 → 75+ µg/m³ · WHO bands · ~0.4° model grid, valleys not resolved
                </span>
              )}
              {[
                { level: 'country', label: 'National capital' },
                { level: 'province', label: 'Province capital' },
                { level: 'district', label: 'District HQ locality' },
              ].map(({ level, label }) => (
                <span key={level} className="atlas-hq-legend-item">
                  <span className={`atlas-hq-legend-dot atlas-hq-${level}`} />{label}
                </span>
              ))}
            </div>
          )}
          {/* Scale bar — always visible at bottom of legend */}
          {(() => {
            const metersPerPx = 156543.03392 * Math.cos(centerCoord.lat * Math.PI / 180) / Math.pow(2, zoomLevel)
            const rawM = metersPerPx * 80
            const nice = [1,2,5,10,20,50,100,200,500,1000,2000,5000,10000,20000,50000,100000].find(n => n >= rawM) ?? 100000
            const widthPx = Math.round(nice / metersPerPx)
            const scaleLabel = nice >= 1000 ? `${nice / 1000} km` : `${nice} m`
            return (
              <div style={{ marginTop: '.5rem', paddingTop: '.4rem', borderTop: '1px solid var(--border-light)' }}>
                <div style={{ width: widthPx, height: 3, background: 'var(--text-tertiary)', borderRadius: 99, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '50%', background: 'var(--text)', borderRadius: 99 }} />
                  <div style={{ position: 'absolute', left: 0, top: -3, bottom: -3, width: 1.5, background: 'var(--text-tertiary)' }} />
                  <div style={{ position: 'absolute', right: 0, top: -3, bottom: -3, width: 1.5, background: 'var(--text-tertiary)' }} />
                </div>
                <span style={{ fontSize: '.52rem', fontWeight: 700, color: 'var(--text-tertiary)', letterSpacing: '.03em', display: 'block', marginTop: 2 }}>{scaleLabel}</span>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Bottom Right Controls: Basemap Toggle + Zoom Stack + GPS */}
      <div className="atlas-bottom-controls">
        {/* Map title & coords badge */}
        <div className="atlas-title-badge">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <strong style={{ fontSize: '.74rem', color: 'var(--text)', lineHeight: 1.2 }}>Nepal, plotted.</strong>
            <span style={{ fontSize: '.56rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
              {centerCoord.lat.toFixed(3)}°N · {centerCoord.lng.toFixed(3)}°E
            </span>
          </div>
        </div>

        {/* Basemap toggle + Zoom row */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div className="atlas-basemap-picker">
            <button className="atlas-basemap-trigger" type="button" onClick={() => setIsBasemapMenuOpen(open => !open)} aria-expanded={isBasemapMenuOpen} aria-haspopup="dialog" aria-label={`Basemap: ${BASEMAPS[basemap].name}`}>
              <BasemapPreview kind={basemap} className="atlas-basemap-trigger-preview" />
              <span className="atlas-basemap-trigger-copy"><span>Map style</span><strong>{BASEMAPS[basemap].name}</strong></span>
              <LayersIcon size={15} aria-hidden="true" />
            </button>
            {isBasemapMenuOpen && <div className="atlas-basemap-menu" role="dialog" aria-label="Choose map style">
              <div className="atlas-basemap-menu-heading"><span>Map style</span><button type="button" onClick={() => setIsBasemapMenuOpen(false)} aria-label="Close map style menu"><X size={15} /></button></div>
              <div className="atlas-basemap-options">{BASEMAP_KEYS.map(key => <button key={key} type="button" className={`atlas-basemap-option${basemap === key ? ' is-selected' : ''}`} aria-pressed={basemap === key} onClick={() => { setBasemap(key); setIsBasemapMenuOpen(false) }}>
                <BasemapPreview kind={key} />
                <span>{BASEMAPS[key].name}</span>
                {basemap === key && <Check size={14} aria-hidden="true" />}
              </button>)}</div>
            </div>}
          </div>

          {/* Zoom stack + GPS button */}
          <div className="atlas-zoom-pill">
            <button onClick={() => { autoZoomPending.current = true; window.setTimeout(() => { autoZoomPending.current = false }, 1500); mapInstance?.zoomIn() }} className="atlas-zoom-btn" title="Zoom In (+)" aria-label="Zoom in"><Plus size={16} /></button>
            <div className="atlas-zoom-badge">Z{zoomLevel}</div>
            <button onClick={() => { autoZoomPending.current = true; window.setTimeout(() => { autoZoomPending.current = false }, 1500); mapInstance?.zoomOut() }} className="atlas-zoom-btn" title="Zoom Out (−)" aria-label="Zoom out"><Minus size={16} /></button>
            <button onClick={() => { selectProvince(null); mapInstance?.flyToBounds(NEPAL_BBOX, { padding: [40, 40], duration: 0.8 }) }} className="atlas-zoom-btn" title="Reset view" aria-label="Fit Nepal" style={{ borderTop: '1px solid var(--border-light)' }}><RotateCcw size={14} /></button>
            <button
              onClick={locateMe}
              className={`atlas-zoom-btn${gpsPosition ? ' gps-active' : ''}`}
              title={gpsLoading ? 'Locating…' : gpsPosition ? 'Clear location' : 'Show my location'}
              aria-label="My location"
              style={{ borderTop: '1px solid var(--border-light)', color: gpsLoading ? '#d97706' : gpsPosition ? '#2563eb' : 'var(--text)' }}
            >
              {gpsLoading ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.9s linear infinite' }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
              ) : (
                <Navigation size={14} style={{ color: gpsPosition ? '#2563eb' : 'var(--text)' }} />
              )}
            </button>
          </div>
        </div>

        {/* GPS error snackbar */}
        {gpsError && (
          <div
            style={{
              background: 'rgba(220,38,38,.95)',
              color: '#fff',
              borderRadius: 10,
              padding: '.45rem .7rem',
              fontSize: '.64rem',
              fontWeight: 600,
              maxWidth: 230,
              lineHeight: 1.4,
              boxShadow: '0 4px 12px rgba(220,38,38,.3)',
              animation: 'inspectorIn .22s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
              <span style={{ flexShrink: 0 }}>📍</span>
              <span>{gpsError}</span>
              <button onClick={() => setGpsError(null)} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 800, marginLeft: 4, flexShrink: 0 }}>✕</button>
            </div>
          </div>
        )}

        {/* GPS active indicator */}
        {gpsPosition && !gpsError && (
          <div
            style={{
              background: 'rgba(37,99,235,.92)',
              backdropFilter: 'blur(10px)',
              color: '#fff',
              borderRadius: 10,
              padding: '.4rem .7rem',
              fontSize: '.62rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              boxShadow: '0 3px 12px rgba(37,99,235,.35)',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', animation: 'gpsPulse 1.8s ease-out infinite' }} />
            <span>
              {gpsPosition.lat.toFixed(4)}°N, {gpsPosition.lng.toFixed(4)}°E
              <span style={{ opacity: .75, marginLeft: 4 }}>±{Math.round(gpsPosition.accuracy)}m</span>
            </span>
            <button onClick={() => { setGpsPosition(null); setGpsError(null) }} style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', opacity: .75, fontWeight: 700, marginLeft: 2, padding: 0 }}>✕</button>
          </div>
        )}
      </div>

      {/* Attribution bar */}
      <div className="atlas-attribution">
        {BASEMAPS[basemap].attribution} · Drishti v2 · BIPAD · DHM · USGS
      </div>

      {/* Slide-over Inspector Drawer for Hydro capacity & Projects List */}
      {isInspectorOpen && (
        <aside className="atlas-inspector">
          <div style={{ padding: '.9rem 1rem', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>EXPLORER &amp; REGISTRY</p>
              <strong style={{ fontSize: '1.05rem', display: 'block', marginTop: 2 }}>
                {district ? `${district} District` : province ? `${province} Province` : 'Nepal Overview'}
              </strong>
              <p style={{ margin: '2px 0 0', fontSize: '.64rem' }} className="text-secondary">
                {visibleProjects.length} projects · {visibleHydro.length} hydro plants in scope
              </p>
            </div>
            <button
              onClick={() => setIsInspectorOpen(false)}
              aria-label="Close inspector"
              style={{ fontSize: '.9rem', fontWeight: 700, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 4 }}
            >
              ✕
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '.9rem 1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {district && (() => {
              const prof = districtId != null ? profiles[districtId] : undefined
              const risk = districtId != null ? quakeRisk[districtId] : undefined
              if (!prof && !risk) return null
              return (
                <div className="panel" style={{ padding: '.8rem', margin: 0 }}>
                  <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">
                    District profile{prof ? ` · census ${prof.censusYear}` : ''}
                  </span>
                  <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                    {[
                      ['Population', prof ? prof.population.toLocaleString('en-US') : '—'],
                      ['Households', prof ? prof.households.toLocaleString('en-US') : '—'],
                      ['Literate (5+)', prof?.literacy != null ? `${prof.literacy.toFixed(0)}%` : '—'],
                      ['Seismic risk score', risk ? `${risk.riskScore.toFixed(1)} (national rank ${risk.rank})` : '—'],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', fontSize: '.68rem' }}>
                        <span style={{ flex: 1 }} className="text-secondary">{label}</span>
                        <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{val}</strong>
                      </div>
                    ))}
                  </div>
                  {prof && (
                    <p className="muted" style={{ fontSize: '.58rem', margin: '.45rem 0 0' }}>
                      {prof.units} palika rows summed here, Census {prof.censusYear} — computed, not published. NDRRMA seismic ranking.
                    </p>
                  )}
                </div>
              )
            })()}
            {/* Hydropower register summary */}
            <div className="panel" style={{ padding: '.8rem', margin: 0 }}>
              <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">Hydropower Licensed Capacity</span>
              <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                {(['operation', 'generation', 'survey'] as const).map(k => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.68rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: HYDRO_KIND_COLOR[k], flexShrink: 0 }} />
                    <span style={{ flex: 1 }} className="text-secondary">{HYDRO_KIND_LABEL[k]}</span>
                    <strong style={{ minWidth: 34, textAlign: 'right' }}>{hydroTotals[k].n}</strong>
                    <span className="text-tertiary" style={{ minWidth: 70, textAlign: 'right' }}>{hydroTotals[k].mw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', fontSize: '.68rem', borderTop: '1px solid var(--border-light)', paddingTop: '.35rem', marginTop: '.1rem' }}>
                  <span style={{ flex: 1, fontWeight: 700 }}>Total register</span>
                  <strong style={{ minWidth: 34, textAlign: 'right' }}>{hydroTotals.operation.n + hydroTotals.generation.n + hydroTotals.survey.n}</strong>
                  <span className="text-tertiary" style={{ minWidth: 70, textAlign: 'right' }}>{(hydroTotals.operation.mw + hydroTotals.generation.mw + hydroTotals.survey.mw).toLocaleString(undefined, { maximumFractionDigits: 0 })} MW</span>
                </div>
              </div>
            </div>

            {/* Pinned Projects */}
            <div>
              <p className="eyebrow" style={{ margin: '0 0 .5rem' }}>
                PROJECTS IN SCOPE ({visibleProjects.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
                {visibleProjects.length === 0 && (
                  <p className="muted" style={{ fontSize: '.7rem', padding: '.5rem 0' }}>
                    No tracked projects in this view - try zooming out or clearing district filter.
                  </p>
                )}
                {visibleProjects.map(({ p, district: dd, exact, siteLabel }) => (
                  <Link
                    key={p.name}
                    href={`/projects/${slugify(p.name)}`}
                    className="source-row"
                    style={{ padding: '.55rem .7rem', borderRadius: 10, background: 'var(--bg-sunken)', textDecoration: 'none' }}
                  >
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLOR[p.status] ?? '#0d7c5f', flexShrink: 0, marginTop: 4 }} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <strong style={{ fontSize: '.76rem', display: 'block', color: 'var(--text)' }}>{p.name}</strong>
                      <p style={{ margin: '2px 0 0', fontSize: '.64rem', color: 'var(--text-secondary)' }}>
                        {p.status} · {p.progress}% · {p.budget} · {exact ? `◎ ${siteLabel}` : `≈ ${dd ?? `${p.province} province`}`}
                      </p>
                    </div>
                  </Link>
                ))}
                {nationalProjects.length > 0 && !district && (
                  <p className="muted" style={{ fontSize: '.64rem', marginTop: '.4rem' }}>
                    + {nationalProjects.length} national-scope projects (corridors, rail) listed in tracker, not pinned.
                  </p>
                )}
              </div>
            </div>
          </div>
        </aside>
      )}
    </>
  )
}
