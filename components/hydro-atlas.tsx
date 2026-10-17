'use client'

import { useEffect, useState } from 'react'
import { Zap, MapPin, Waves, ExternalLink } from 'lucide-react'
import { fetchHydroProjects, hydroKind, HYDRO_KIND_COLOR, HYDRO_KIND_LABEL, type HydroProject } from '@/lib/hydro'

const KIND_COLOR: Record<string, string> = HYDRO_KIND_COLOR

export function HydroAtlas() {
  const [loading, setLoading] = useState(true)
  const [plants, setPlants] = useState<HydroProject[]>([])

  useEffect(() => {
    let cancelled = false
    fetchHydroProjects()
      .then(p => { if (!cancelled) setPlants(p) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '.7rem .9rem', fontSize: '.72rem' }} className="bg-sunken border border-line-light rounded-[10px] text-tertiary">
        Loading hydropower register…
      </div>
    )
  }
  if (!plants.length) return null

  const totalMw = plants.reduce((s, p) => s + (p.mw || 0), 0)
  const operation = plants.filter(p => hydroKind(p.licenseType) === 'operation')
  const generation = plants.filter(p => hydroKind(p.licenseType) === 'generation')
  const survey = plants.filter(p => hydroKind(p.licenseType) === 'survey')
  const opMw = operation.reduce((s, p) => s + (p.mw || 0), 0)
  const genMw = generation.reduce((s, p) => s + (p.mw || 0), 0)
  const districts = new Set(plants.map(p => p.district).filter(Boolean)).size
  const top = [...plants].sort((a, b) => (b.mw || 0) - (a.mw || 0)).slice(0, 12)

  return (
    <section className="panel" style={{ marginTop: '1rem' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">HYDROPOWER LICENCE REGISTER · LIVE</p>
          <h2 className="font-serif" style={{ fontWeight: 500, letterSpacing: '-.02em' }}>Every licensed plant</h2>
        </div>
        <a href="https://hydro.naxa.com.np" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '.7rem', fontWeight: 600 }} className="text-primary">
          Naxa portal <ExternalLink size={12} />
        </a>
      </div>
      <p className="section-intro">
        Complete Niti/NAXA licence register - <strong>{plants.length}</strong> projects across <strong>{districts}</strong> districts,
        totalling <strong>{totalMw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW</strong> licensed.
        {` ${operation.length} are operational (${opMw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW), `}
        {generation.length} hold generation licences ({genMw.toLocaleString(undefined, { maximumFractionDigits: 0 })} MW) and {survey.length} are under survey.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: '.6rem', marginTop: '.9rem' }}>
        {top.map(p => {
          const kind = hydroKind(p.licenseType)
          return (
            <div key={`${p.name}-${p.licNo}`} style={{ padding: '.85rem .95rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
              <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <div style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }} className="bg-primary-50 rounded-[8px]">
                  <Zap size={14} className="text-primary" />
                </div>
                <strong style={{ fontSize: '.78rem', lineHeight: 1.25 }}>{p.name}</strong>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.35rem', marginTop: '.55rem' }}>
                <strong style={{ fontSize: '1.25rem', letterSpacing: '-.03em' }} className="text-primary">{p.mw}</strong>
                <span style={{ fontSize: '.62rem' }} className="text-tertiary">MW</span>
                <span style={{ marginLeft: 'auto', fontSize: '.54rem', fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', padding: '.14rem .4rem', borderRadius: 99, color: '#fff', background: KIND_COLOR[kind] }}>
                  {HYDRO_KIND_LABEL[kind]}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.2rem', marginTop: '.45rem', fontSize: '.66rem' }} className="text-secondary">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><MapPin size={11} style={{ color: KIND_COLOR[kind] }} /> {p.district}{p.municipality ? ` · ${p.municipality}` : ''}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}><Waves size={11} className="text-tertiary" /> {p.river} River</span>
              </div>
            </div>
          )
        })}
      </div>
      <p style={{ margin: '.8rem 0 0', fontSize: '.6rem' }} className="text-tertiary">
        Top 12 by capacity shown · full register plotted on the <a href="/projects/map" style={{ textDecoration: 'underline' }} className="text-primary">national map</a> · Source: Niti/NAXA hydropower portal · coordinates WGS84
      </p>
    </section>
  )
}
