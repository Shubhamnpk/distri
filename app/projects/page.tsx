'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, FolderKanban, Eye, ChevronRight } from 'lucide-react'
import dynamic from 'next/dynamic'
import { StatusBadge } from '@/components/shared'
import { DetailDrawer } from '@/components/detail-drawer'
import { DistrictDrilldown } from '@/components/district-drilldown'
import { HydroAtlas } from '@/components/hydro-atlas'
import { projects, slugify, parseBudgetCr, utilizationPct, PROVINCES, PROJECT_FX_NOTE, PROJECT_FX_SOURCE } from '@/lib/data'
import { matchDistricts } from '@/lib/geo'
import { fetchWbProjectCount } from '@/lib/api'
import { formatNprText, formatNpr } from '@/lib/currency'

const NepalMapReal = dynamic(() => import('@/components/nepal-map-real').then(m => m.NepalMapReal), {
  ssr: false,
  loading: () => <div className="bg-sunken border border-line-light rounded-lg text-tertiary" style={{ padding: '2rem', textAlign: 'center', fontSize: '.78rem' }}>Loading map…</div>,
})
import type { Project } from '@/lib/types'

const STATUS_FILTERS = ['All', 'Completed', 'On track', 'At risk', 'Delayed'] as const
const CATEGORY_FILTERS = ['All', 'Hydropower', 'Power', 'Highway', 'Airport', 'Irrigation', 'Water', 'Heritage', 'Sports', 'Rail', 'Conservation'] as const
const SORTS = ['Newest', 'Budget ↓', 'Budget ↑', 'Progress ↓', 'Progress ↑', 'Name A-Z'] as const

/** Glass spotlight card: live portfolio totals + the build needing attention. */
function HeroSpotlight({ counts, wbCount }: { counts: { total: number; completed: number; onTrack: number; atRisk: number; delayed: number }; wbCount: number | null }) {
  const budgeted = projects.map(p => parseBudgetCr(p.budget)).filter((v): v is number => v != null)
  const totalCr = budgeted.reduce((a, b) => a + b, 0)
  const totalLabel = formatNpr(totalCr * 1e7)
  const avg = Math.round(projects.reduce((a, p) => a + p.progress, 0) / Math.max(1, projects.length))
  const spotlight = [...projects]
    .filter(p => p.status === 'Delayed' || p.status === 'At risk')
    .sort((a, b) => a.progress - b.progress)[0]
  return (
    <div style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.22)', borderRadius: 16, padding: '1.1rem 1.2rem', backdropFilter: 'blur(10px)' }}>
      <p style={{ margin: 0, fontSize: '.58rem', fontWeight: 700, letterSpacing: '.12em', opacity: .7 }}>PORTFOLIO VALUE TRACKED</p>
      <strong style={{ display: 'block', fontSize: '1.5rem', letterSpacing: '-.03em', marginTop: '.15rem' }}>{totalLabel}</strong>
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '.6rem' }}>
        <span style={{ fontSize: '.7rem' }}><strong>{avg}%</strong> <span style={{ opacity: .7 }}>avg progress</span></span>
        <span style={{ fontSize: '.7rem' }}><strong>{wbCount ?? '—'}</strong> <span style={{ opacity: .7 }}>WB projects</span></span>
      </div>
      {spotlight && (
        <Link
          href={`/projects/${slugify(spotlight.name)}`}
          style={{ display: 'block', marginTop: '.8rem', padding: '.65rem .75rem', borderRadius: 10, background: 'rgba(0,0,0,.25)', textDecoration: 'none', color: '#fff' }}
        >
          <span style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: '.1em', opacity: .7 }}>NEEDS ATTENTION</span>
          <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{spotlight.name}</strong>
          <span style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginTop: '.4rem' }}>
            <span style={{ flex: 1, height: 5, borderRadius: 99, background: 'rgba(255,255,255,.2)', overflow: 'hidden' }}>
              <span style={{ display: 'block', height: '100%', width: `${spotlight.progress}%`, background: '#f87171', borderRadius: 99 }} />
            </span>
            <span style={{ fontSize: '.66rem', fontWeight: 700 }}>{spotlight.progress}%</span>
          </span>
        </Link>
      )}
    </div>
  )
}

export default function ProjectsPage() {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>('All')
  const [catFilter, setCatFilter] = useState<(typeof CATEGORY_FILTERS)[number]>('All')
  const [provinceFilter, setProvinceFilter] = useState<string>('All')
  const [districtFilter, setDistrictFilter] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [sort, setSort] = useState<(typeof SORTS)[number]>('Newest')
  const [selected, setSelected] = useState<Project | null>(null)
  const [quarter, setQuarter] = useState('Q1')
  const [wbCount, setWbCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchWbProjectCount().then(n => { if (!cancelled && n > 0) setWbCount(n) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const selectProvince = (p: string) => {
    setProvinceFilter(p)
    setDistrictFilter(null)
  }

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
        (provinceFilter === 'All' || x.province === provinceFilter) &&
        (districtFilter == null || matchDistricts(`${x.name} ${x.location} ${x.ministry}`).includes(districtFilter)) &&
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
    } else if (sort === 'Name A-Z') {
      out = [...out].sort((a, b) => a.name.localeCompare(b.name))
    }
    return out
  }, [query, statusFilter, catFilter, provinceFilter, districtFilter, sort])

  const isConcreteProvince = (PROVINCES as readonly string[]).includes(provinceFilter)
  const provinceItems = useMemo(
    () => projects.filter(x => x.province === provinceFilter),
    [provinceFilter]
  )

  const counts = {
    total: projects.length,
    onTrack: projects.filter(p => p.status === 'On track').length,
    atRisk: projects.filter(p => p.status === 'At risk').length,
    delayed: projects.filter(p => p.status === 'Delayed').length,
    completed: projects.filter(p => p.status === 'Completed').length,
  }

  return (
    <div className="content-wrap">
      {/* ── Hero ── */}
      <div className="eco-hero" style={{ background: 'linear-gradient(135deg, #9a3412 0%, #7c2d12 55%, #431407 100%)', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: -70, right: -40, width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,.28) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -90, left: '30%', width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,113,113,.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: '1.75rem', alignItems: 'center', position: 'relative' }} className="proj-hero-grid">
          <div>
            <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>NATIONAL DEVELOPMENT · {counts.total} PROJECTS</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.9rem, 3.6vw, 3rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.04 }}>
              Building the nation,<br />project by project.
            </h1>
            <p style={{ fontSize: '.82rem', opacity: .85, margin: 0, maxWidth: 520, lineHeight: 1.6 }}>
              Highways, hydropower, airports and irrigation — physical progress, budgets and evidence for every flagship build.
              {wbCount ? ` Plus ${wbCount} World Bank–financed projects in the portfolio.` : ''}
            </p>
            <div style={{ display: 'flex', gap: '.55rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
              <Link href="/projects/map" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', background: '#fff', color: '#7c2d12', fontSize: '.76rem', fontWeight: 800, padding: '.6rem 1.05rem', borderRadius: 10 }}>
                🗺 Open national map
              </Link>
              <a href="#tracker" style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', border: '1px solid rgba(255,255,255,.4)', color: '#fff', fontSize: '.76rem', fontWeight: 700, padding: '.6rem 1.05rem', borderRadius: 10 }}>
                Browse the list ↓
              </a>
            </div>
          </div>
          <HeroSpotlight counts={counts} wbCount={wbCount} />
        </div>
        <div style={{ display: 'flex', height: 10, borderRadius: 99, overflow: 'hidden', marginTop: '1.25rem', background: 'rgba(255,255,255,.16)', position: 'relative' }}>
          {[
            { count: counts.completed, color: '#4ade80' },
            { count: counts.onTrack, color: '#a7f3d0' },
            { count: counts.atRisk, color: '#fbbf24' },
            { count: counts.delayed, color: '#f87171' },
          ].map((s, i) => (
            <span key={i} style={{ width: `${(s.count / Math.max(1, counts.total)) * 100}%`, background: s.color }} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '.55rem', flexWrap: 'wrap', fontSize: '.68rem', fontWeight: 700, position: 'relative' }}>
          <span>● {counts.completed} completed</span>
          <span>● {counts.onTrack} on track</span>
          <span>● {counts.atRisk} at risk</span>
          <span>● {counts.delayed} delayed</span>
        </div>
      </div>

      <section id="tracker" className="full-panel panel" style={{ scrollMarginTop: 80 }}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">TRACKER</p>
            <h2>Find a project</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem' }}>
            {filtered.length} of {projects.length} shown
          </span>
        </div>
        <p className="muted" style={{ fontSize: '.64rem', margin: '.35rem 0 0', lineHeight: 1.5 }}>
          National Pride figures use the NPC cumulative progress report through FY 2082/83; other majors may use different reporting dates. {PROJECT_FX_NOTE} <a href={PROJECT_FX_SOURCE} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline' }}>Rate source</a>
        </p>

        <div style={{ display: 'flex', gap: '.5rem', marginTop: '.85rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowMap(v => !v)}
            className="border border-line rounded-[8px]"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '.35rem',
              fontSize: '.72rem', fontWeight: 700, padding: '.45rem .75rem',
              background: showMap ? 'var(--accent)' : 'var(--bg-elevated)',
              color: showMap ? '#fff' : 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            {showMap ? '🗺 Hide map' : '🗺 Show map'} {provinceFilter !== 'All' ? `· ${provinceFilter}` : ''}
          </button>
          {provinceFilter !== 'All' && (
            <button onClick={() => selectProvince('All')} className="text-accent bg-accent-light rounded-[6px] border border-accent" style={{ fontSize: '.72rem', fontWeight: 600, padding: '.35rem .6rem', cursor: 'pointer' }}>
              Clear province ✕
            </button>
          )}
        </div>

        {showMap && (
          <div style={{ marginTop: '.75rem' }}>
            <NepalMapReal selected={provinceFilter} onSelect={selectProvince} counts={provinceCounts} />
          </div>
        )}

        {isConcreteProvince && (
          <DistrictDrilldown
            province={provinceFilter}
            items={provinceItems}
            selected={districtFilter}
            onSelect={setDistrictFilter}
          />
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
              className="text-primary bg-primary-50 rounded-[6px]"
              style={{
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.3rem .55rem',
              }}
            >
              Clear
            </button>
          )}
          <select
            aria-label="Sort projects"
            value={sort}
            onChange={e => setSort(e.target.value as typeof sort)}
            className="border border-line bg-card text-secondary rounded-[6px]"
            style={{
              marginLeft: 'auto',
              fontSize: '.72rem',
              fontWeight: 600,
              padding: '.4rem .6rem',
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
            className="bg-sunken rounded-lg border border-dashed border-line"
            style={{
              marginTop: '1.5rem',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
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
                selectProvince('All')
              }}
              className="text-primary bg-card rounded-[6px] border border-primary"
              style={{
                marginTop: '.75rem',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.4rem .75rem',
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
                  <img src={p.image} alt={p.name} />
                  <div className="project-top">
                    <span
                      className="rounded-[20px] bg-sunken text-secondary border border-line-light"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.3rem',
                        fontSize: '.62rem',
                        fontWeight: 600,
                        padding: '.2rem .5rem',
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
                      className="text-secondary"
                      style={{
                        fontSize: '.72rem',
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
                  </div>
                  <div className="project-meta">
                    <span>
                      Budget <strong>{formatNprText(p.budget)}</strong>
                    </span>
                    <span>
                      Spent <strong>{formatNprText(p.spent)}</strong>
                      {utilizationPct(p.spent, p.budget) != null && (
                        <span
                          className="rounded-[20px]"
                          style={{
                            marginLeft: '.3rem',
                            fontSize: '.62rem',
                            fontWeight: 700,
                            padding: '.12rem .35rem',
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
                  {Array.from(new Set([p.image, ...(p.gallery ?? [])])).length > 1 && (
                    <div className="rounded-[6px]" style={{ display: 'flex', gap: 4, marginTop: '.6rem', overflow: 'hidden' }}>
                      {Array.from(new Set([p.image, ...(p.gallery ?? [])])).slice(1, 4).map(src => (
                        <img key={src} src={src} alt="" className="rounded-[4px] border border-line-light" style={{ width: 56, height: 40, objectFit: 'cover', flexShrink: 0 }} loading="lazy" />
                      ))}
                    </div>
                  )}
                  <div className="text-primary" style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginTop: '.7rem', fontSize: '.68rem', fontWeight: 600 }}>
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
                  className="rounded-[6px] text-secondary border border-line shadow-sm"
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    width: 28,
                    height: 28,
                    display: 'grid',
                    placeItems: 'center',
                    background: 'rgba(255,255,255,.92)',
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
      <HydroAtlas />

      {selected && (
        <DetailDrawer selected={selected} quarter={quarter} onQuarterChange={setQuarter} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}
