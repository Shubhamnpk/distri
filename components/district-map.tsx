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
  properties?: { DISTRICT?: string; PR_NAME?: string; GaPa_NaPa?: string }
  geometry?: { type?: string; coordinates?: unknown }
}

type DistrictShapes = { type: string; features: DistrictFeature[] }

function geometryBounds(feature: DistrictFeature): [number, number][] {
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
  if (!Number.isFinite(minLat) || !Number.isFinite(minLon)) return []
  return [[minLat, minLon], [maxLat, maxLon]]
}

function FitBounds({ points, maxZoom }: { points: [number, number][]; maxZoom: number }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [26, 26], maxZoom })
    else if (points.length === 1) map.setView(points[0], maxZoom)
  }, [map, maxZoom, points])
  return null
}

function localNameKey(name: string): string {
  return canonDistrictKey(name).replace(/(submetropolitancity|metropolitancity|ruralmunicipality|municipality|nagarpalika|gaunpalika)$/g, '')
}

function localNamesMatch(left: string, right: string): boolean {
  const a = localNameKey(left)
  const b = localNameKey(right)
  if (!a || !b) return false
  if (a === b) return true
  if (Math.abs(a.length - b.length) > 2) return false
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index)
  for (let i = 1; i <= a.length; i++) {
    const current = [i]
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    previous = current
  }
  return previous[b.length] <= 2
}

export function DistrictMap({
  geoSlug,
  districtName,
  districtSlug,
  center,
  palikas = [],
  places = [],
  selectedPalikaSlug,
  selectedPalikaName,
  focus = 'district',
}: {
  geoSlug: string
  districtName: string
  districtSlug: string
  center: { lat: number; lon: number }
  palikas?: DistrictMapPalika[]
  places?: DistrictMapPlace[]
  selectedPalikaSlug?: string
  selectedPalikaName?: string
  focus?: 'district' | 'palika'
}) {
  const [districtShapes, setDistrictShapes] = useState<DistrictShapes | null>(null)
  const [municipalityShapes, setMunicipalityShapes] = useState<DistrictShapes | null>(null)

  useEffect(() => {
    let cancelled = false
    setDistrictShapes(null)
    setMunicipalityShapes(null)
    const districtRequest = fetch(`/geo/districts-okf/${geoSlug}.geojson`)
      .then(res => res.ok ? res.json() as Promise<DistrictShapes> : null)
      .catch(() => null)
    const municipalityRequest = focus === 'palika'
      ? fetch(`/geo/municipalities/${geoSlug}.geojson`)
          .then(res => res.ok ? res.json() as Promise<DistrictShapes> : null)
          .catch(() => null)
      : Promise.resolve(null)
    Promise.all([districtRequest, municipalityRequest]).then(([districts, municipalities]) => {
      if (cancelled) return
      setDistrictShapes(districts)
      setMunicipalityShapes(municipalities)
    })
    return () => { cancelled = true }
  }, [focus, geoSlug])

  const selectedKey = canonDistrictKey(districtName)
  const districtFeatures = useMemo(
    () => districtShapes?.features.filter(feature => canonDistrictKey(feature.properties?.DISTRICT ?? '') === selectedKey) ?? [],
    [districtShapes, selectedKey],
  )
  const palikaFeatures = useMemo(
    () => municipalityShapes?.features.filter(feature =>
      canonDistrictKey(feature.properties?.DISTRICT ?? '') === selectedKey
      && !!selectedPalikaName
      && localNamesMatch(feature.properties?.GaPa_NaPa ?? '', selectedPalikaName),
    ) ?? [],
    [municipalityShapes, selectedKey, selectedPalikaName],
  )
  const focusedShapes = useMemo<DistrictShapes | null>(() => {
    const features = focus === 'palika' ? [...districtFeatures, ...palikaFeatures] : districtFeatures
    return { type: 'FeatureCollection', features }
  }, [districtFeatures, focus, palikaFeatures])

  const points = useMemo<[number, number][]>(() => {
    if (focus === 'palika' && palikaFeatures.length > 0) {
      const bounds = palikaFeatures.flatMap(geometryBounds)
      return bounds.length ? bounds : [[center.lat, center.lon]]
    }

    const boundary = (focusedShapes?.features ?? []).flatMap(geometryBounds)
    const markers = focus === 'district'
      ? [
          ...palikas.map(palika => [palika.lat, palika.lon] as [number, number]),
          ...places.map(place => [place.lat, place.lon] as [number, number]),
        ]
      : []
    const pointsToFit = [...boundary, ...markers]
    return pointsToFit.length ? pointsToFit : [[center.lat, center.lon]]
  }, [center.lat, center.lon, focus, focusedShapes, palikaFeatures, palikas, places])

  const style = (feature?: { properties?: { DISTRICT?: string } }) => {
    const selected = feature?.properties?.DISTRICT
      ? canonDistrictKey(feature.properties.DISTRICT) === selectedKey
      : false
    return selected
      ? { color: '#0b4f3e', weight: 2.4, fillColor: '#0d7c5f', fillOpacity: 0.32 }
      : { color: '#0d7c5f', weight: 0.7, fillColor: '#0d7c5f', fillOpacity: 0.06 }
  }

  const localStyle = (feature?: { properties?: { GaPa_NaPa?: string } }) => {
    const selected = !!selectedPalikaName && localNamesMatch(feature?.properties?.GaPa_NaPa ?? '', selectedPalikaName)
    return selected
      ? { color: '#9a3412', weight: 2.8, fillColor: '#f97316', fillOpacity: 0.48 }
      : { color: '#0d7c5f', weight: 0.7, fillColor: '#0d7c5f', fillOpacity: 0.06 }
  }

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={focus === 'palika' ? 12 : 9}
      scrollWheelZoom={false}
      attributionControl={false}
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#eef2f0' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <FitBounds points={points} maxZoom={focus === 'palika' ? 13 : 12} />
      {focus === 'district' && (focusedShapes?.features.length ?? 0) > 0 && (
        <GeoJSON data={focusedShapes as never} style={style as never} interactive={false} />
      )}
      {focus === 'palika' && districtFeatures.length > 0 && (
        <GeoJSON data={{ type: 'FeatureCollection', features: districtFeatures } as never} style={style as never} interactive={false} />
      )}
      {focus === 'palika' && palikaFeatures.length > 0 && (
        <GeoJSON data={{ type: 'FeatureCollection', features: palikaFeatures } as never} style={localStyle as never} interactive={false} />
      )}
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
      {(focus === 'district' || focus === 'palika') && <CircleMarker
        center={[center.lat, center.lon]}
        radius={9}
        pathOptions={focus === 'palika'
          ? { color: '#9a3412', fillColor: '#f97316', fillOpacity: 0.95, weight: 2.5 }
          : { color: '#0b4f3e', fillColor: '#0d7c5f', fillOpacity: 0.9, weight: 2.5 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>{focus === 'palika' ? selectedPalikaName ?? districtName : districtName}</Tooltip>
      </CircleMarker>}
      {focus === 'district' && places.map(place => (
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
