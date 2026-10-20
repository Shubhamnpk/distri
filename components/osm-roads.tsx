'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'

/** The undated `/planet/{z}/{x}/{y}.pbf` alias answers 200 with an empty body, so the
 *  real snapshot URL is read from TileJSON once (fallback kept in case that fails). */
const TILEJSON = 'https://tiles.openfreemap.org/planet'
const TILE_FALLBACK = 'https://tiles.openfreemap.org/planet/20261011_080001_pt/{z}/{x}/{y}.pbf'
const NONE: never[] = []

/** Ring pre-projected to Web-Mercator [0,1] coordinates, so clipping a tile is a
 *  couple of multiply-adds instead of 141k sin/log calls per repaint. */
type PreparedRing = { pts: number[]; minX: number; minY: number; maxX: number; maxY: number }
type Ring = number[][]

const MAX_LAT = 85.0511287798
const tileKey = (c: { z: number; x: number; y: number }) => `${c.z}/${c.x}/${c.y}`

function merc(lng: number, lat: number): [number, number] {
  const la = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat))
  const s = Math.sin((la * Math.PI) / 180)
  return [(lng + 180) / 360, 0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)]
}

/** Polygon rings (outer + holes) of the given GeoJSON FeatureCollection, projected once. */
function prepare(fc: unknown): PreparedRing[] {
  const out: PreparedRing[] = []
  const feats = (fc as { features?: { geometry?: { type?: string; coordinates?: unknown } }[] })?.features ?? []
  for (const f of feats) {
    const g = f?.geometry
    if (!g) continue
    const polys = (g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []) as Ring[][]
    for (const poly of polys ?? []) {
      for (const ring of poly ?? []) {
        if (ring.length < 4) continue
        const pts: number[] = []
        let minX = 1, minY = 1, maxX = 0, maxY = 0
        for (const pt of ring) {
          const [x, y] = merc(pt[0], pt[1])
          pts.push(x, y)
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
        out.push({ pts, minX, minY, maxX, maxY })
      }
    }
  }
  return out
}

const normRef = (ref?: string | null) =>
  ref ? ref.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^NH0*(\d+)$/, 'NH$1') : ''

/** "NH3" and "NH03" are the same road; show it zero-padded like the DoR log. */
function prettyRef(ref: string) {
  const m = ref.toUpperCase().replace(/\s+/g, '').match(/^([A-Z]+)0*(\d+)([A-Z]?)$/)
  return m ? `${m[1]}${m[2].padStart(2, '0')}${m[3]}` : ref.toUpperCase().replace(/[^A-Z0-9-]/g, '')
}

/** Point halfway along a tile-pixel polyline (and its pixel length). */
function midPoint(pts: [number, number][]): { x: number; y: number; len: number } {
  let total = 0
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
  let half = total / 2
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
    if (half <= d) {
      const t = d ? half / d : 0
      return { x: pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, y: pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t, len: total }
    }
    half -= d
  }
  const last = pts[pts.length - 1] ?? [0, 0]
  return { x: last[0], y: last[1], len: total }
}

function insideRings(x: number, y: number, rings: PreparedRing[]) {
  for (const ring of rings) {
    if (x < ring.minX || x > ring.maxX || y < ring.minY || y > ring.maxY) continue
    const p = ring.pts
    let inside = false
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    if (inside) return true
  }
  return false
}

function roadStyle(p: Record<string, unknown>, z: number) {
  const c = String(p?.class ?? '')
  if (c === 'motorway' || c === 'trunk') return { color: '#b45309', weight: z >= 10 ? 3.2 : 2.4, opacity: 0.9 }
  if (c === 'primary') return { color: '#b45309', weight: z >= 10 ? 2.7 : 2, opacity: 0.85 }
  if (c === 'secondary') return { color: '#ca8a04', weight: z >= 10 ? 2.1 : 1.4, opacity: 0.8 }
  if (c === 'tertiary') return { color: '#ca8a04', weight: z >= 10 ? 1.7 : 1, opacity: 0.7 }
  if (c === 'minor' || c === 'street' || c === 'service') {
    return z >= 9 ? { color: '#a8a29e', weight: z >= 12 ? 1.2 : 0.8, opacity: 0.65 } : NONE
  }
  if (c === 'track' || c === 'path') return z >= 11 ? { color: '#c4b5a5', weight: 0.9, opacity: 0.6 } : NONE
  if (c === 'rail') return { color: '#94a3b8', weight: 1, opacity: 0.7, dashArray: '6 4' }
  return z >= 10 ? { color: '#a8a29e', weight: 0.8, opacity: 0.5 } : NONE
}

/** Every road OSM knows, drawn from OpenFreeMap vector tiles. When a blockage is
 *  selected, tile features whose `ref` matches its highway (NH03) are redrawn as a
 *  fat coloured line, so the whole alignment shows up — not just the dot's segment.
 *  `outline` is Nepal's province union: each tile canvas is punched out along the
 *  border so foreign roads wash away while the basemap stays intact. */
export function OsmRoads({ visible, selectedRef, color, outline, onSelectRef }: {
  visible: boolean
  selectedRef: string | null
  color: string
  outline?: unknown
  onSelectRef?: (ref: string, name?: string) => void
}) {
  const map = useMap()
  const layerRef = useRef<any>(null)
  const wantRef = useRef('')
  const colorRef = useRef(color)
  const selectRef = useRef(onSelectRef)
  const [ready, setReady] = useState(false)

  wantRef.current = normRef(selectedRef)
  colorRef.current = color
  selectRef.current = onSelectRef
  const rings = useMemo(() => prepare(outline), [outline])
  const ringsRef = useRef<PreparedRing[]>([])
  ringsRef.current = rings
  /** ref features seen per tile, captured from the symbolizers the renderer creates. */
  const tileRefs = useRef(new Map<string, { ref: string; name?: string; pts: [number, number][]; len: number }[]>())
  const labelsRef = useRef<L.LayerGroup | null>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    let dead = false
    ;(async () => {
      const g = globalThis as any
      g.L = g.L ?? L
      await import('leaflet.vectorgrid/src/Leaflet.VectorGrid.js')
      await import('leaflet.vectorgrid/src/Leaflet.Renderer.Canvas.Tile.js')
      await import('leaflet.vectorgrid/src/Leaflet.VectorGrid.Protobuf.js')
      if (dead) return
      const vg = (L as any).vectorGrid
      if (!vg?.protobuf) return
      let url = TILE_FALLBACK
      try {
        const meta = await fetch(TILEJSON).then(r => r.json())
        if (typeof meta?.tiles?.[0] === 'string') url = meta.tiles[0]
      } catch { /* keep the known snapshot */ }
      if (dead) return
      const styles: Record<string, unknown> = {}
      for (const name of ['aerodrome_label', 'aeroway', 'boundary', 'building', 'housenumber', 'landcover', 'landuse', 'mountain_peak', 'park', 'place', 'poi', 'toll', 'transportation_name', 'water', 'water_name', 'waterway']) {
        styles[name] = () => NONE
      }
      styles.transportation = roadStyle as unknown as object
      styles.transportation_name = (p: Record<string, unknown>) => {
        const want = wantRef.current
        const ref = normRef(p?.ref as string | undefined)
        if (want && ref && ref === want) {
          return [
            { color: '#ffffff', weight: 7.5, opacity: 0.9 },
            { color: colorRef.current, weight: 4.5, opacity: 1 },
          ]
        }
        // Still build the invisible symbolizer: the renderer factory below reads its
        // geometry to place the ref chip. Returning NONE would skip it entirely.
        return { weight: 0, opacity: 0 }
      }
      const factory = (coords: any, tileSize: any, opts: any) => {
        const r = (L as any).canvas.tile(coords, tileSize, opts)
        const key = tileKey(coords)
        const init = r._initPath?.bind(r)
        r._initPath = (layer: any) => {
          const ref = layer?.properties?.ref
          const name = layer?.properties?.name
          const parts: { x: number; y: number }[][] = layer?._parts ?? []
          if (ref && parts.length) {
            let longest: { x: number; y: number }[] = parts[0]
            let best = 0
            for (const part of parts) {
              let len = 0
              for (let i = 1; i < part.length; i++) len += Math.hypot(part[i].x - part[i - 1].x, part[i].y - part[i - 1].y)
              if (len > best) { best = len; longest = part }
            }
            if (longest.length > 1) {
              const pts = longest.map(p => [p.x, p.y] as [number, number])
              const list = tileRefs.current.get(key) ?? []
              list.push({ ref: String(ref), name: typeof name === 'string' ? name : undefined, pts, len: best })
              tileRefs.current.set(key, list)
            }
          }
          return init?.(layer)
        }
        return r
      }
      layerRef.current = vg.protobuf(url, {
        pane: 'shapes',
        interactive: false,
        maxNativeZoom: 14,
        maxZoom: 18,
        keepBuffer: 3,
        updateWhenZooming: false,
        rendererFactory: factory,
        vectorTileLayerStyles: styles,
      })
      setReady(true)
    })()
    return () => {
      dead = true
      const l = layerRef.current
      if (l && map.hasLayer(l)) map.removeLayer(l)
      layerRef.current = null
    }
  }, [map])

  useEffect(() => {
    const l = layerRef.current
    if (!ready || !l) return
    if (visible) {
      if (!map.hasLayer(l)) l.addTo(map)
    } else if (map.hasLayer(l)) {
      map.removeLayer(l)
    }
  }, [map, visible, ready])

  useEffect(() => {
    const l = layerRef.current
    if (ready && l) l.redraw()
  }, [selectedRef, color, ready])

  /** Erase everything outside the Nepal union from one tile canvas. Geometry is
   *  pre-projected and decimated by zoom, and only the intersecting rings are drawn,
   *  so this stays cheap enough to run per tile load. */
  const clipTile = (canvas: HTMLCanvasElement, coords: any) => {
    const rings = ringsRef.current
    if (!canvas?.width || !rings.length || coords == null) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const n = 2 ** coords.z
    const span = canvas.width
    const stride = coords.z < 9 ? 4 : coords.z < 11 ? 2 : 1
    const west = coords.x / n
    const east = (coords.x + 1) / n
    const north = coords.y / n
    const south = (coords.y + 1) / n
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    for (const ring of rings) {
      if (ring.maxX < west || ring.minX > east || ring.maxY < north || ring.minY > south) continue
      const pts = ring.pts
      ctx.moveTo((pts[0] - west) * n * span, (pts[1] - north) * n * span)
      for (let i = 2; i < pts.length; i += 2 * stride) {
        ctx.lineTo((pts[i] - west) * n * span, (pts[i + 1] - north) * n * span)
      }
      ctx.closePath()
    }
    ctx.fill('evenodd')
    ctx.restore()
  }

  const clipAll = () => {
    const l = layerRef.current
    if (!l) return
    const tiles = l._tiles ?? {}
    for (const k in tiles) {
      const t = tiles[k]
      if (t?.el) clipTile(t.el, t.coords)
    }
  }

  /** One ref chip per highway, placed halfway along its longest visible segment and
   *  only inside Nepal (the clipped line layer must not be labelled abroad). */
  const rebuildLabels = () => {
    const group = labelsRef.current
    const l = layerRef.current
    if (!group) return
    group.clearLayers()
    if (!l || !visible || !map.hasLayer(l)) return
    const tiles = l._tiles ?? {}
    const size = l.getTileSize().x
    const best = new Map<string, { ref: string; name?: string; lng: number; lat: number; len: number }>()
    for (const k in tiles) {
      const t = tiles[k]
      if (!t?.coords) continue
      const feats = tileRefs.current.get(tileKey(t.coords))
      if (!feats) continue
      const { x, y, z } = t.coords
      const n = 2 ** z
      for (const f of feats) {
        const mid = midPoint(f.pts)
        const nx = (x + mid.x / size) / n
        const ny = (y + mid.y / size) / n
        if (!insideRings(nx, ny, ringsRef.current)) continue
        const ref = prettyRef(f.ref)
        if (!ref) continue
        const cur = best.get(ref)
        if (!cur || cur.len < f.len) {
          best.set(ref, { ref, name: f.name ?? cur?.name, lng: nx * 360 - 180, lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * ny))) * 180) / Math.PI, len: f.len })
        } else if (!cur.name && f.name) {
          cur.name = f.name
        }
      }
    }
    const picks = [...best.values()].sort((a, b) => b.len - a.len).slice(0, 28)
    for (const p of picks) {
      const html = `<span style="position:absolute;transform:translate(-50%,-50%);pointer-events:auto;cursor:pointer;background:rgba(255,255,255,.92);border:1px solid #b45309;color:#7c2d12;font:700 9px/1.3 system-ui,sans-serif;padding:1px 4px;border-radius:3px;white-space:nowrap;box-shadow:0 1px 2px rgba(0,0,0,.18)">${p.ref}</span>`
      const m = L.marker([p.lat, p.lng], {
        pane: 'roadlabels',
        interactive: true,
        keyboard: false,
        title: `${p.ref} · click for highway details`,
        icon: L.divIcon({ className: 'atlas-road-label', html, iconSize: [0, 0] }),
      })
      m.on('click', () => selectRef.current?.(p.ref, p.name))
      m.bindTooltip(`${p.ref} · click for highway details`, { direction: 'top', offset: [0, -4], opacity: 1 })
      m.addTo(group)
    }
  }

  const scheduleLabels = () => {
    if (timerRef.current != null) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => { timerRef.current = null; rebuildLabels() }, 180)
  }

  useEffect(() => {
    const l = layerRef.current
    if (!ready || !l) return
    if (!map.getPane('roadlabels')) {
      const pane = map.createPane('roadlabels')
      pane.style.zIndex = '405'
      pane.style.pointerEvents = 'none'
    }
    labelsRef.current = L.layerGroup().addTo(map)
    const onTile = (e: any) => {
      const t = l._tiles[l._tileCoordsToKey(e.coords)]
      if (t?.el) clipTile(t.el, t.coords)
      scheduleLabels()
    }
    const onUnload = (e: any) => { tileRefs.current.delete(tileKey(e.coords)); scheduleLabels() }
    const onZoom = () => { clipAll(); scheduleLabels() }
    const onLoad = () => { clipAll(); scheduleLabels() }
    clipAll()
    scheduleLabels()
    l.on('tileload', onTile)
    l.on('tileunload', onUnload)
    l.on('load', onLoad)
    map.on('zoomend', onZoom)
    return () => {
      l.off('tileload', onTile)
      l.off('tileunload', onUnload)
      l.off('load', onLoad)
      map.off('zoomend', onZoom)
      if (timerRef.current != null) window.clearTimeout(timerRef.current)
      labelsRef.current?.remove()
      labelsRef.current = null
    }
  }, [map, ready])

  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => { clipAll(); rebuildLabels() }, 250)
    return () => window.clearTimeout(t)
  }, [ready, visible, selectedRef, color, rings])

  return null
}
