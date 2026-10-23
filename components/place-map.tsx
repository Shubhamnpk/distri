'use client'

import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

/** Small, non-interactive-ish locator map: OSM tiles + one labelled marker. */
export function PlaceMap({ lat, lon, label, zoom = 11 }: { lat: number; lon: number; label: string; zoom?: number }) {
  return (
    <MapContainer
      center={[lat, lon]}
      zoom={zoom}
      scrollWheelZoom={false}
      dragging={true}
      zoomControl={true}
      attributionControl={false}
      style={{ height: '100%', width: '100%', background: '#eef2f0' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
      <CircleMarker
        center={[lat, lon]}
        radius={9}
        pathOptions={{ color: '#0b4f3e', fillColor: '#0d7c5f', fillOpacity: 0.55, weight: 2 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>{label}</Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}

export default PlaceMap
