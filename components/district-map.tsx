'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, GeoJSON, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { canonDistrictKey } from '@/lib/district-geo'

export type DistrictMapPalika = {
  name: string
  slug: string
  lat: number
  lon: number
}

export type DistrictMapPlace = {
  title: string
  lat: number
  lon: number
  url: string
  note?: string
}

type DistrictFeature = {
  properties?: { DISTRICT?: string; PR_NAME?: string }
  geometry?: { type?: string; coordinates?: unknown }
}

type DistrictShapes = { type: string; features: DistrictFeature[] }

function geometryCenter(feature: DistrictFeature): [number, number] | null {
  let minLat = Infinity
  let minLon = Infinity
  let maxLat = -Infinity
  let maxLon = -Infinity
  const walk = (coords: unknown) => {
    if (!Array.isArray(coords)) return
    if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
      const lon = coords[0]
      const lat = coords[1]
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
      return
    }
    for (const child of coords) walk(child)
  }
  walk(feature.geometry?.coordinates)
  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) return null
  return [(minLat + maxLat) / 2, (minLon + maxLon) / 2]
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [26, 26] })
    else if (points.length === 1) map.setView(points[0], 10)
  }, [map, points])
  return null
}

export function DistrictMap({
  geoSlug,
  districtName,
  districtSlug,
  center,
  palikas = [],
  places = [],
  selectedPalikaSlug,
}: {
  geoSlug: string
  districtName: string
  districtSlug: string
  center: { lat: number; lon: number }
  palikas?: DistrictMapPalika[]
  places?: DistrictMapPlace[]
  selectedPalikaSlug?: string
}) {
  const [shapes, setShapes] = useState<DistrictShapes | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/geo/districts-okf/${geoSlug}.geojson`)
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (!cancelled && json) setShapes(json as DistrictShapes) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [geoSlug])

  const selectedKey = canonDistrictKey(districtName)

  const points = useMemo<[number, number][]>(() => {
    const centers = (shapes?.features ?? [])
      .map(geometryCenter)
      .filter((point): point is [number, number] => point != null)
    return centers.length ? centers : [[center.lat, center.lon]]
  }, [center.lat, center.lon, shapes])

  const style = (feature?: { properties?: { DISTRICT?: string } }) => {
    const selected = feature?.properties?.DISTRICT
      ? canonDistrictKey(feature.properties.DISTRICT) === selectedKey
      : false
    return selected
      ? { color: '#0b4f3e', weight: 2.4, fillColor: '#0d7c5f', fillOpacity: 0.32 }
      : { color: '#0d7c5f', weight: 0.7, fillColor: '#0d7c5f', fillOpacity: 0.06 }
  }

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={9}
      scrollWheelZoom={false}
      attributionControl={false}
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#eef2f0' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <FitBounds points={points} />
      {shapes && <GeoJSON data={shapes as never} style={style as never} interactive={false} />}
      {palikas.map(palika => {
        const selected = palika.slug === selectedPalikaSlug
        return (
          <CircleMarker
            key={palika.slug}
            center={[palika.lat, palika.lon]}
            radius={selected ? 8 : 4.5}
            pathOptions={{
              color: selected ? '#7c2d12' : '#0b4f3e',
              fillColor: selected ? '#ea580c' : '#0d7c5f',
              fillOpacity: selected ? 0.95 : 0.65,
              weight: selected ? 2.5 : 1,
            }}
          >
            <Tooltip direction="top" offset={[0, -5]}>{palika.name}</Tooltip>
            <Popup>
              <a href={`/districts/${districtSlug}/${palika.slug}`}>{palika.name}</a>
            </Popup>
          </CircleMarker>
        )
      })}
      <CircleMarker
        center={[center.lat, center.lon]}
        radius={9}
        pathOptions={{ color: '#0b4f3e', fillColor: '#0d7c5f', fillOpacity: 0.9, weight: 2.5 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>{districtName}</Tooltip>
      </CircleMarker>
      {places.map(place => (
        <CircleMarker
          key={`place-${place.title}`}
          center={[place.lat, place.lon]}
          radius={5}
          pathOptions={{ color: '#92400e', fillColor: '#f59e0b', fillOpacity: 0.9, weight: 1.5 }}
        >
          <Tooltip direction="top" offset={[0, -5]}>{place.title}</Tooltip>
          <Popup>
            <a href={place.url} target="_blank" rel="noreferrer">{place.title}</a>
            {place.note && <><br />{place.note}</>}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  )
}

export default DistrictMap
