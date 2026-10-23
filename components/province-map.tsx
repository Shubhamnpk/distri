'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, GeoJSON, useMap, type GeoJSONProps } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type ProvinceMapDistrict = {
  name: string
  lat: number
  lon: number
  population?: number | null
}

export type ProvinceMapAttraction = {
  title: string
  lat: number
  lon: number
  url: string
}

const nf = new Intl.NumberFormat('en-IN')

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length > 1) map.fitBounds(points, { padding: [26, 26] })
    else if (points.length === 1) map.setView(points[0], 8)
  }, [map, points])
  return null
}

export function ProvinceMap({ geoSlug, capital, districts, attractions = [] }: {
  geoSlug: string
  capital: { name: string; lat: number; lon: number }
  districts: ProvinceMapDistrict[]
  attractions?: ProvinceMapAttraction[]
}) {
  const [shape, setShape] = useState<GeoJSONProps['data'] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/geo/provinces/${geoSlug}.geojson`)
      .then(res => res.ok ? res.json() : null)
      .then(json => { if (!cancelled && json) setShape(json as GeoJSONProps['data']) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [geoSlug])

  const points = useMemo<[number, number][]>(() => [
    [capital.lat, capital.lon],
    ...districts.map(d => [d.lat, d.lon] as [number, number]),
    ...attractions.map(a => [a.lat, a.lon] as [number, number]),
  ], [capital.lat, capital.lon, districts, attractions])

  const maxPopulation = Math.max(0, ...districts.map(d => d.population ?? 0))

  return (
    <MapContainer
      center={[capital.lat, capital.lon]}
      zoom={7}
      scrollWheelZoom={false}
      attributionControl={false}
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#eef2f0' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <FitBounds points={points} />
      {shape && (
        <GeoJSON
          data={shape}
          interactive={false}
          style={{ color: '#0d7c5f', weight: 1.5, fillColor: '#0d7c5f', fillOpacity: 0.08 }}
        />
      )}
      {districts.map(district => {
        const radius = district.population && maxPopulation > 0
          ? 5 + Math.sqrt(district.population / maxPopulation) * 7
          : 5
        return (
          <CircleMarker
            key={district.name}
            center={[district.lat, district.lon]}
            radius={radius}
            pathOptions={{ color: '#0b4f3e', fillColor: '#0d7c5f', fillOpacity: 0.45, weight: 1.5 }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {district.name}{district.population ? ` · ${nf.format(district.population)}` : ''}
            </Tooltip>
          </CircleMarker>
        )
      })}
      {attractions.map(place => (
        <CircleMarker
          key={`a-${place.title}`}
          center={[place.lat, place.lon]}
          radius={5}
          pathOptions={{ color: '#92400e', fillColor: '#f59e0b', fillOpacity: 0.9, weight: 1.5 }}
        >
          <Tooltip direction="top" offset={[0, -5]}>{place.title}</Tooltip>
          <Popup>
            <a href={place.url} target="_blank" rel="noreferrer">{place.title}</a>
          </Popup>
        </CircleMarker>
      ))}
      <CircleMarker
        center={[capital.lat, capital.lon]}
        radius={9}
        pathOptions={{ color: '#7c2d12', fillColor: '#ea580c', fillOpacity: 0.7, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>{`${capital.name} · capital`}</Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}

export default ProvinceMap

