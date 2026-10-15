'use client'

import { useEffect, useState } from 'react'
import { Zap, MapPin, Waves, CalendarDays, ExternalLink } from 'lucide-react'
import { fetchNaxaDistricts, fetchNaxaHydroProjects, fetchNaxaMunicipalities } from '@/lib/naxa'
import type { NaxaHydroProject } from '@/lib/naxa'

export function HydroAtlas() {
  const [loading, setLoading] = useState(true)
  const [plants, setPlants] = useState<NaxaHydroProject[]>([])
  const [districts, setDistricts] = useState(0)
  const [municipalities, setMunicipalities] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [p, d, m] = await Promise.all([
          fetchNaxaHydroProjects(),
          fetchNaxaDistricts(),
          fetchNaxaMunicipalities(),
        ])
        if (cancelled) return
        setPlants(p)
        setDistricts(d.length)
        setMunicipalities(m.length)
      } catch {
        // silent - atlas is supplemental
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '.7rem .9rem', fontSize: '.72rem' }} className="bg-sunken border border-line-light rounded-[10px] text-tertiary">
        Loading hydropower atlas…
      </div>
    )
  }
  if (!plants.length) return null

  const totalMw = plants.reduce((s, p) => s + (p.mw || 0), 0)
  const sorted = [...plants].sort((a, b) => (b.mw || 0) - (a.mw || 0))

  return (
    <section className="panel" style={{ marginTop: '1rem' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">HYDROPOWER ATLAS · LIVE</p>
          <h2 className="font-serif" style={{ fontWeight: 500, letterSpacing: '-.02em' }}>Plants across the rivers</h2>
        </div>
        <a href="https://hydro.naxa.com.np" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', fontWeight: 600 }} className="text-primary">
          Naxa portal <ExternalLink size={12} />
        </a>
      </div>
      <p className="section-intro">
        Live reference data from the Naxa hydropower portal - {districts} districts · {municipalities} municipalities indexed.
        Sampled plants below total {totalMw.toFixed(1)} MW.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '.6rem', marginTop: '.9rem' }}>
        {sorted.map(p => (
          <div key={p.name} style={{ padding: '.85rem .95rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <div style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }} className="bg-primary-50 rounded-[8px]">
                <Zap size={14} className="text-primary" />
              </div>
              <strong style={{ fontSize: '.78rem', lineHeight: 1.25 }}>{p.name}</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.35rem', marginTop: '.55rem' }}>
              <strong style={{ fontSize: '1.25rem', letterSpacing: '-.03em' }} className="text-primary">{p.mw}</strong>
              <span style={{ fontSize: '.62rem' }} className="text-tertiary">MW</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', marginTop: '.45rem', fontSize: '.66rem' }} className="text-secondary">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><Waves size={11} className="text-tertiary" /> {p.river} River</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><CalendarDays size={11} className="text-tertiary" /> Commissioned {p.startYear}</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><MapPin size={11} className="text-tertiary" /> {p.lat.toFixed(3)}°N, {p.lng.toFixed(3)}°E</span>
            </div>
          </div>
        ))}
      </div>
      <p style={{ margin: '.8rem 0 0', fontSize: '.6rem' }} className="text-tertiary">
        Source: Naxa / Niti Foundation hydropower portal API · refreshed daily · coordinates WGS84
      </p>
    </section>
  )
}
