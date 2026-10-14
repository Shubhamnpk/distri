'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, FolderKanban, Eye, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { StatusBadge } from '@/components/shared'
import { DetailDrawer } from '@/components/detail-drawer'
import { projects, slugify, parseBudgetCr, utilizationPct } from '@/lib/data'

const NepalMapReal = dynamic(() => import('@/components/nepal-map-real').then(m => m.NepalMapReal), {
  ssr: false,
  loading: () => <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '2rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '.78rem' }}>Loading map…</div>,
})
import type { Project } from '@/lib/types'

const STATUS_FILTERS = ['All', 'Completed', 'On track', 'At risk', 'Delayed'] as const
const CATEGORY_FILTERS = ['All', 'Hydropower', 'Highway', 'Airport', 'Irrigation', 'Water', 'Heritage', 'Sports', 'Rail', 'Conservation'] as const
const SORTS = ['Newest', 'Budget ↓', 'Budget ↑', 'Progress ↓', 'Progress ↑', 'Name A–Z'] as const

function statusColor(status: Project['status']): string {
  if (status === 'On track' || status === 'Completed') return 'var(--primary)'
  if (status === 'At risk') return 'var(--warning)'
  return 'var(--danger)'
}

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [catFilter, setCatFilter] = useState<(typeof CATEGORY_FILTERS)[number]>('All')
  const [provinceFilter, setProvinceFilter] = useState<string>('All')
  const [showMap, setShowMap] = useState(true)
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Newest')
  const [selected, setSelected] = useState<Project | null>(null)
  const [quarter, setQuarter] = useState('Q1')

  const provinceCounts = useMemo(() => {
    const c: Record<string, number> = { National: projects.filter(p => p.province === 'National').length }
    for (const pr of ['Koshi', 'Madhesh', 'Bagmati', 'Gandaki', 'Lumbini', 'Karnali', 'Sudurpashchim'] as const) {
      c[pr] = projects.filter(p => p.province === pr).length
    }
    return c
  }, [])

  const filtered = useMemo(() => {
    let out = projects.filter(
      x =>
        (statusFilter === 'All' || x.status === statusFilter) &&
        (catFilter === 'All' || x.category === catFilter) &&
        (provinceFilter === 'All' || x.province === provinceFilter || x.province === 'National') &&
        `${x.name} ${x.ministry} ${x.location}`.toLowerCase().includes(query.toLowerCase())
    )
    if (sort === 'Budget ↓' || sort === 'Budget ↑') {
      out = [...out].sort((a, b) => {
        const av = parseBudgetCr(a.budget) ?? -1
        const bv = parseBudgetCr(b.budget) ?? -1
        return sort === 'Budget ↓' ? bv - av : av - bv
      })
    } else if (sort === 'Progress ↓' || sort === 'Progress ↑') {
      out = [...out].sort((a, b) => (sort === 'Progress ↓' ? b.progress - a.progress : a.progress - b.progress))
    } else if (sort === 'Name A–Z') {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    }
    return out
  }, [query, statusFilter, catFilter, provinceFilter, sort])

  const counts = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'On track').length,
    atRisk: projects.filter(p => p.status === 'At risk').length,
    delayed: projects.filter(p => p.status === 'Delayed').length,
    completed: projects.filter(p => p.status === 'Completed').length,
  }

  return (
    <div className="content-wrap">
      <section className="full-panel panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">NATIONAL DEVELOPMENT</p>
            <h2>Public project tracker</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem' }}>
            {filtered.length} of {projects.length} shown
          </span>
        </div>
        <p className="section-intro">Click any project to inspect milestones, budget, spending, timeline, and source evidence.</p>

        {/* Progress overview */}
        <div
          style={{
            display: 'flex',
            gap: '.5rem',
            flexWrap: 'wrap',
            marginTop: '.85rem',
            padding: '.75rem',
            background: 'var(--bg-sunken)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border-light)',
          }}
        >
          {[
            { label: 'On track', count: counts.onTrack, color: 'var(--primary)', bg: 'var(--primary-50)' },
            { label: 'At risk', count: counts.atRisk, color: 'var(--warning)', bg: 'var(--warning-light)' },
            { label: 'Delayed', count: counts.delayed, color: 'var(--danger)', bg: 'var(--danger-light)' },
            { label: 'Completed', count: counts.completed, color: 'var(--primary)', bg: 'var(--primary-50)' },
          ].map(item => (
            <span
              key={item.label}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.4rem',
                padding: '.35rem .6rem',
                borderRadius: 20,
                background: item.bg,
                color: item.color,
                fontSize: '.7rem',
                fontWeight: 700,
                border: `1px solid ${item.color}18`,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: item.color, display: 'inline-block' }} />
              {item.label} {item.count}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '.66rem', color: 'var(--text-tertiary)', alignSelf: 'center' }}>{counts.total} total projects</span>
        </div>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMap(v => !v)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.35rem',
              fontSize: '.72rem', fontWeight: 700, padding: '.45rem .75rem', borderRadius: 8,
              border: '1px solid var(--border)', background: showMap ? 'var(--accent)' : 'var(--bg-elevated)',
              color: showMap ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            {showMap ? '🗺 Hide map' : '🗺 Show map'} {provinceFilter !== 'All' ? `· ${provinceFilter}` : ''}
          </button>
          {provinceFilter !== 'All' && (
            <button onClick={() => setProvinceFilter('All')} style={{ fontSize: '.72rem', fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-light)', padding: '.35rem .6rem', borderRadius: 6, border: '1px solid var(--accent)', cursor: 'pointer' }}>
              Clear province ✕
            </button>
          )}
        </div>

        {showMap && (
          <div style={{ marginTop: '.75rem' }}>
            <NepalMapReal selected={provinceFilter} onSelect={setProvinceFilter} counts={provinceCounts} />
          </div>
        )}

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
          <label className="search" style={{ maxWidth: '280px' }}>
            <Search size={16} />
            <input
              aria-label="Search projects"
              placeholder="Search by name, ministry, location..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </label>
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                fontSize: '.72rem',
                color: 'var(--primary)',
                fontWeight: 600,
                background: 'var(--primary-50)',
                padding: '.3rem .55rem',
                borderRadius: 6,
              }}
            >
              Clear
            </button>
          )}
          <select
            aria-label="Sort projects"
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            style={{
              marginLeft: 'auto',
              fontSize: '.72rem',
              fontWeight: 600,
              padding: '.4rem .6rem',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-elevated)',
              color: 'var(--text-secondary)',
            }}
          >
            {SORTS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.6rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f} className={statusFilter === f ? 'selected' : ''} onClick={() => setStatusFilter(f)}>
              {f}
              {f !== 'All' && ` (${projects.filter(p => p.status === f).length})`}
            </button>
          ))}
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.4rem', flexWrap: 'wrap' }}>
          {CATEGORY_FILTERS.map(f => (
            <button key={f} className={catFilter === f ? 'selected' : ''} onClick={() => setCatFilter(f)}>
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div
            style={{
              marginTop: '1.5rem',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border)',
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>No projects match this filter.</p>
            <p className="muted" style={{ margin: '.3rem 0 0' }}>
              Try adjusting search, status, or category.
            </p>
            <button
              onClick={() => {
                setQuery('')
                setStatusFilter('All')
                setCatFilter('All')
                setProvinceFilter('All')
              }}
              style={{
                marginTop: '.75rem',
                fontSize: '.72rem',
                fontWeight: 600,
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                padding: '.4rem .75rem',
                borderRadius: 6,
                background: 'var(--bg-elevated)',
              }}
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="project-grid">
            {filtered.map(p => (
              <div
                key={p.name}
                style={{ position: 'relative' }}
              >
                <Link
                  href={`/projects/${slugify(p.name)}`}
                  className="project-card"
                  style={{ display: 'block', textDecoration: 'none', height: '100%' }}
                >
                  <img src={p.image} alt="" />
                  <div className="project-top">
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.3rem',
                        fontSize: '.62rem',
                        fontWeight: 600,
                        padding: '.2rem .5rem',
                        borderRadius: 20,
                        background: 'var(--bg-sunken)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-light)',
                      }}
                    >
                      <FolderKanban size={11} /> {p.category}
                    </span>
                    <StatusBadge status={p.status} />
                  </div>
                  <h3 style={{ marginTop: '.7rem' }}>{p.name}</h3>
                  <p style={{ marginBottom: '.4rem' }}>
                    {p.ministry} · {p.location}
                  </p>
                  {p.description && (
                    <p
                      style={{
                        fontSize: '.72rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: '.35rem 0 .6rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {p.description}
                    </p>
                  )}
                  <div className="project-progress">
                    <div>
                      <span>Physical progress</span>
                      <strong>{p.progress}%</strong>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${p.progress}%`, background: statusColor(p.status) }} />
                    </div>
                  </div>
                  <div className="project-meta">
                    <span>
                      Budget <strong>{p.budget}</strong>
                      {parseBudgetCr(p.budget) != null && (
                        <span style={{ marginLeft: '.3rem', fontSize: '.62rem', background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', padding: '.12rem .35rem', borderRadius: 20, color: 'var(--text-tertiary)' }}>
                          {parseBudgetCr(p.budget)!.toLocaleString()} Cr
                        </span>
                      )}
                    </span>
                    <span>
                      Spent <strong>{p.spent}</strong>
                      {utilizationPct(p.spent, p.budget) != null && (
                        <span
                          style={{
                            marginLeft: '.3rem',
                            fontSize: '.62rem',
                            fontWeight: 700,
                            padding: '.12rem .35rem',
                            borderRadius: 20,
                            background: utilizationPct(p.spent, p.budget)! > 70 ? 'var(--primary-50)' : utilizationPct(p.spent, p.budget)! > 40 ? 'var(--warning-light)' : 'var(--danger-light)',
                            color: utilizationPct(p.spent, p.budget)! > 70 ? 'var(--primary)' : utilizationPct(p.spent, p.budget)! > 40 ? 'var(--warning)' : 'var(--danger)',
                          }}
                        >
                          {utilizationPct(p.spent, p.budget)}%
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="project-meta">
                    <span>
                      Target <strong>{p.target}</strong>
                    </span>
                    <span>
                      Updated <strong>{p.updated}</strong>
                    </span>
                  </div>
                  {p.gallery && p.gallery.length > 0 && (
                    <div style={{ display: 'flex', gap: 4, marginTop: '.6rem', overflow: 'hidden', borderRadius: 6 }}>
                      {p.gallery.slice(0, 3).map(src => (
                        <img key={src} src={src} alt="" style={{ width: 56, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid var(--border-light)', flexShrink: 0 }} loading="lazy" />
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.7rem', fontSize: '.68rem', color: 'var(--primary)', fontWeight: 600 }}>
                    View details <ChevronRight size={13} />
                  </div>
                </Link>
                <button
                  type="button"
                  aria-label={`Quick preview ${p.name}`}
                  title="Quick preview"
                  onClick={e => {
                    e.preventDefault()
                    setSelected(p)
                  }}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    borderRadius: 6,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,.92)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <Eye size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <DetailDrawer selected={selected} quarter={quarter} onQuarterChange={setQuarter} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
