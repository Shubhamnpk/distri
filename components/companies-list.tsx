'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ChevronRight, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { DetailDrawer } from '@/components/detail-drawer'
import { CompanyLogo } from '@/components/company-logo'
import { NepseTicker } from '@/components/nepse-panel'
import { companies, slugify } from '@/lib/data'
import { companyProfiles } from '@/lib/company-profiles'
import { COMPANY_CATEGORIES, getCompanyCategory, type CompanyCategory } from '@/lib/company-categories'
import { formatNprAmount } from '@/lib/nepse'
import { formatNprOrNA } from '@/lib/currency'
import { formatFiscalYearLabel } from '@/lib/fiscal-year'
import type { Company } from '@/lib/types'

const OP_FILTERS = ['All', 'Operating', 'Closed'] as const
const RESULT_FILTERS = ['All results', 'Profit', 'Loss', 'Unreported'] as const
export type LatestCompanyFinancial = { profit: number; quarter: string; fy: string; fyNepali?: string; annual: boolean }
type SortKey = 'profit' | 'name' | 'revenue' | 'result' | 'year' | 'status' | 'nepseRank'
type SortDirection = 1 | -1 | 'default'
export type NepseCompanyRank = { rank: number; symbol: string }

function parseFinancialCr(value: string): number | null {
  if (!value || /^(unavailable|n\/a|pending|-|\u2014)$/i.test(value.trim())) return null
  const match = value.trim().match(/^(?:Dividend\s+)?([+-])?\s*(?:(?:NPR|Rs\.?)\s*)?([\d,]+(?:\.\d+)?)\s*(trillion|tn|billion|bn|crore|cr|million|mn|lakh|lac|thousand|k|b|m)?$/i)
  if (!match) return null
  const amount = Number(match[2].replace(/,/g, '')) * (match[1] === '-' ? -1 : 1)
  const unit = (match[3] ?? '').toLowerCase()
  const multiplier = /^(trillion|tn)$/.test(unit) ? 100_000 : /^(billion|bn|b)$/.test(unit) ? 100
    : /^(crore|cr)$/.test(unit) ? 1 : /^(million|mn|m)$/.test(unit) ? 0.1
      : /^(lakh|lac)$/.test(unit) ? 0.01 : /^(thousand|k)$/.test(unit) ? 0.001 : 0.1
  return amount * multiplier
}
function compareAmounts(a: number | null, b: number | null, direction: number) {
  if (a == null || b == null) return a == null ? (b == null ? 0 : 1) : -1
  return (a - b) * direction
}

function getResultType(company: Company, latest?: LatestCompanyFinancial): Company['resultType'] {
  if (latest) return latest.profit >= 0 ? 'up' : 'down'
  const amount = parseFinancialCr(company.result)
  if (amount != null) return amount >= 0 ? 'up' : 'down'
  return company.resultType
}

function CompaniesContent({ latestFinancials, nepseRanks }: { latestFinancials: Record<string, LatestCompanyFinancial>; nepseRanks: Record<string, NepseCompanyRank> }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [opFilter, setOpFilter] = useState<(typeof OP_FILTERS)[number]>('All')
  const [categoryFilter, setCategoryFilter] = useState<'All' | CompanyCategory>('All')
  const [resultFilter, setResultFilter] = useState<(typeof RESULT_FILTERS)[number]>('All results')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('default')
  const [selected, setSelected] = useState<Company | null>(null)
  const [quarter, setQuarter] = useState('Q1')

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key)
      setSortDir(1)
    } else if (sortDir === 1) {
      setSortDir(-1)
    } else if (sortDir === -1) {
      setSortDir('default')
    } else {
      setSortDir(1)
    }
  }

  const filtered = useMemo(() => {
    const base = companies.filter(
      x =>
        (opFilter === 'All' || x.operatingStatus === opFilter) &&
        (categoryFilter === 'All' || getCompanyCategory(x) === categoryFilter) &&
        (resultFilter === 'All results' || getResultType(x, latestFinancials[x.name]) === ({ Profit: 'up', Loss: 'down', Unreported: 'unknown' } as const)[resultFilter]) &&
        `${x.name} ${x.sector} ${getCompanyCategory(x)} ${companyProfiles[x.name]?.ministry ?? ''}`.toLowerCase().includes(query.toLowerCase())
    )
    const dir = sortDir === -1 ? -1 : 1
    const missingLast = (a: string | null, b: string | null) => {
      if (a == null || !a.trim() || /^(?:-|—|n\/a|not reported|unavailable|not applicable)$/i.test(a.trim())) return b == null || !b.trim() || /^(?:-|—|n\/a|not reported|unavailable|not applicable)$/i.test(b.trim()) ? 0 : 1
      if (b == null || !b.trim() || /^(?:-|—|n\/a|not reported|unavailable|not applicable)$/i.test(b.trim())) return -1
      return 0
    }
    const yearValue = (c: Company) => latestFinancials[c.name]?.fy ?? c.year.match(/FY\s*(\d{4}\/\d{2,4})/i)?.[1] ?? c.year.match(/\((20\d{2})/)?.[1] ?? c.year.match(/(20\d{2})/)?.[1] ?? null
    const textCompare = (a: string | null, b: string | null) => missingLast(a, b) || (a == null || b == null ? 0 : a.localeCompare(b, undefined, { numeric: true })) * dir
    const profitRank = (company: Company) => {
      const result = getResultType(company, latestFinancials[company.name])
      return result === 'up' ? 0 : result === 'down' ? 1 : 2
    }
    const stableName = (a: Company, b: Company) => a.name.localeCompare(b.name)
    const by: Record<SortKey, (a: Company, b: Company) => number> = {
      profit: (a, b) => {
        const unknown = profitRank(a) === 2 || profitRank(b) === 2
        if (unknown) return profitRank(a) === profitRank(b) ? stableName(a, b) : profitRank(a) === 2 ? 1 : -1
        return (profitRank(a) - profitRank(b)) * dir || stableName(a, b)
      },
      name: stableName,
      revenue: (a, b) => compareAmounts(parseFinancialCr(a.revenue), parseFinancialCr(b.revenue), dir) || stableName(a, b),
      result: (a, b) => compareAmounts(latestFinancials[a.name]?.profit != null ? latestFinancials[a.name].profit / 1e7 : parseFinancialCr(a.result), latestFinancials[b.name]?.profit != null ? latestFinancials[b.name].profit / 1e7 : parseFinancialCr(b.result), dir) || stableName(a, b),
      year: (a, b) => textCompare(yearValue(a), yearValue(b)) || stableName(a, b),
      nepseRank: (a, b) => compareAmounts(nepseRanks[a.name]?.rank ?? null, nepseRanks[b.name]?.rank ?? null, dir) || stableName(a, b),
      status: (a, b) => textCompare(a.operatingStatus || null, b.operatingStatus || null) || stableName(a, b),
    }
    const activeComparator = sortDir === 'default' ? by.name : by[sortKey]
    return [...base].sort(activeComparator)
  }, [query, opFilter, categoryFilter, resultFilter, sortKey, sortDir, latestFinancials, nepseRanks])

  const annualAmounts = companies.map(company => {
    const liveProfit = latestFinancials[company.name]?.profit
    return liveProfit != null ? liveProfit : (parseFinancialCr(company.result) ?? 0) * 1e7
  })
  const annualProfitTotal = annualAmounts.reduce((sum, amount) => sum + Math.max(0, amount), 0)
  const annualLossTotal = annualAmounts.reduce((sum, amount) => sum + Math.min(0, amount), 0)
  const annualNetTotal = annualProfitTotal + annualLossTotal
  const annualReportedCount = companies.filter(company => latestFinancials[company.name]?.profit != null || parseFinancialCr(company.result) != null).length
  const profitMagnitudePct = annualProfitTotal + Math.abs(annualLossTotal) > 0
    ? (annualProfitTotal / (annualProfitTotal + Math.abs(annualLossTotal))) * 100
    : 50

  return (
    <div className="content-wrap">
      {/* ── Hero ── */}
      <div className="eco-hero" style={{ background: 'linear-gradient(135deg, #0b3d33 0%, #082b24 60%, #051d18 100%)' }}>
        <div className="eco-hero-grid">
          <div>
        <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>STATE-OWNED COMPANIES &amp; STATUTORY PUBLIC FUNDS</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.05 }}>
          Who runs the nation&apos;s businesses?
        </h1>
        <p style={{ fontSize: '.82rem', opacity: .85, margin: 0, maxWidth: 560, lineHeight: 1.6 }}>
          Annual and quarterly disclosures where publicly available. Green is profit, red is loss.
          Open a company for quarters, source evidence, and audit notes.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.7rem', fontWeight: 700 }}>
            {filtered.length} of {companies.length} shown
          </span>
        </div>
          </div>
          <aside aria-label="Aggregate annual company profit and loss" style={{ padding: '1rem 1.1rem', borderRadius: 16, background: 'rgba(0,0,0,.16)', border: '1px solid rgba(255,255,255,.12)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: '.58rem', letterSpacing: '.14em', fontWeight: 700, opacity: .68 }}>LATEST ANNUAL RESULTS</p>
              <strong style={{ display: 'block', fontSize: '1.7rem', lineHeight: 1.15, marginTop: '.3rem', color: annualNetTotal >= 0 ? '#86efac' : '#fca5a5' }}>{formatNprAmount(annualNetTotal)}</strong>
              <span style={{ display: 'block', fontSize: '.62rem', opacity: .72, marginTop: '.15rem' }}>Combined net result across available annual figures</span>
              <div style={{ display: 'grid', gap: '.45rem', marginTop: '.8rem', fontSize: '.68rem' }}>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}><span>Profit total</span><strong style={{ color: '#86efac' }}>{formatNprAmount(annualProfitTotal)}</strong></span>
                <span style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem' }}><span>Loss total</span><strong style={{ color: '#fca5a5' }}>{formatNprAmount(annualLossTotal)}</strong></span>
              </div>
              <div style={{ display: 'flex', height: 7, borderRadius: 99, overflow: 'hidden', marginTop: '.7rem', background: 'rgba(255,255,255,.15)' }} aria-label={`${profitMagnitudePct.toFixed(0)} percent of combined profit and loss magnitude is profit`}>
                <span style={{ width: `${profitMagnitudePct}%`, background: '#4ade80' }} />
                <span style={{ flex: 1, background: '#f87171' }} />
              </div>
              <p style={{ margin: '.5rem 0 0', fontSize: '.57rem', lineHeight: 1.45, opacity: .68 }}>{annualReportedCount} of {companies.length} companies · latest available annual figures; fiscal years vary</p>
            </div>
          </aside>
        </div>
      </div>

      <section className="full-panel panel">
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '.75rem' }}>
          <label className="search" style={{ maxWidth: '280px' }}>
            <Search size={16} />
            <input
              aria-label="Search companies"
              placeholder="Search by name or category..."
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
            Click a heading for ascending, descending, then company-name order
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
          <button className={categoryFilter === 'All' ? 'selected' : ''} onClick={() => setCategoryFilter('All')}>
            All categories
          </button>
          {COMPANY_CATEGORIES.map(category => (
            <button key={category} className={categoryFilter === category ? 'selected' : ''} onClick={() => setCategoryFilter(category)}>
              {category}
            </button>
          ))}
        </div>

        <div className="quarter-tabs" style={{ marginTop: '.4rem', flexWrap: 'wrap' }} aria-label="Filter by net result">
          {RESULT_FILTERS.map(filter => (
            <button key={filter} className={resultFilter === filter ? 'selected' : ''} onClick={() => setResultFilter(filter)}>
              {filter}
              {filter !== 'All results' && ` (${companies.filter(c => getResultType(c, latestFinancials[c.name]) === ({ Profit: 'up', Loss: 'down', Unreported: 'unknown' } as const)[filter]).length})`}
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
              Try adjusting search, operating status, or category filters.
            </p>
            <button
              onClick={() => {
                setQuery('')
                setOpFilter('All')
                setCategoryFilter('All')
                setResultFilter('All results')
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
            <table style={{ width: '100%', minWidth: 930, borderCollapse: 'collapse', fontSize: '.76rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.62rem', letterSpacing: '.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-sunken)' }}>
                  {([
                    ['Company', 'name'],
                    ['Gov NEPSE rank', 'nepseRank'],
                    ['Revenue', 'revenue'],
                    ['Net result · latest annual', 'result'],
                    ['Fiscal year · latest annual', 'year'],
                    ['Status', 'status'],
                  ] as [string, SortKey][]).map(([label, key]) => (
                    <th key={key} style={{ padding: '.55rem .7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => toggleSort(key)}
                        aria-label={`Sort by ${label}`}
                        title={key === 'nepseRank' ? 'Rank among tracked government companies listed on NEPSE by latest daily turnover' : undefined}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', color: sortKey === key ? 'var(--accent)' : 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer' }}
                      >
                        {label}
                        <span style={{ fontSize: '.6rem', opacity: sortKey === key ? 1 : .35 }}>
                          {sortKey === key ? (sortDir === 'default' ? '↕' : sortDir === 1 ? '▲' : '▼') : '↕'}
                        </span>
                      </button>
                    </th>
                  ))}
                  <th style={{ padding: '.55rem .7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => toggleSort('profit')}
                      aria-label="Sort by company financial health"
                      title="Profit, loss, and unreported status; cycles ascending, descending, and default order"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', color: sortKey === 'profit' ? 'var(--accent)' : 'inherit', font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', cursor: 'pointer' }}
                    >
                      Health
                      <span style={{ fontSize: '.6rem', opacity: sortKey === 'profit' ? 1 : .35 }}>{sortKey === 'profit' ? (sortDir === 'default' ? '↕' : sortDir === 1 ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                  <th style={{ width: 40 }} />
                  <th style={{ width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const latest = latestFinancials[c.name]
                  const resultType = getResultType(c, latest)
                  const isProfit = resultType === 'up'
                  const isUnknown = resultType === 'unknown'
                  const resultText = latest ? formatNprAmount(latest.profit) : c.result
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
                              {c.entityType ?? getCompanyCategory(c)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '.6rem .7rem', whiteSpace: 'nowrap' }}>
                        {nepseRanks[c.name] ? <>
                          <strong style={{ display: 'block', fontSize: '.75rem' }}>#{nepseRanks[c.name].rank}</strong>
                          <span className="text-tertiary" style={{ fontSize: '.6rem' }}>{nepseRanks[c.name].symbol}</span>
                        </> : <span className="text-tertiary" style={{ fontSize: '.65rem' }}>Unlisted</span>}
                      </td>
                      <td style={{ padding: '.6rem .7rem', fontWeight: 600, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatNprOrNA(c.revenue)}</td>
                      <td style={{ padding: '.6rem .7rem' }}>
                        <span
                          className={`${isUnknown ? 'text-secondary' : isProfit ? 'positive' : 'negative'} rounded-[20px]`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: '.28rem', padding: '.22rem .5rem',
                            fontSize: '.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                            background: isUnknown ? 'var(--bg-sunken)' : isProfit ? 'var(--primary-50)' : 'var(--danger-light)',
                            border: `1px solid ${isUnknown ? 'var(--border-light)' : isProfit ? 'rgba(13,124,95,.12)' : 'rgba(196,55,58,.12)'}`,
                            lineHeight: 1,
                          }}
                        >
                          {isUnknown ? <Minus size={12} /> : isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                          {isUnknown ? 'N/A' : formatNprOrNA(resultText)}
                        </span>
                        {latest && <span className="text-tertiary" style={{ display: 'block', fontSize: '.58rem', marginTop: '.2rem' }}>
                          {latest.quarter} · FY {formatFiscalYearLabel(latest.fy, latest.fyNepali)} · NEPSE
                        </span>}
                      </td>
                      <td style={{ padding: '.6rem .7rem', fontSize: '.68rem', whiteSpace: 'nowrap' }} className="text-secondary">{latest ? `FY ${formatFiscalYearLabel(latest.fy, latest.fyNepali)}` : formatFiscalYearLabel(c.year)}</td>
                      <td style={{ padding: '.6rem .7rem' }}>
                        <StatusBadge status={c.operatingStatus} />
                      </td>
                      <td style={{ padding: '.6rem .7rem', fontSize: '.68rem', fontWeight: 700, whiteSpace: 'nowrap' }} className={isUnknown ? 'text-secondary' : isProfit ? 'positive' : 'negative'}>
                        {isUnknown ? 'Unreported' : isProfit ? 'Profit' : 'Loss'}
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

export function CompaniesList({ latestFinancials, nepseRanks }: { latestFinancials: Record<string, LatestCompanyFinancial>; nepseRanks: Record<string, NepseCompanyRank> }) {
  return (
    <Suspense>
      <CompaniesContent latestFinancials={latestFinancials} nepseRanks={nepseRanks} />
    </Suspense>
  )
}
