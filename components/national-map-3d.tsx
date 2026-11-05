'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Compass, RotateCcw } from 'lucide-react'
import type { ErrorEvent, Map as MapLibreMap, MapLayerMouseEvent, GeoJSONSource } from 'maplibre-gl'

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
  points: Atlas3DFeature[]
  roadsVisible: boolean
  onSelect: (kind: string, id: string) => void
  onMove: (lat: number, lng: number, zoom: number) => void
  onReady: (map: MapLibreMap | null) => void
  onFallback: () => void
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }
const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'

function rasterTiles(basemap: Props['basemap']): { tiles: string[]; attribution: string; maxzoom: number } {
  if (basemap === 'satellite') return {
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: 'Tiles &copy; Esri, Maxar', maxzoom: 19,
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

export function NationalMap3D({ basemap, center, zoom, bounds, boundaries, points, roadsVisible, onSelect, onMove, onReady, onFallback }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [initError, setInitError] = useState(false)
  const [loading, setLoading] = useState(true)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [camera, setCamera] = useState({ pitch: 68, bearing: -8 })
  const onSelectRef = useRef(onSelect)
  const onMoveRef = useRef(onMove)
  onSelectRef.current = onSelect
  onMoveRef.current = onMove
  const boundariesRef = useRef(boundaries)
  const pointsRef = useRef(points)
  const basemapRef = useRef(basemap)
  const roadsRef = useRef(roadsVisible)
  boundariesRef.current = boundaries
  pointsRef.current = points
  basemapRef.current = basemap
  roadsRef.current = roadsVisible

  useEffect(() => {
    let alive = true
    let cleanup: (() => void) | undefined
    void import('maplibre-gl').then(maplibregl => {
      if (!alive || !containerRef.current) return
      // Next 16 uses Turbopack; MapLibre's worker must be emitted as a separate asset.
      maplibregl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString())
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: { version: 8, sources: {}, layers: [] },
        center: [center.lng, center.lat],
        zoom,
        pitch: 68,
        bearing: -8,
        minZoom: 0,
        maxZoom: 22,
        maxPitch: 85,
        attributionControl: false,
        renderWorldCopies: false,
        canvasContextAttributes: { antialias: true },
        fadeDuration: 0,
      })
      mapRef.current = map
      onReady(map)

      const installLayers = () => {
        if (!alive || !map.isStyleLoaded()) return
        if (!map.getSource('atlas-dem')) {
          map.addSource('atlas-dem', { type: 'raster-dem', tiles: [DEM], tileSize: 256, encoding: 'terrarium', maxzoom: 15, attribution: 'Terrain tiles by Mapzen, hosted by AWS Open Data' })
          map.setTerrain({ source: 'atlas-dem', exaggeration: 1.25 })
          map.addLayer({ id: 'atlas-hillshade', type: 'hillshade', source: 'atlas-dem', paint: { 'hillshade-exaggeration': 0.28, 'hillshade-shadow-color': '#263447', 'hillshade-highlight-color': '#fff8e8', 'hillshade-illumination-direction': 320 } })
          map.addControl(new maplibregl.TerrainControl({ source: 'atlas-dem', exaggeration: 1.25 }), 'top-right')
        }
        const raster = rasterTiles(basemapRef.current)
        if (!map.getSource('atlas-base')) {
          map.addSource('atlas-base', { type: 'raster', tiles: raster.tiles, tileSize: 256, maxzoom: raster.maxzoom, attribution: raster.attribution })
          map.addLayer({ id: 'atlas-base-layer', type: 'raster', source: 'atlas-base' }, 'atlas-hillshade')
        }
        for (const [id, data] of [['atlas-boundaries', { type: 'FeatureCollection', features: boundariesRef.current as never[] }], ['atlas-points', { type: 'FeatureCollection', features: pointsRef.current as never[] }]] as const) {
          if (!map.getSource(id)) map.addSource(id, id === 'atlas-points'
            ? { type: 'geojson', data, promoteId: 'id', cluster: true, clusterRadius: 42, clusterMaxZoom: 11 }
            : { type: 'geojson', data, promoteId: 'id' })
        }
        if (!map.getLayer('atlas-region-fill')) map.addLayer({ id: 'atlas-region-fill', type: 'fill', source: 'atlas-boundaries', filter: ['==', ['get', 'kind'], 'province'], paint: { 'fill-color': ['coalesce', ['get', 'color'], '#1c9b78'], 'fill-opacity': 0.09 } })
        if (!map.getLayer('atlas-region-line')) map.addLayer({ id: 'atlas-region-line', type: 'line', source: 'atlas-boundaries', paint: { 'line-color': ['coalesce', ['get', 'color'], '#0f766e'], 'line-width': ['case', ['==', ['get', 'selected'], true], 3, 1.1], 'line-opacity': 0.9 } })
        if (!map.getSource('atlas-road-tiles')) map.addSource('atlas-road-tiles', { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: 'OpenFreeMap · © OpenStreetMap contributors' })
        if (!map.getLayer('atlas-road-lines')) map.addLayer({ id: 'atlas-road-lines', type: 'line', source: 'atlas-road-tiles', 'source-layer': 'transportation', minzoom: 6, layout: { visibility: roadsRef.current ? 'visible' : 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk', 'primary'], '#b45309', ['secondary', 'tertiary'], '#ca8a04', '#a8a29e'], 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.3, 14, 2.5], 'line-opacity': 0.78 } })
        if (!map.getLayer('atlas-clusters')) map.addLayer({ id: 'atlas-clusters', type: 'circle', source: 'atlas-points', filter: ['has', 'point_count'], paint: { 'circle-color': '#0d7c5f', 'circle-opacity': 0.9, 'circle-stroke-color': '#fff', 'circle-stroke-width': 2, 'circle-radius': ['step', ['get', 'point_count'], 15, 20, 19, 100, 23, 500, 28] } })
        if (!map.getLayer('atlas-cluster-count')) map.addLayer({ id: 'atlas-cluster-count', type: 'symbol', source: 'atlas-points', filter: ['has', 'point_count'], layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 11, 'text-allow-overlap': true }, paint: { 'text-color': '#fff' } })
        if (!map.getLayer('atlas-points-layer')) map.addLayer({ id: 'atlas-points-layer', type: 'circle', source: 'atlas-points', filter: ['!', ['has', 'point_count']], paint: { 'circle-color': ['coalesce', ['get', 'color'], '#2563eb'], 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['coalesce', ['get', 'size'], 4], 12, ['+', ['coalesce', ['get', 'size'], 4], 2]], 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5, 'circle-opacity': 0.94 } })
        if (!map.getLayer('atlas-labels')) map.addLayer({ id: 'atlas-labels', type: 'symbol', source: 'atlas-points', filter: ['!', ['has', 'point_count']], minzoom: 9, layout: { 'text-field': ['coalesce', ['get', 'label'], ''], 'text-size': 10, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-allow-overlap': false }, paint: { 'text-color': '#17212b', 'text-halo-color': '#fff', 'text-halo-width': 1.4 } })
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
          if (kind && id) onSelectRef.current(kind, id)
          const label = String(f?.properties?.label ?? '')
          if (label) new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '260px' }).setLngLat(event.lngLat).setText(label).addTo(map)
        })
        map.on('click', 'atlas-region-line', (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0]
          const kind = String(feature?.properties?.kind ?? '')
          const id = String(feature?.properties?.itemId ?? '')
          if (kind && id) onSelectRef.current(kind, id)
        })
        map.on('mouseenter', 'atlas-points-layer', () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', 'atlas-points-layer', () => { map.getCanvas().style.cursor = '' })
        map.resize()
      }
      const onStyle = () => installLayers()
      map.on('style.load', onStyle)
      const handleMove = () => {
        const c = map.getCenter()
        onMoveRef.current(c.lat, c.lng, map.getZoom())
      }
      map.on('moveend', handleMove)
      const syncCamera = () => setCamera({ pitch: Math.round(map.getPitch()), bearing: Math.round(map.getBearing()) })
      map.on('moveend', syncCamera)
      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true, showZoom: false, showCompass: true }), 'top-right')
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left')
      map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')
      map.scrollZoom.setWheelZoomRate(1 / 420)
      map.on('error', (event: ErrorEvent) => {
        console.warn('3D map resource error:', event.error.message)
      })
      const finishLoading = () => setLoading(false)
      map.once('idle', finishLoading)
      const loadingTimeout = window.setTimeout(finishLoading, 7000)
      cleanup = () => { window.clearTimeout(loadingTimeout); map.off('style.load', onStyle); map.off('moveend', handleMove); map.off('moveend', syncCamera); map.remove() }
    }).catch(error => {
      console.error('Unable to load 3D map renderer', error)
      setInitError(true)
    })
    return () => {
      alive = false
      cleanup?.()
      mapRef.current = null
      onReady(null)
    }
  // The renderer is intentionally created once per view mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    const source = mapRef.current?.getSource('atlas-points') as GeoJSONSource | undefined
    source?.setData({ type: 'FeatureCollection', features: points as never[] })
  }, [points])

  useEffect(() => {
    if (!bounds || !mapRef.current) return
    mapRef.current.fitBounds([[bounds[0][1], bounds[0][0]], [bounds[1][1], bounds[1][0]]], { padding: 70, maxZoom: 12, duration: 900 })
  }, [bounds])

  return (
    <div ref={containerRef} className="atlas-maplibre" aria-label="Interactive 3D terrain map of Nepal">
      <div className="atlas-camera-controls">
        <button className="atlas-camera-trigger" type="button" aria-expanded={cameraOpen} onClick={() => setCameraOpen(open => !open)}>
          <Compass size={15} style={{ transform: `rotate(${-camera.bearing}deg)` }} /><span>Camera</span><small>{camera.pitch}° tilt</small><ChevronDown size={13} className={cameraOpen ? 'is-open' : ''} />
        </button>
        {cameraOpen && <div className="atlas-camera-panel">
          <label><span>Tilt <b>{camera.pitch}°</b></span><input aria-label="Map tilt" type="range" min="0" max="80" step="1" value={camera.pitch} onChange={event => { const pitch = Number(event.currentTarget.value); setCamera(current => ({ ...current, pitch })); mapRef.current?.setPitch(pitch) }} /></label>
          <label><span>Rotation <b>{camera.bearing}°</b></span><input aria-label="Map rotation" type="range" min="-180" max="180" step="1" value={camera.bearing} onChange={event => { const bearing = Number(event.currentTarget.value); setCamera(current => ({ ...current, bearing })); mapRef.current?.setBearing(bearing) }} /></label>
          <button className="atlas-camera-reset" type="button" onClick={() => { setCamera({ pitch: 68, bearing: 0 }); mapRef.current?.easeTo({ pitch: 68, bearing: 0, duration: 450 }) }}><RotateCcw size={13} /> Reset orientation</button>
          <small>Drag with the right mouse button or two fingers to tilt and rotate.</small>
        </div>}
      </div>
      {loading && !initError && <div className="atlas-terrain-loading"><span className="atlas-terrain-spinner" /><span><strong>Loading terrain</strong><small>Preparing elevation and imagery…</small></span></div>}
      {initError && <div className="atlas-3d-fallback"><strong>3D maps need WebGL support</strong><span>Enable WebGL in this browser or switch to the 2D map.</span><button type="button" onClick={onFallback}>Switch to 2D</button></div>}
    </div>
  )
}

