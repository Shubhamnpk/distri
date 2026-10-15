'use client'

import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const PROVINCE_MAP: Record<number, string> = {
  1: 'Koshi',
  2: 'Madhesh',
  3: 'Bagmati',
  4: 'Gandaki',
  5: 'Lumbini',
  6: 'Karnali',
  7: 'Sudurpashchim',
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
  const [geoJson, setGeoJson] = useState<unknown>(null)
  const nationalCount = counts['National'] ?? 0

  useEffect(() => {
    fetch('/geo/nepal-provinces-simple.geojson')
      .then(r => r.json())
      .then((data: { features: { properties: { id: number; name: string } }[] }) => {
        // remap id/name to our province ids
        const mapped = {
          ...data,
          features: data.features.map(f => ({
            ...f,
            properties: {
              ...f.properties,
              id: PROVINCE_MAP[f.properties.id] ?? String(f.properties.id),
              label: PROVINCE_MAP[f.properties.id] ?? f.properties.name,
            },
          })),
        }
        setGeoJson(mapped)
      })
      .catch(() => setGeoJson(null))
  }, [])

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
    <div style={{ padding: '1rem 1.1rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem', flexWrap: 'wrap', gap: '.5rem' }}>
        <strong style={{ fontSize: '.82rem', letterSpacing: '-.02em' }}>Filter by province, click the map</strong>
        <span style={{ fontSize: '.62rem', padding: '.2rem .5rem' }} className="text-tertiary bg-sunken rounded-[20px]">
          {nationalCount} national projects listed separately - use National
        </span>
      </div>

      <div style={{ overflow: 'hidden', height: 380 }} className="rounded-[12px] border border-line-light bg-sunken">
        {geoJson ? (
          <MapContainer
            center={[28.4, 84.2] as [number, number]}
            zoom={6.2}
            zoomSnap={0.1}
            minZoom={6}
            maxZoom={8}
            maxBounds={[[26.0, 79.5] as [number, number], [31.0, 89.0] as [number, number]]}
            maxBoundsViscosity={0.9}
            style={{ height: '100%', width: '100%' }}
            className="bg-sunken"
            scrollWheelZoom={false}
            attributionControl={false}
            zoomControl={false}
          >
            <GeoJSON
              key={selected}
              data={geoJson as never}
              style={geoJsonStyle as never}
              onEachFeature={onEachFeature as never}
            />
          </MapContainer>
        ) : (
          <div style={{ height: '100%', display: 'grid', placeItems: 'center', fontSize: '.78rem' }} className="bg-sunken text-tertiary">
            Loading province boundaries…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', marginTop: '.75rem' }}>
        <button onClick={() => onSelect('All')} style={{
          padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
          background: selected === 'All' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'All' ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer'
        }} className="border border-line-light rounded-[6px]">
          All provinces
        </button>
        <button onClick={() => onSelect('National')} style={{
          padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
          background: selected === 'National' ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === 'National' ? '#fff' : 'var(--text-secondary)',
          cursor: 'pointer'
        }} className="border border-line-light rounded-[6px]">
          National ({nationalCount})
        </button>
        {['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'].map(p => (
          <button
            key={p}
            onClick={() => onSelect(p)}
            style={{
              padding: '.35rem .6rem', fontSize: '.7rem', fontWeight: 600,
              background: selected === p ? 'var(--accent)' : 'var(--bg-sunken)', color: selected === p ? '#fff' : 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            className="border border-line-light rounded-[6px]"
          >
            {p} ({counts[p] ?? 0})
          </button>
        ))}
      </div>
    </div>
  )
}
