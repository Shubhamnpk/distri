'use client'

import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import { fetchGeoDistricts, districtsOfProvince, matchDistricts, type GeoDistrict } from '@/lib/geo'

export type DrillItem = {
  name: string
  location: string
  ministry: string
}

/**
 * Province → district drill-down. Click a province on the map, get its districts
 * with live project counts; click a district to filter. District matching is
 * text-based (published locations), so multi-district corridors appear under
 * each district they name.
 */
export function DistrictDrilldown({
  province,
  items,
  selected,
  onSelect,
}: {
  province: string
  items: DrillItem[]
  selected: string | null
  onSelect: (d: string | null) => void
}) {
  const [districts, setDistricts] = useState<GeoDistrict[] | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchGeoDistricts().then(all => {
      if (!cancelled) setDistricts(districtsOfProvince(all, province))
    }).catch(() => {
      if (!cancelled) setDistricts([])
    })
    return () => { cancelled = true }
  }, [province])

  const counts = useMemo(() => {
    const c = new Map<string, number>()
    for (const item of items) {
      for (const d of matchDistricts(`${item.name} ${item.location} ${item.ministry}`)) {
        c.set(d, (c.get(d) ?? 0) + 1)
      }
    }
    return c
  }, [items])

  if (districts === null) {
    return (
      <div style={{ marginTop: '.6rem', fontSize: '.7rem' }} className="text-tertiary">
        Loading districts of {province}…
      </div>
    )
  }
  if (!districts.length) return null

  const ranked = [...districts].sort((a, b) => (counts.get(b.name) ?? 0) - (counts.get(a.name) ?? 0))

  return (
    <div style={{ marginTop: '.6rem', padding: '.7rem .75rem' }} className="bg-sunken rounded-[10px] border border-line-light">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', flexWrap: 'wrap', marginBottom: '.5rem' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.64rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }} className="text-secondary">
          <MapPin size={12} /> Districts in {province}
        </span>
        <span style={{ fontSize: '.62rem' }} className="text-tertiary">· {districts.length} districts · DataNepal hierarchy</span>
        {selected && (
          <button
            onClick={() => onSelect(null)}
            style={{ marginLeft: 'auto', fontSize: '.68rem', fontWeight: 600, padding: '.25rem .55rem' }}
            className="text-primary bg-primary-50 rounded-[6px]"
          >
            All districts ✕
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
        {ranked.map(d => {
          const n = counts.get(d.name) ?? 0
          const active = selected === d.name
          return (
            <button
              key={d.name}
              disabled={n === 0 && !active}
              onClick={() => onSelect(active ? null : d.name)}
              title={n === 0 ? 'No tracked projects name this district' : `${n} project${n === 1 ? '' : 's'}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '.3rem',
                fontSize: '.68rem', fontWeight: 600, padding: '.32rem .6rem',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border-light)'}`,
                background: active ? 'var(--primary)' : n > 0 ? 'var(--bg-elevated)' : 'transparent',
                color: active ? '#fff' : n > 0 ? 'var(--text)' : 'var(--text-tertiary)',
                cursor: n > 0 ? 'pointer' : 'default',
                opacity: n > 0 || active ? 1 : .55,
              }}
              className="rounded-[20px]"
            >
              {d.name}
              <span style={{
                fontSize: '.62rem', fontWeight: 700, minWidth: 20, textAlign: 'center',
                background: active ? 'rgba(255,255,255,.22)' : n > 0 ? 'var(--primary-50)' : 'var(--bg-sunken)',
                color: active ? '#fff' : n > 0 ? 'var(--primary)' : 'var(--text-tertiary)',
                padding: '.05rem .3rem',
              }} className="rounded-[12px]">
                {n}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
