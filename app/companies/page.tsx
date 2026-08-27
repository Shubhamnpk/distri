'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Search, ChevronRight, TrendingUp, TrendingDown, Eye } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { DetailDrawer } from '@/components/detail-drawer'
import { CompanyLogo } from '@/components/company-logo'
import { NepseTicker } from '@/components/nepse-panel'
import { companies, slugify, parseBudgetCr } from '@/lib/data'
import type { Company } from '@/lib/types'

const OP_FILTERS = ['All', 'Operating', 'Closed', 'Not yet operational'] as const
const SECTORS = [...new Set(companies.map(c => c.sector))].sort()
const COMPANY_SORTS = ['Profit first', 'Name A–Z', 'Revenue ↓', 'Revenue ↑'] as const

function parseRevenueCr(rev: string): number | null {
  if (!rev || rev === 'Unavailable' || rev === 'N/A') return null
  return parseBudgetCr(rev)
}

function CompaniesContent() {
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [opFilter, setOpFilter] = useState<(typeof OP_FILTERS)[number]>('All')
  const [sectorFilter, setSectorFilter] = useState('All')
  const [sort, setSort] = useState<(typeof COMPANY_SORTS)[number]>('Profit first')
  const [selected, setSelected] = useState<Company | null>(null)
  const [quarter, setQuarter] = useState('Q1')

  const filtered = useMemo(() => {
    let base = companies.filter(
      x =>
        (opFilter === 'All' || x.operatingStatus === opFilter) &&
        (sectorFilter === 'All' || x.sector === sectorFilter) &&
        `${x.name} ${x.sector}`.toLowerCase().includes(query.toLowerCase())
    )
    if (sort === 'Name A–Z') return [...base].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'Revenue ↓' || sort === 'Revenue ↑') {
      return [...base].sort((a, b) => {
        const av = parseRevenueCr(a.revenue) ?? -1
        const bv = parseRevenueCr(b.revenue) ?? -1
        return sort === 'Revenue ↓' ? bv - av : av - bv
      })
    }
    // profitable first (stable)
    return [...base].sort((a, b) => {
      if (a.resultType === b.resultType) return 0
      return a.resultType === 'up' ? -1 : 1
    })
  }, [query, opFilter, sectorFilter, sort])

  const profitableCount = companies.filter(c => c.resultType === 'up').length
  const lossCount = companies.filter(c => c.resultType === 'down').length

  return (
    <div className="content-wrap">
      <section className="full-panel panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">GOVERNMENT-OWNED COMPANIES</p>
            <h2>Company financials</h2>
          </div>
          <span className="muted" style={{ fontSize: '.68rem', whiteSpace: 'nowrap' }}>
            {filtered.length} of {companies.length} shown
            <span style={{ marginLeft: '.5rem', display: 'inline-flex', gap: '.35rem', verticalAlign: 'middle' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem', color: 'var(--primary)', fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--primary)', display: 'inline-block' }} />
                {profitableCount} profit
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem', color: 'var(--danger)', fontWeight: 600 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block' }} />
                {lossCount} loss
              </span>
            </span>
          </span>
        </div>
        <p className="section-intro">
          Annual and quarterly disclosures where publicly available. Profit vs loss is colour-coded: green for profit, red for loss. Open a company for quarters, source evidence, and audit notes.
        </p>
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
            aria-label="Sort companies"
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
            {COMPANY_SORTS.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
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
            style={{
              marginTop: '1.5rem',
              padding: '2.5rem 1.5rem',
              textAlign: 'center',
              background: 'var(--bg-sunken)',
              borderRadius: 'var(--radius-lg)',
              border: '1px dashed var(--border)',
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
          <div className="data-table">
            {filtered.map(c => {
              const isProfit = c.resultType === 'up'
              return (
                <Link
                  key={c.name}
                  href={`/companies/${slugify(c.name)}`}
                  className="data-row company-row"
                  style={{
                    gridTemplateColumns: '2.2fr 1fr 1.25fr auto 34px 20px',
                    alignItems: 'center',
                    textDecoration: 'none',
                  }}
                >
                  <div className="entity">
                    <CompanyLogo src={c.logo} alt={c.name} size={36} isProfit={isProfit} rounded={8} />
                    <div style={{ minWidth: 0 }}>
                      <strong style={{ display: 'block', fontSize: '.82rem', lineHeight: 1.2 }}>{c.name}</strong>
                      <span style={{ display: 'block', fontSize: '.64rem', color: 'var(--text-tertiary)', marginTop: '.15rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {c.sector}
                      </span>
                    </div>
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <small style={{ display: 'block', fontSize: '.6rem', color: 'var(--text-tertiary)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
                      Revenue · {c.year}
                    </small>
                    <strong style={{ display: 'block', fontSize: '.78rem', marginTop: '.1rem' }}>{c.revenue}</strong>
                  </div>

                  <div>
                    <small style={{ display: 'block', fontSize: '.6rem', color: 'var(--text-tertiary)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: '.2rem' }}>
                      Net result
                    </small>
                    <span
                      className={isProfit ? 'positive' : 'negative'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '.28rem',
                        padding: '.22rem .5rem',
                        borderRadius: 20,
                        fontSize: '.74rem',
                        fontWeight: 700,
                        letterSpacing: '-.01em',
                        background: isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
                        border: `1px solid ${isProfit ? 'rgba(13,124,95,.12)' : 'rgba(196,55,58,.12)'}`,
                        lineHeight: 1,
                      }}
                    >
                      {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {c.result}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem', alignItems: 'flex-start' }}>
                    <StatusBadge status={c.operatingStatus} />
                  </div>

                  <button
                    type="button"
                    aria-label={`Quick preview ${c.name}`}
                    title="Quick preview"
                    onClick={e => {
                      e.preventDefault()
                      e.stopPropagation()
                      setSelected(c)
                    }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      display: 'grid',
                      placeItems: 'center',
                      background: 'var(--bg-sunken)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-light)',
                      flexShrink: 0,
                    }}
                  >
                    <Eye size={14} />
                  </button>

                  <span style={{ display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)' }}>
                    <ChevronRight size={16} />
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>

      {selected && (
        <DetailDrawer selected={selected} quarter={quarter} onQuarterChange={setQuarter} onClose={() => setSelected(null)} />
      )}
      <style>{`@media (max-width: 900px) {
  .company-row { grid-template-columns: 1.8fr 1.2fr auto 34px 20px !important; }
  .company-row > div:nth-child(2) { display: none !important; }
}
@media (max-width: 600px) {
  .company-row { grid-template-columns: 1fr auto 34px 20px !important; }
  .company-row > div:nth-child(4) { flex-direction: row !important; }
}
@media (max-width: 480px) {
  .company-row > div:nth-child(4) { display: none !important; }
}`}</style>
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
