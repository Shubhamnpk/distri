'use client'

import { useMemo } from 'react'
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

type FeatureCollection = {
  type: 'FeatureCollection'
  features: { type: string; properties: Record<string, string>; geometry: { type: string; coordinates: number[][][] } }[]
}

// Simplified province GeoJSON — 7 provinces, non-overlapping, roughly placed
// Coordinates: [lng, lat]
const NEPAL_PROVINCES: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: 'Sudurpashchim', label: 'Sudurpashchim' },
      geometry: { type: 'Polygon', coordinates: [[[80.0, 28.8], [81.8, 28.8], [81.8, 30.5], [80.0, 30.5], [80.0, 28.8]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Karnali', label: 'Karnali' },
      geometry: { type: 'Polygon', coordinates: [[[81.8, 28.5], [83.5, 28.5], [83.5, 30.2], [81.8, 30.2], [81.8, 28.5]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Gandaki', label: 'Gandaki' },
      geometry: { type: 'Polygon', coordinates: [[[83.5, 28.2], [85.5, 28.2], [85.5, 29.2], [83.5, 29.2], [83.5, 28.2]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Lumbini', label: 'Lumbini' },
      geometry: { type: 'Polygon', coordinates: [[[82.3, 27.0], [84.8, 27.0], [84.8, 28.0], [82.3, 28.0], [82.3, 27.0]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Bagmati', label: 'Bagmati' },
      geometry: { type: 'Polygon', coordinates: [[[85.3, 27.8], [86.8, 27.8], [86.8, 28.8], [85.3, 28.8], [85.3, 27.8]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Koshi', label: 'Koshi' },
      geometry: { type: 'Polygon', coordinates: [[[86.5, 27.0], [88.2, 27.0], [88.2, 28.5], [86.5, 28.5], [86.5, 27.0]]] },
    },
    {
      type: 'Feature',
      properties: { id: 'Madhesh', label: 'Madhesh' },
      geometry: { type: 'Polygon', coordinates: [[[84.8, 26.4], [88.0, 26.4], [88.0, 27.0], [84.8, 27.0], [84.8, 26.4]]] },
    },
  ],
}

export function NepalMapReal({
  selected,
  onSelect,
  counts,
}: {
  selected: string
  onSelect: (p: string) => void
  counts: Record<string, number>
}) {
  const nationalCount = counts['National'] ?? 0

  const geoJsonStyle = (feature: unknown) => {
    const id = (feature as { properties: { id: string } }).properties.id
    const isActive = selected === id
    return {
      fillColor: isActive ? '#0d7c5f' : '#ffffff',
      color: isActive ? '#0d7c5f' : '#cbd5e1',
      weight: isActive ? 2.2 : 1.1,
      fillOpacity: isActive ? 0.92 : 0.78,
    } as Record<string, unknown>
  }

  const onEachFeature = (feature: unknown, layer: unknown) => {
    const id = (feature as { properties: { id: string; label: string } }).properties.id
    const label = (feature as { properties: { label: string } }).properties.label
    const count = counts[id] ?? 0
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const l = layer as any
    l.bindTooltip(`${label} · ${count} projects`, { sticky: true, direction: 'top' })
    l.on('click', () => onSelect(id))
    l.on('mouseover', () => l.setStyle({ weight: 2.2, fillOpacity: 0.92 }))
    l.on('mouseout', () => l.setStyle(geoJsonStyle(feature)))
  }

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <strong style={{ fontSize: '.82rem', letterSpacing: '-.02em' }}>Filter by province, click the map</strong>
        <span style={{ fontSize: '.62rem', color: 'var(--text-tertiary)', background: 'var(--bg-sunken)', padding: '.2rem .5rem', borderRadius: 20 }}>
          {nationalCount} national projects shown in every province
        </span>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-light)', height: 380 }}>
        <MapContainer
          center={[28.3, 84.5] as [number, number]}
          zoom={7}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          attributionControl={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <GeoJSON
            key={selected}
            data={NEPAL_PROVINCES as unknown as never}
            style={geoJsonStyle as never}
            onEachFeature={onEachFeature as never}
          />
        </MapContainer>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.75rem' }}>
        <button onClick={() => onSelect('All')} style={{
          padding: '.35rem .6rem', borderRadius: 6, fontSize: '.7rem', fontWeight: 600,
          background: selected === 'All' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'All' ? '#fff' : 'var(--text-secondary)',
          border: '1px solid var(--border-light)', cursor: 'pointer'
        }}>
          All provinces
        </button>
        <button onClick={() => onSelect('National')} style={{
          padding: '.35rem .6rem', borderRadius: 6, fontSize: '.7rem', fontWeight: 600,
          background: selected === 'National' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'National' ? '#fff' : 'var(--text-secondary)',
          border: '1px solid var(--border-light)', cursor: 'pointer'
        }}>
          National ({nationalCount})
        </button>
        {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            style={{
              padding: '.35rem .6rem', borderRadius: 6, fontSize: '.7rem', fontWeight: 600,
              background: selected === p ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === p ? '#fff' : 'var(--text-secondary)',
              border: '1px solid var(--border-light)', cursor: 'pointer'
            }}
          >
            {p} ({counts[p] ?? 0})
          </button>
        ))}
      </div>

      <p style={{ margin: '.6rem 0 0', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
        Real OpenStreetMap tiles + simplified province GeoJSON. National projects span multiple provinces and appear in every filter. Heritage & conservation sites cluster in Bagmati.
      </p>
    </div>
  )
}
