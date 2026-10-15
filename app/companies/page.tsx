'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronRight, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { DetailDrawer } from '@/components/detail-drawer'
import { CompanyLogo } from '@/components/company-logo'
import { NepseTicker } from '@/components/nepse-panel'
import { companies, slugify, parseBudgetCr } from '@/lib/data'
import type { Company } from '@/lib/types'

const OP_FILTERS = ['All', 'Operating', 'Closed', 'Not yet operational'] as const
const SECTORS = [...new Set(companies.map(c => c.sector))].sort()

type SortKey = 'profit' | 'name' | 'revenue' | 'result' | 'status'

function parseRevenueCr(rev: string): number | null {
  if (!rev || rev === 'Unavailable' || rev === 'N/A') return null
  return parseBudgetCr(rev)
}

function CompaniesContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [opFilter, setOpFilter] = useState<(typeof OP_FILTERS)[number]>('All')
  const [sectorFilter, setSectorFilter] = useState('All')
  const [sortKey, setSortKey] = useState<SortKey>('profit')
  const [sortDir, setSortDir] = useState<1 | -1>(1)
  const [selected, setSelected] = useState<Company | null>(null)
  const [quarter, setQuarter] = useState('Q1')

  const toggleSort = (key: Exclude<SortKey, 'profit'>) => {
    if (sortKey === key) {
      setSortDir(d => (d === 1 ? -1 : 1))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 1 : -1)
    }
  }

  const filtered = useMemo(() => {
    const base = companies.filter(
      x =>
        (opFilter === 'All' || x.operatingStatus === opFilter) &&
        (sectorFilter === 'All' || x.sector === sectorFilter) &&
        `${x.name} ${x.sector}`.toLowerCase().includes(query.toLowerCase())
    )
    const dir = sortDir
    const by: Record<SortKey, (a: Company, b: Company) => number> = {
      profit: (a, b) => (a.resultType === b.resultType ? a.name.localeCompare(b.name) : a.resultType === 'up' ? -1 : 1),
      name: (a, b) => a.name.localeCompare(b.name),
      revenue: (a, b) => (parseRevenueCr(a.revenue) ?? -1) - (parseRevenueCr(b.revenue) ?? -1),
      result: (a, b) => (a.resultType === b.resultType ? a.result.localeCompare(b.result) : a.resultType === 'up' ? -1 : 1),
      status: (a, b) => a.operatingStatus.localeCompare(b.operatingStatus),
    }
    return [...base].sort((a, b) => by[sortKey](a, b) * dir)
  }, [query, opFilter, sectorFilter, sortKey, sortDir])

  const profitableCount = companies.filter(c => c.resultType === 'up').length
  const lossCount = companies.filter(c => c.resultType === 'down').length

  return (
    <div className="content-wrap">
      {/* ── Hero ── */}
      <div className="eco-hero" style={{ background: 'linear-gradient(135deg, #0b3d33 0%, #082b24 60%, #051d18 100%)' }}>
        <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>GOVERNMENT-OWNED COMPANIES</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.05 }}>
          Who runs the nation&apos;s businesses?
        </h1>
        <p style={{ fontSize: '.82rem', opacity: .85, margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          Annual and quarterly disclosures where publicly available. Green is profit, red is loss —
          open a company for quarters, source evidence, and audit notes.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.7rem', fontWeight: 700 }}>
            {filtered.length} of {companies.length} shown
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.7rem', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
            {profitableCount} profit
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.7rem', fontWeight: 700 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
            {lossCount} loss
          </span>
        </div>
        <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: '.7rem', background: 'rgba(255,255,255,.14)' }}>
          <span style={{ width: `${(profitableCount / companies.length) * 100}%`, background: '#34d399' }} />
          <span style={{ flex: 1, background: '#f87171', opacity: .85 }} />
        </div>
      </div>

      <section className="full-panel panel">
        <NepseTicker />

        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
          <label className="search" style={{ maxWidth: '280px' }}>
            <Search size={16} />
            <input
              aria-label="Search companies"
              placeholder="Search by name or sector..."
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
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.68rem' }}>
            Click a column heading to sort
          </span>
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.6rem', flexWrap: 'wrap' }}>
          {OP_FILTERS.map(f => (
            <button key={f} className={opFilter === f ? 'selected' : ''} onClick={() => setOpFilter(f)}>
              {f}
              {f !== 'All' && ` (${companies.filter(c => c.operatingStatus === f).length})`}
            </button>
          ))}
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.4rem', flexWrap: 'wrap' }}>
          <button className={sectorFilter === 'All' ? 'selected' : ''} onClick={() => setSectorFilter('All')}>
            All sectors
          </button>
          {SECTORS.map(s => (
            <button key={s} className={sectorFilter === s ? 'selected' : ''} onClick={() => setSectorFilter(s)}>
              {s}
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
            <p style={{ margin: 0, fontWeight: 600, fontSize: '.85rem' }}>No companies match this filter.</p>
            <p className="muted" style={{ margin: '.3rem 0 0' }}>
              Try adjusting search, operating status, or sector filters.
            </p>
            <button
              onClick={() => {
                setQuery('')
                setOpFilter('All')
                setSectorFilter('All')
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
          <div style={{ overflowX: 'auto', marginTop: '1rem', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-elevated)' }}>
            <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse', fontSize: '.76rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.62rem', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-sunken)' }}>
                  {([
                    ['Company', 'name'],
                    ['Revenue', 'revenue'],
                    ['Net result', 'result'],
                    ['Status', 'status'],
                  ] as [string, Exclude<SortKey, 'profit'>][]).map(([label, key]) => (
                    <th key={key} style={{ padding: '.55rem .7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => toggleSort(key)}
                        aria-label={`Sort by ${label}`}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', color: sortKey === key ? 'var(--accent)' : 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer' }}
                      >
                        {label}
                        <span style={{ fontSize: '.6rem', opacity: sortKey === key ? 1 : .35 }}>
                          {sortKey === key ? (sortDir === 1 ? '▲' : '▼') : '△'}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th style={{ padding: '.55rem .7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => { setSortKey('profit'); setSortDir(1) }}
                      aria-label="Profit first"
                      title="Profitable companies first"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', color: sortKey === 'profit' ? 'var(--accent)' : 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer' }}
                    >
                      Health
                      <span style={{ fontSize: '.6rem', opacity: sortKey === 'profit' ? 1 : .35 }}>▲</span>
                    </button>
                  </th>
                  <th style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const isProfit = c.resultType === 'up'
                  return (
                    <tr
                      key={c.name}
                      onClick={() => router.push(`/companies/${slugify(c.name)}`)}
                      style={{ borderTop: '1px solid var(--border-light)', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-sunken)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '.6rem .7rem' }}>
                        <div className="entity">
                          <CompanyLogo src={c.logo} alt={c.name} size={34} isProfit={isProfit} rounded={8} />
                          <div style={{ minWidth: 0 }}>
                            <strong style={{ display: 'block', fontSize: '.8rem', lineHeight: 1.25 }}>{c.name}</strong>
                            <span className="text-tertiary" style={{ display: 'block', fontSize: '.62rem', marginTop: '.1rem' }}>
                              {c.sector} · {c.year}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '.6rem .7rem', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{c.revenue}</td>
                      <td style={{ padding: '.6rem .7rem' }}>
                        <span
                          className={`${isProfit ? 'positive' : 'negative'} rounded-[20px]`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.28rem', padding: '.22rem .5rem',
                            fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            background: isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
                            border: `1px solid ${isProfit ? 'rgba(13,124,95,.12)' : 'rgba(196,55,58,.12)'}`,
                            lineHeight: 1,
                          }}
                        >
                          {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {c.result}
                        </span>
                      </td>
                      <td style={{ padding: '.6rem .7rem' }}>
                        <StatusBadge status={c.coverage} />
                        <span className="text-tertiary" style={{ display: 'block', fontSize: '.6rem', marginTop: '.2rem' }}>{c.operatingStatus}</span>
                      </td>
                      <td style={{ padding: '.6rem .7rem' }}>
                        <button
                          type="button"
                          aria-label={`Quick preview ${c.name}`}
                          title="Quick preview"
                          onClick={e => {
                            e.stopPropagation()
                            setSelected(c)
                          }}
                          className="bg-sunken text-secondary border border-line-light rounded-[6px]"
                          style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', flexShrink: 0 }}
                        >
                          <Eye size={14} />
                        </button>
                      </td>
                      <td style={{ padding: '.6rem .7rem' }} className="text-tertiary">
                        <ChevronRight size={16} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <DetailDrawer selected={selected} quarter={quarter} onQuarterChange={setQuarter} onClose={() => setSelected(null)} />
      )}
    </div>
  )
}

export default function CompaniesPage() {
  return (
    <Suspense>
      <CompaniesContent />
    </Suspense>
  )
}
