'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, PersonStanding, RotateCcw, Send } from 'lucide-react'
import type { ErrorEvent, Map as MapLibreMap, MapLayerMouseEvent, MapMouseEvent, GeoJSONSource, Marker } from 'maplibre-gl'

type Geometry = { type: string; coordinates: any }
type FeatureCollection = { type: 'FeatureCollection'; features: Atlas3DFeature[] }

export type Atlas3DFeature = {
  type: 'Feature'
  id?: string | number
  geometry: Geometry | null
  properties: Record<string, string | number | boolean | null>
}

type Props = {
  basemap: 'osm' | 'terrain' | 'topo' | 'satellite'
  center: { lat: number; lng: number }
  zoom: number
  bounds: [[number, number], [number, number]] | null
  boundaries: Atlas3DFeature[]
  adminLabels: Atlas3DFeature[]
  points: Atlas3DFeature[]
  roadsVisible: boolean
  onSelect: (kind: string, id: string) => void
  onMove: (lat: number, lng: number, zoom: number) => void
  onReady: (map: MapLibreMap | null) => void
  onFallback: () => void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

// MapLibre v6 needs a real WebGL2 context — test one offscreen canvas first so a
// blocked GPU shows the guidance panel instead of a broken map.
function hasWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2'))
  } catch {
    return false
  }
}

function rasterTiles(basemap: Props['basemap']): { tiles: string[]; attribution: string; maxzoom: number } {
  if (basemap === 'satellite') return {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    // Use z18 imagery as the highest native level and overzoom it beyond that.
    attribution: 'Tiles &copy; Esri, Maxar', maxzoom: 18,
  }
  if (basemap === 'topo') return {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Tiles &copy; Esri', maxzoom: 19,
  }
  if (basemap === 'terrain') return {
    tiles: ['https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png'.replace('{s}', 'a')],
    attribution: 'Map data &copy; OpenStreetMap contributors, SRTM | Style &copy; OpenTopoMap (CC-BY-SA)', maxzoom: 17,
  }
  return {
    tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', maxzoom: 19,
  }
}

function offsetLngLat(lng: number, lat: number, bearing: number, distanceMeters: number): [number, number] {
  const angle = bearing * Math.PI / 180
  const latOffset = Math.cos(angle) * distanceMeters / 111_320
  const lonOffset = Math.sin(angle) * distanceMeters / (111_320 * Math.max(0.15, Math.cos(lat * Math.PI / 180)))
  return [lng + lonOffset, lat + latOffset]
}

// Two-tone compass dial: red north needle, slate south needle, tick ring.
// The needle rotates opposite to the camera bearing, the casing stays fixed.
function CompassDial({ size, bearing }: { size: number; bearing: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-12 -12 24 24"
      role="presentation"
      aria-hidden="true"
      style={{ transform: `rotate(${-bearing}deg)`, filter: 'drop-shadow(0 1px 1.5px rgba(15, 23, 42, .35))' }}
    >
      <circle r="10.4" fill="none" stroke="currentColor" strokeOpacity=".42" strokeWidth="1.2" />
      <circle r="8.1" fill="none" stroke="currentColor" strokeOpacity=".15" strokeWidth=".8" />
      {[0, 90, 180, 270].map(angle => (
        <rect key={angle} x="-.65" y="-11" width="1.3" height="2.8" rx=".65" fill="currentColor" opacity=".62" transform={`rotate(${angle})`} />
      ))}
      <polygon points="0,-8.7 1.9,0 0,-1.5 -1.9,0" fill="#ef4444" />
      <polygon points="0,8.7 1.9,0 0,1.5 -1.9,0" fill="#94a3b8" />
      <circle r="1.35" fill="#fff" stroke="rgba(15,23,42,.4)" strokeWidth=".55" />
    </svg>
  )
}

export function NationalMap3D({ basemap, center, zoom, bounds, boundaries, adminLabels, points, roadsVisible, onSelect, onMove, onReady, onFallback }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [initError, setInitError] = useState<'webgl2' | 'load' | null>(null)
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [camera, setCamera] = useState({ pitch: 0, bearing: 0 })
  const [cameraView, setCameraView] = useState<'free' | 'ground' | 'drone'>('free')
  const [gestureHint, setGestureHint] = useState(false)
  const [gestureMode, setGestureMode] = useState<'idle' | 'orbit' | 'tilt'>('idle')
  const [anchor, setAnchor] = useState<{ lng: number; lat: number } | null>(null)
  const anchorRef = useRef<{ lng: number; lat: number } | null>(null)
  const anchorMarkerRef = useRef<Marker | null>(null)
  const onSelectRef = useRef(onSelect)
  const onMoveRef = useRef(onMove)
  onSelectRef.current = onSelect
  onMoveRef.current = onMove
  const boundariesRef = useRef(boundaries)
  const adminLabelsRef = useRef(adminLabels)
  const pointsRef = useRef(points)
  const basemapRef = useRef(basemap)
  const roadsRef = useRef(roadsVisible)
  boundariesRef.current = boundaries
  adminLabelsRef.current = adminLabels
  pointsRef.current = points
  basemapRef.current = basemap
  roadsRef.current = roadsVisible

  useEffect(() => {
    if (!hasWebGL2()) {
      setInitError('webgl2')
      setLoading(false)
      return
    }
    let alive = true
    let cleanup: (() => void) | undefined
    let cameraFrame: number | null = null
    void import('maplibre-gl').then(maplibregl => {
      if (!alive || !containerRef.current) return
      maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString())
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: { version: 8, sources: {}, layers: [] },
        center: [center.lng, center.lat],
        zoom,
        pitch: 0,
        bearing: 0,
        minZoom: 0,
        maxZoom: 22,
        maxPitch: 85,
        dragRotate: { around: 'center', movement: 'circular' },
        pitchWithRotate: true,
        attributionControl: false,
        renderWorldCopies: false,
        canvasContextAttributes: { antialias: true },
        fadeDuration: 0,
      })
      mapRef.current = map
      onReady(map)

      const installLayers = () => {
        if (!alive || !map.isStyleLoaded()) return
        map.setProjection({ type: 'globe' })
        map.setSky({
          'sky-color': '#78bdf4',
          'sky-horizon-blend': 0.34,
          'horizon-color': '#d7eaff',
          'horizon-fog-blend': 0.72,
          'fog-color': '#d7eaff',
          'fog-ground-blend': 0.28,
          'atmosphere-blend': 1,
        })
        if (!map.getSource('atlas-dem')) {
          // 2D/3D merged: DEM exists but terrain casts no relief until the user tilts.
          // No terrain set and no DEM tiles while flat — cheaper and Google-Maps-like.
          map.addSource('atlas-dem', { type: 'raster-dem', tiles: [DEM], tileSize: 256, encoding: 'terrarium', maxzoom: 15, attribution: 'Terrain tiles by Mapzen, hosted by AWS Open Data' })
          map.addLayer({ id: 'atlas-hillshade', type: 'hillshade', source: 'atlas-dem', layout: { visibility: 'none' }, paint: { 'hillshade-exaggeration': 0.28, 'hillshade-shadow-color': '#263447', 'hillshade-highlight-color': '#fff8e8', 'hillshade-illumination-direction': 320 } })
        }
        const raster = rasterTiles(basemapRef.current)
        if (!map.getSource('atlas-base')) {
          map.addSource('atlas-base', { type: 'raster', tiles: raster.tiles, tileSize: 256, maxzoom: raster.maxzoom, attribution: raster.attribution })
          map.addLayer({ id: 'atlas-base-layer', type: 'raster', source: 'atlas-base' }, 'atlas-hillshade')
        }
        if (!map.getSource('atlas-boundaries')) map.addSource('atlas-boundaries', { type: 'geojson', data: { type: 'FeatureCollection', features: boundariesRef.current as never[] }, promoteId: 'id' })
        if (!map.getSource('atlas-admin-labels')) map.addSource('atlas-admin-labels', { type: 'geojson', data: { type: 'FeatureCollection', features: adminLabelsRef.current as never[] } })
        if (!map.getSource('atlas-points')) map.addSource('atlas-points', { type: 'geojson', data: { type: 'FeatureCollection', features: pointsRef.current as never[] }, promoteId: 'id', cluster: true, clusterRadius: 42, clusterMaxZoom: 11 })
        if (!map.getLayer('atlas-region-fill')) map.addLayer({ id: 'atlas-region-fill', type: 'fill', source: 'atlas-boundaries', filter: ['==', ['get', 'kind'], 'province'], paint: { 'fill-color': ['coalesce', ['get', 'color'], '#1c9b78'], 'fill-opacity': 0.09 } })
        if (!map.getLayer('atlas-region-line')) map.addLayer({ id: 'atlas-region-line', type: 'line', source: 'atlas-boundaries', paint: { 'line-color': ['coalesce', ['get', 'color'], '#0f766e'], 'line-width': ['case', ['==', ['get', 'selected'], true], 3, ['==', ['get', 'kind'], 'district'], 0.9, 1.1], 'line-opacity': ['case', ['==', ['get', 'kind'], 'district'], 0.72, 0.9] } })
        if (!map.getSource('atlas-road-tiles')) map.addSource('atlas-road-tiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: 'OpenFreeMap · © OpenStreetMap contributors' })
        if (!map.getLayer('atlas-road-lines')) map.addLayer({ id: 'atlas-road-lines', type: 'line', source: 'atlas-road-tiles', 'source-layer': 'transportation', minzoom: 6, layout: { visibility: roadsRef.current ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], '#b45309', ['secondary', 'tertiary'], '#ca8a04', '#a8a29e'], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.3, 14, 2.5], 'line-opacity': 0.78 } })
        if (!map.getLayer('atlas-clusters')) map.addLayer({ id: 'atlas-clusters', type: 'circle', source: 'atlas-points', filter: ['has', 'point_count'], paint: { 'circle-color': '#0d7c5f', 'circle-opacity': 0.9, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 15, 20, 19, 100, 23, 500, 28] } })
        if (!map.getLayer('atlas-cluster-count')) map.addLayer({ id: 'atlas-cluster-count', type: 'symbol', source: 'atlas-points', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } })
        if (!map.getLayer('atlas-points-layer')) map.addLayer({ id: 'atlas-points-layer', type: 'circle', source: 'atlas-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['coalesce', ['get', 'color'], '#2563eb'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['coalesce', ['get', 'size'], 4], 12, ['+', ['coalesce', ['get', 'size'], 4], 2]], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5, 'circle-opacity': 0.94 } })
        if (!map.getLayer('atlas-labels')) map.addLayer({ id: 'atlas-labels', type: 'symbol', source: 'atlas-points', filter: ['!', ['has', 'point_count']], minzoom: 9, layout: { 'text-field': ['coalesce', ['get', 'label'], ''], 'text-size': 10, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': false }, paint: { 'text-color': '#17212b', 'text-halo-color': '#fff', 'text-halo-width': 1.4 } })
        if (!map.getLayer('atlas-admin-labels')) map.addLayer({ id: 'atlas-admin-labels', type: 'symbol', source: 'atlas-admin-labels', minzoom: 6, layout: { 'text-field': ['get', 'itemId'], 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 9, 9, 11, 13, 13], 'text-font': ['Arial'], 'text-anchor': 'center', 'text-allow-overlap': false, 'text-ignore-placement': false, 'text-padding': 4, 'symbol-sort-key': ['case', ['==', ['get', 'selected'], true], 0, 1] }, paint: { 'text-color': ['case', ['==', ['get', 'selected'], true], '#075e49', '#183748'], 'text-halo-color': '#fff', 'text-halo-width': 2, 'text-halo-blur': 0.4 } })
        map.on('click', 'atlas-clusters', event => {
          const cluster = event.features?.[0]
          const clusterId = Number(cluster?.properties?.cluster_id)
          const source = map.getSource('atlas-points') as GeoJSONSource
          source.getClusterExpansionZoom(clusterId).then(nextZoom => {
            const coords = (cluster?.geometry as { coordinates?: [number, number] } | undefined)?.coordinates
            if (coords) map.easeTo({ center: coords, zoom: nextZoom, duration: 450 })
          }).catch(() => {})
        })
        map.on('click', 'atlas-points-layer', (event: MapLayerMouseEvent) => {
          const f = event.features?.[0]
          const kind = String(f?.properties?.kind ?? '')
          const id = String(f?.properties?.itemId ?? '')
          if (kind === 'capital' && id.startsWith('district-')) event.preventDefault()
          if (kind && id) onSelectRef.current(kind, id)
          const label = String(f?.properties?.label ?? '')
          if (label) new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' }).setLngLat(event.lngLat).setText(label).addTo(map)
        })
        map.on('click', 'atlas-region-line', (event: MapLayerMouseEvent) => {
          event.preventDefault()
          const feature = event.features?.[0]
          const kind = String(feature?.properties?.kind ?? '')
          const id = String(feature?.properties?.itemId ?? '')
          if (kind && id) onSelectRef.current(kind, id)
        })
        map.on('click', 'atlas-admin-labels', (event: MapLayerMouseEvent) => {
          event.preventDefault()
          const feature = event.features?.[0]
          const kind = String(feature?.properties?.kind ?? '')
          const id = String(feature?.properties?.itemId ?? '')
          if (kind && id) onSelectRef.current(kind, id)
        })
        map.on('mouseenter', 'atlas-admin-labels', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'atlas-admin-labels', () => { map.getCanvas().style.cursor = '' })
        map.on('mouseenter', 'atlas-points-layer', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'atlas-points-layer', () => { map.getCanvas().style.cursor = '' })
        applyTiltedTerrain()
        map.resize()
      }
      const onStyle = () => installLayers()
      map.on('style.load', onStyle)
      // Tilt is the 2D↔3D switch: flat (pitch 0) means no terrain — the globe
      // stays cartographic like Google Maps; any meaningful tilt brings the
      // elevation surface and relief shading in.
      const applyTiltedTerrain = () => {
        const tilted = map.getPitch() >= 15
        if (tilted && !map.getTerrain()) map.setTerrain({ source: 'atlas-dem', exaggeration: 1.25 })
        if (!tilted && map.getTerrain()) map.setTerrain(null)
        if (map.getLayer('atlas-hillshade')) map.setLayoutProperty('atlas-hillshade', 'visibility', tilted ? 'visible' : 'none')
      }
      map.on('pitch', applyTiltedTerrain)
      const handleAnchorClick = (event: MapMouseEvent) => {
        if (event.defaultPrevented) return
        const target = event.originalEvent.target
        if (target instanceof HTMLElement && target.closest('.maplibregl-marker')) return
        // Any map surface can be pinned, including a place marker or cluster.
        const nextAnchor = { lng: event.lngLat.lng, lat: event.lngLat.lat }
        anchorRef.current = nextAnchor
        setCameraView('free')
        setAnchor(nextAnchor)
        anchorMarkerRef.current?.remove()
        anchorMarkerRef.current = new maplibregl.Marker({ color: '#f59e0b', scale: 0.85, pitchAlignment: 'viewport' })
          .setLngLat([nextAnchor.lng, nextAnchor.lat])
          .setPopup(new maplibregl.Popup({ offset: 22, closeButton: false }).setText('Orbit anchor'))
          .addTo(map)
        map.easeTo({ center: [nextAnchor.lng, nextAnchor.lat], zoom: Math.min(18, Math.max(15, map.getZoom() + 1)), pitch: Math.max(70, map.getPitch()), duration: 700 })
      }
      map.on('click', handleAnchorClick)
      const canvas = map.getCanvas()
      // Google-Earth-style gestures: right-drag / Ctrl-drag orbit (native
      // dragRotate), Shift+drag tilts (drag down = toward the horizon), two-finger
      // pinch-rotate + tilt. Shift-drag is intercepted on the container's capture
      // phase so pan and box zoom never start under the synthetic drag.
      map.boxZoom.disable()
      let shiftDrag: { y: number; pitch: number } | null = null
      const onGestureDown = (event: MouseEvent) => {
        if (event.shiftKey && event.button === 0) {
          if (map.isMoving()) return
          event.stopPropagation()
          event.preventDefault()
          shiftDrag = { y: event.clientY, pitch: map.getPitch() }
          canvas.style.cursor = 'ns-resize'
          setGestureMode('tilt')
          setGestureHint(false)
          return
        }
        // Right-drag / Ctrl-drag go to native dragRotate; only light the reticle up.
        if (event.button === 2 || event.ctrlKey) setGestureMode('orbit')
      }
      const onShiftMove = (event: MouseEvent) => {
        if (!shiftDrag) return
        event.preventDefault()
        // Vertical drag distance → pitch: 0.3°/pixel keeps a full 85° sweep comfortable.
        const delta = (event.clientY - shiftDrag.y) * 0.3
        map.jumpTo({ pitch: Math.min(85, Math.max(0, shiftDrag.pitch + delta)) })
      }
      const onGestureUp = () => {
        if (shiftDrag) {
          shiftDrag = null
          canvas.style.cursor = ''
        }
        setGestureMode('idle')
      }
      containerRef.current?.addEventListener('mousedown', onGestureDown, true)
      window.addEventListener('mousemove', onShiftMove)
      window.addEventListener('mouseup', onGestureUp)
      // One-time gesture hint chip, dismissed on the first orbit or tilt gesture.
      const dismissHint = () => setGestureHint(false)
      map.once('rotatestart', dismissHint)
      map.once('pitchstart', dismissHint)
      setGestureHint(true)
      const hintTimer = window.setTimeout(dismissHint, 9000)
      const handleMove = () => {
        const c = map.getCenter()
        onMoveRef.current(c.lat, c.lng, map.getZoom())
      }
      map.on('moveend', handleMove)
      const syncCamera = () => setCamera(current => {
        const pitch = Math.round(map.getPitch())
        let bearing = Math.round(map.getBearing())
        // Count past ±360 during long spins instead of snapping 359→0 mid-gesture.
        while (Math.abs(bearing - current.bearing) > 180) {
          bearing += bearing > current.bearing ? -360 : 360
        }
        return { pitch, bearing }
      })
      map.on('moveend', syncCamera)
      // Compass and sliders follow drags live, not just on moveend.
      const syncCameraLive = () => {
        if (cameraFrame !== null) return
        cameraFrame = window.requestAnimationFrame(() => {
          cameraFrame = null
          if (!alive) return
          syncCamera()
        })
      }
      map.on('rotate', syncCameraLive)
      map.on('pitch', syncCameraLive)
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
      map.scrollZoom.setWheelZoomRate(1 / 420)
      map.on('error', (event: ErrorEvent) => {
        console.warn('3D map resource error:', event.error.message)
      })
      const finishLoading = () => setLoading(false)
      map.once('idle', finishLoading)
      const loadingTimeout = window.setTimeout(finishLoading, 7000)
      cleanup = () => {
        window.clearTimeout(loadingTimeout)
        window.clearTimeout(hintTimer)
        if (cameraFrame !== null) window.cancelAnimationFrame(cameraFrame)
        anchorMarkerRef.current?.remove(); anchorMarkerRef.current = null
        containerRef.current?.removeEventListener('mousedown', onGestureDown, true)
        window.removeEventListener('mousemove', onShiftMove)
        window.removeEventListener('mouseup', onGestureUp)
        map.off('style.load', onStyle)
        map.off('click', handleAnchorClick)
        map.off('moveend', handleMove)
        map.off('moveend', syncCamera)
        map.off('rotate', syncCameraLive)
        map.off('pitch', syncCameraLive)
        map.off('pitch', applyTiltedTerrain)
        map.remove()
      }
    }).catch(error => {
      console.error('Unable to load 3D map renderer', error)
      setInitError('load')
    })
    return () => {
      alive = false
      cleanup?.()
      mapRef.current = null
      onReady(null)
    }
  // Each retry remounts the renderer; everything else stays per-view.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const raster = rasterTiles(basemap)
    if (map.isStyleLoaded() && map.getSource('atlas-base')) {
      map.removeLayer('atlas-base-layer')
      map.removeSource('atlas-base')
      map.addSource('atlas-base', { type: 'raster', tiles: raster.tiles, tileSize: 256, maxzoom: raster.maxzoom, attribution: raster.attribution })
      map.addLayer({ id: 'atlas-base-layer', type: 'raster', source: 'atlas-base' }, map.getLayer('atlas-hillshade') ? 'atlas-hillshade' : undefined)
    }
  }, [basemap])

  useEffect(() => {
    const map = mapRef.current
    if (map?.getLayer('atlas-road-lines')) map.setLayoutProperty('atlas-road-lines', 'visibility', roadsVisible ? 'visible' : 'none')
  }, [roadsVisible])

  useEffect(() => {
    const source = mapRef.current?.getSource('atlas-boundaries') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: boundaries as never[] })
  }, [boundaries])

  useEffect(() => {
    const source = mapRef.current?.getSource('atlas-admin-labels') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: adminLabels as never[] })
  }, [adminLabels])

  useEffect(() => {
    const source = mapRef.current?.getSource('atlas-points') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: points as never[] })
  }, [points])

  useEffect(() => {
    if (!bounds || !mapRef.current) return
    mapRef.current.fitBounds([[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]], { padding: 70, maxZoom: 12, duration: 900 })
  }, [bounds])

  // jumpTo keeps the slider in exact sync with the camera; easing per tick
  // rubber-bands. With an anchor, the camera centers on it: tilt pivots there.
  const applyPitch = (pitch: number) => {
    setCamera(current => ({ ...current, pitch }))
    const map = mapRef.current
    if (!map) return
    const target = anchorRef.current
    map.jumpTo({ pitch, ...(target ? { center: [target.lng, target.lat] as [number, number] } : {}) })
  }

  // Pin 360° to the slider's right end; MapLibre wraps the camera bearing to 0.
  const applyRotation = (bearing: number) => {
    setCamera(current => ({ ...current, bearing: bearing % 360 === 0 ? 360 : bearing }))
    const map = mapRef.current
    if (!map) return
    const target = anchorRef.current
    map.jumpTo({ bearing: bearing % 360 === 0 ? 0 : bearing, ...(target ? { center: [target.lng, target.lat] as [number, number] } : {}) })
  }

  // Ease back to north along the shortest arc so the compass needle glides home.
  const resetNorth = () => {
    const map = mapRef.current
    const target = anchorRef.current
    setCamera(current => ({ ...current, bearing: 0 }))
    map?.easeTo({ bearing: 0, ...(target ? { center: [target.lng, target.lat] as [number, number] } : {}), duration: 650 })
  }

  /** Camera placed relative to the anchor and riding the terrain surface:
   *  a low eye altitude gives a ground (street) view, a high one a drone view. */
  const anchorCamera = (map: MapLibreMap, target: { lng: number; lat: number }, altitudeAboveGround: number, pitch: number) => {
    const bearing = map.getBearing()
    const distanceBehindAnchor = altitudeAboveGround / Math.tan(Math.max(4, 90 - pitch) * Math.PI / 180)
    const cameraPosition = offsetLngLat(target.lng, target.lat, bearing + 180, distanceBehindAnchor)
    const groundElevation = map.queryTerrainElevation(cameraPosition) ?? map.queryTerrainElevation([target.lng, target.lat]) ?? 0
    return map.calculateCameraOptionsFromCameraLngLatAltRotation(
      cameraPosition,
      groundElevation + altitudeAboveGround,
      bearing,
      pitch,
    )
  }

  // Stand next to the pinned point: camera ~1.8 m off the ground at eye height.
  const enterGroundView = () => {
    const map = mapRef.current
    const target = anchorRef.current
    if (!map || !target) return
    const camera = anchorCamera(map, target, 1.8, 78)
    setCameraView('ground')
    map.easeTo({ ...camera, duration: 1400, essential: true })
  }

  // Hover above the pinned point like a drone: ~170 m up, pitched down 66°.
  const enterDroneView = () => {
    const map = mapRef.current
    const target = anchorRef.current
    if (!map || !target) return
    const camera = anchorCamera(map, target, 170, 66)
    setCameraView('drone')
    map.easeTo({ ...camera, duration: 1400, essential: true })
  }

  const exitView = () => {
    const map = mapRef.current
    const target = anchorRef.current
    setCameraView('free')
    if (!map) return
    map.easeTo({
      ...(target ? { center: [target.lng, target.lat] as [number, number] } : {}),
      zoom: 17,
      pitch: 70,
      duration: 1100,
      essential: true,
    })
  }

  const clearAnchor = () => {
    anchorMarkerRef.current?.remove()
    anchorMarkerRef.current = null
    anchorRef.current = null
    setAnchor(null)
    setCameraView('free')
  }

  return (
    <div ref={containerRef} className="atlas-maplibre" data-ground-view={cameraView} aria-label="Interactive 3D terrain map of Nepal">
      <div className="atlas-camera-controls">
        <div className="atlas-camera-toolbar">
          <button className="atlas-camera-trigger" type="button" aria-expanded={cameraOpen} onClick={() => setCameraOpen(open => !open)}>
            <CompassDial size={17} bearing={camera.bearing} /><span>{cameraView === 'ground' ? 'Ground view' : cameraView === 'drone' ? 'Drone view' : 'Camera'}</span><small>{camera.pitch}° tilt · {((camera.bearing % 360) + 360) % 360}°</small><ChevronDown size={13} className={cameraOpen ? 'is-open' : ''} />
          </button>
          <button className="atlas-compass-button" type="button" title="Face north" aria-label="Reset compass to north" onClick={resetNorth}>
            <CompassDial size={21} bearing={camera.bearing} /><span>N</span>
          </button>
        </div>
        {cameraOpen && <div className="atlas-camera-panel">
          {anchor && <div className="atlas-view-modes" role="group" aria-label="Pin point camera views">
            <button className={`atlas-ground-view-button${cameraView === 'ground' ? ' is-on' : ''}`} type="button" aria-pressed={cameraView === 'ground'} onClick={cameraView === 'ground' ? exitView : enterGroundView}>
              <PersonStanding size={15} />{cameraView === 'ground' ? 'Exit ground' : 'Ground view'}
            </button>
            <button className={`atlas-ground-view-button${cameraView === 'drone' ? ' is-on' : ''}`} type="button" aria-pressed={cameraView === 'drone'} onClick={cameraView === 'drone' ? exitView : enterDroneView}>
              <Send size={15} />{cameraView === 'drone' ? 'Exit drone' : 'Drone view'}
            </button>
          </div>}
          <label><span>Tilt <b>{camera.pitch}°</b></span><input aria-label="Map tilt" type="range" min="0" max="85" step="1" value={camera.pitch} onChange={event => applyPitch(Number(event.currentTarget.value))} /></label>
          <div className="atlas-camera-presets" aria-label="Tilt presets">
            {[['Flat', 0], ['Low', 45], ['Ground', 70], ['Horizon', 85]].map(([label, pitch]) => <button key={label} type="button" aria-pressed={camera.pitch === pitch} onClick={() => applyPitch(Number(pitch))}>{label}</button>)}
          </div>
          <label><span>360° rotation <b>{camera.bearing}°</b></span><input aria-label="Map rotation" type="range" min="0" max="360" step="1" value={camera.bearing} onChange={event => applyRotation(Number(event.currentTarget.value))} /></label>
          <div className="atlas-camera-actions">
            <button className="atlas-camera-reset" type="button" onClick={() => { setCameraView('free'); setCamera({ pitch: 70, bearing: 0 }); mapRef.current?.easeTo({ ...(anchor ? { center: [anchor.lng, anchor.lat] as [number, number], zoom: 17 } : {}), pitch: 70, bearing: 0, duration: 450 }) }}><RotateCcw size={13} /> Reset view</button>
            {anchor && <button className="atlas-camera-reset" type="button" onClick={clearAnchor}>Clear anchor</button>}
          </div>
          {anchor ? <small>Orbit anchored at {anchor.lat.toFixed(4)}°, {anchor.lng.toFixed(4)}°. Right-drag, Ctrl-drag or two fingers orbit · Shift-drag tilts. Ground and Drone pin the camera next to / over the point; click elsewhere to move it.</small> : <small>Click a place to pin it. Right-drag, Ctrl-drag or two fingers orbit · Shift-drag tilts.</small>}
        </div>}
      </div>
      {gestureMode !== 'idle' && !initError && <div className="atlas-orbit-ring" aria-hidden="true" />}
      {gestureHint && !initError && <div className="atlas-gesture-hint" role="status"><b>Right-drag</b> or <b>Ctrl</b>+drag to orbit · <b>Shift</b>+drag to tilt · two fingers also work</div>}
      {loading && !initError && <div className="atlas-terrain-loading"><span className="atlas-terrain-spinner" /><span><strong>Loading terrain</strong><small>Preparing elevation and imagery…</small></span></div>}
      {initError && <div className="atlas-3d-fallback">
        <strong>{initError === 'webgl2' ? '3D view needs WebGL2' : '3D renderer failed to load'}</strong>
        <span>Same engine Google Earth uses — your browser couldn't create a WebGL2 context. Usually that means hardware acceleration is off. In Chrome or Edge: Settings → System → turn on “Use hardware acceleration”, then reload. Still stuck? Update your graphics driver or try another browser.</span>
        <div className="atlas-3d-fallback-actions">
          <button type="button" onClick={() => { setInitError(null); setLoading(true); setAttempt(a => a + 1) }}>Try 3D again</button>
          <button type="button" className="is-ghost" onClick={onFallback}>Switch to 2D</button>
        </div>
      </div>}
    </div>
  )
}

