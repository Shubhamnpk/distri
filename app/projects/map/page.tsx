'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { MapPin, Search, ArrowRight, FolderKanban } from 'lucide-react'
import { projects, slugify, provinceFromLocation, PROVINCES, parseBudgetCr } from '@/lib/data'
import { StatusBadge } from '@/components/shared'

const provinceColors: Record<string, string> = {
  Koshi: '#0d7c5f',
  Madhesh: '#b87d2a',
  Bagmati: '#1a9e7a',
  Gandaki: '#7c3aed',
  Lumbini: '#dc2626',
  Karnali: '#0891b2',
  Sudurpashchim: '#ea580c',
}

export default function ProjectsMapPage() {
  const [activeProvince, setActiveProvince] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const byProvince = useMemo(() => {
    const map = new Map<string, typeof projects>()
    PROVINCES.forEach(p => map.set(p, []))
    const unassigned: typeof projects = []
    projects.forEach(pr => {
      const prov = provinceFromLocation(pr.location)
      if (prov && map.has(prov)) map.get(prov)!.push(pr)
      else unassigned.push(pr)
    })
    return { map, unassigned }
  }, [])

  const filtered = useMemo(() => {
    let base = activeProvince ? (byProvince.map.get(activeProvince) ?? []) : projects
    if (query) {
      const q = query.toLowerCase()
      base = base.filter(p => `${p.name} ${p.location} ${p.ministry}`.toLowerCase().includes(q))
    }
    return base
  }, [activeProvince, query, byProvince])

  const totalBudgetCr = useMemo(() => {
    return filtered.reduce((s, p) => s + (parseBudgetCr(p.budget) ?? 0), 0)
  }, [filtered])

  return (
    <div className="content-wrap">
      <section className="panel" style={{ marginBottom: '1rem' }}>
        <p className="eyebrow" style={{ margin: 0 }}>PROVINCE & DISTRICT EXPLORER</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.7rem', margin: '.15rem 0 0', letterSpacing: '-.03em' }}>Map view, browse by region</h1>
            <p className="muted" style={{ marginTop: '.35rem' }}>
              Browse projects by province. 7 provinces, district explorer, budget in Cr. Click a province to filter.
            </p>
          </div>
          <Link href="/projects" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.78rem', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--border)', padding: '.45rem .75rem', borderRadius: 6, background: 'var(--bg-elevated)' }}>
            Back to list <ArrowRight size={14} />
          </Link>
        </div>

        {/* Province choropleth stub — 7 cards as map */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '.6rem', marginTop: '1rem' }}>
          {PROVINCES.map(prov => {
            const list = byProvince.map.get(prov) ?? []
            const active = activeProvince === prov
            const count = list.length
            const budgetCr = list.reduce((s, p) => s + (parseBudgetCr(p.budget) ?? 0), 0)
            return (
              <button
                key={prov}
                onClick={() => setActiveProvince(active ? null : prov)}
                style={{
                  textAlign: 'left',
                  padding: '.85rem .9rem',
                  borderRadius: 'var(--radius)',
                  border: `1px solid ${active ? provinceColors[prov] : 'var(--border-light)'}`,
                  background: active ? `${provinceColors[prov]}14` : 'var(--bg-elevated)',
                  boxShadow: active ? 'var(--shadow-sm)' : 'none',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.35rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: provinceColors[prov], display: 'inline-block' }} />
                  <strong style={{ fontSize: '.82rem' }}>{prov}</strong>
                  {active && <span style={{ marginLeft: 'auto', fontSize: '.62rem', background: provinceColors[prov], color: '#fff', padding: '.15rem .4rem', borderRadius: 20, fontWeight: 700 }}>Active</span>}
                </div>
                <div style={{ fontSize: '.72rem', color: 'var(--text-secondary)' }}>{count} projects</div>
                <div style={{ fontSize: '.68rem', color: 'var(--text-tertiary)', marginTop: '.15rem' }}>{budgetCr ? `${budgetCr.toLocaleString()} Cr budget` : 'Budget unavailable'}</div>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <label className="search" style={{ maxWidth: 300 }}>
            <Search size={16} />
            <input aria-label="Search projects" placeholder={activeProvince ? `Search in ${activeProvince}...` : 'Search all projects...'} value={query} onChange={e => setQuery(e.target.value)} />
          </label>
          {activeProvince && (
            <button
              onClick={() => setActiveProvince(null)}
              style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--primary)', background: 'var(--primary-50)', padding: '.35rem .6rem', borderRadius: 6, border: '1px solid transparent' }}
            >
              Clear province ✕
            </button>
          )}
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.68rem' }}>
            {filtered.length} projects {activeProvince ? `in ${activeProvince}` : 'nationwide'} · {totalBudgetCr.toLocaleString()} Cr
          </span>
        </div>
      </section>

      {/* Filtered project grid */}
      <section>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', background: 'var(--bg-sunken)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
            <p style={{ fontWeight: 600, margin: 0 }}>No projects in this region.</p>
            <p className="muted" style={{ marginTop: '.3rem' }}>Try another province or clear search.</p>
          </div>
        ) : (
          <div className="project-grid">
            {filtered.map(p => (
              <Link key={p.name} href={`/projects/${slugify(p.name)}`} className="project-card" style={{ textDecoration: 'none', display: 'block' }}>
                <img src={p.image} alt="" />
                <div className="project-top">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.62rem', color: 'var(--text-secondary)', background: 'var(--bg-sunken)', padding: '.2rem .5rem', borderRadius: 20, border: '1px solid var(--border-light)' }}>
                    <FolderKanban size={11} /> {p.category}
                  </span>
                  <StatusBadge status={p.status} />
                </div>
                <h3 style={{ marginTop: '.6rem' }}>{p.name}</h3>
                <p style={{ display: 'flex', alignItems: 'center', gap: '.25rem', fontSize: '.68rem', color: 'var(--text-secondary)', marginTop: '.2rem' }}>
                  <MapPin size={11} /> {p.location}
                </p>
                <div style={{ marginTop: '.6rem', display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '.62rem', background: 'var(--bg-sunken)', padding: '.2rem .45rem', borderRadius: 6, border: '1px solid var(--border-light)' }}>
                    Budget {p.budget} {parseBudgetCr(p.budget) ? `· ${parseBudgetCr(p.budget)!.toLocaleString()} Cr` : ''}
                  </span>
                  <span style={{ fontSize: '.62rem', background: 'var(--primary-50)', color: 'var(--primary)', padding: '.2rem .45rem', borderRadius: 6, fontWeight: 600 }}>
                    {p.progress}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {byProvince.unassigned.length > 0 && !activeProvince && (
        <section className="panel" style={{ marginTop: '1rem' }}>
          <p className="eyebrow" style={{ margin: 0 }}>NATIONWIDE / UNASSIGNED</p>
          <p className="muted" style={{ marginTop: '.25rem' }}>{byProvince.unassigned.length} projects span multiple provinces or national scope. They appear only in All.</p>
        </section>
      )}
    </div>
  )
}
