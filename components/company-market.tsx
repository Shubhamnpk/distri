'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Activity, LineChart as LineChartIcon, Building2, MapPin, Phone } from 'lucide-react'
import { LineChart } from '@/components/charts'
import { StatusBadge } from '@/components/shared'
import {
  fetchNepseStocks, fetchNepseCompanyFinancials, fetchNepseCompanyProfiles,
  fetchNepseIndex, fetchLtpRecent, formatNprAmount, formatNumber, groupReportsByFy, sortReportsByPeriod,
} from '@/lib/nepse'
import { symbolForCompany } from '@/lib/company-symbols'
import type { NepseStock, NepseCompanyProfile, NepseReport, Company } from '@/lib/types'

export type CompanyMarket = {
  stock: NepseStock | null
  reports: NepseReport[] | null
  profile: NepseCompanyProfile | null
  history: { date: string; close: number }[] | null
  rank: { byTurnover: number; of: number } | null
  indexLine: string | null
  loading: boolean
  notListed: boolean
}

/** Single NEPSE data load per company: match by name, then filings + profile + index + history. */
export function useCompanyMarket(companyName: string): CompanyMarket {
  const [stock, setStock] = useState<NepseStock | null>(null)
  const [reports, setReports] = useState<NepseReport[] | null>(null)
  const [profile, setProfile] = useState<NepseCompanyProfile | null>(null)
  const [history, setHistory] = useState<{ date: string; close: number }[] | null>(null)
  const [rank, setRank] = useState<{ byTurnover: number; of: number } | null>(null)
  const [indexLine, setIndexLine] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notListed, setNotListed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        // Exact hand-verified symbol only — no fuzzy guessing. Unmapped or
        // delisted companies show MoF figures with no market section.
        const exact = symbolForCompany(companyName)
        if (!exact) {
          setNotListed(true)
          return
        }
        const stocks = await fetchNepseStocks()
        if (cancelled) return
        const hit = stocks.find(s => s.symbol.toUpperCase() === exact)
        if (!hit) {
          setNotListed(true)
          return
        }
        setStock(hit)
        const order = [...stocks].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0))
        const pos = order.findIndex(s => s.symbol === hit.symbol)
        if (pos >= 0) setRank({ byTurnover: pos + 1, of: order.length })
        fetchLtpRecent(hit.symbol).then(h => { if (!cancelled && h.length > 1) setHistory(h) }).catch(() => {})
        try {
          const [allFinancials, allProfiles, ix] = await Promise.all([
            fetchNepseCompanyFinancials(),
            fetchNepseCompanyProfiles(),
            fetchNepseIndex(),
          ])
          if (cancelled) return
          const f = allFinancials.find(x => x.symbol.toLowerCase() === hit.symbol.toLowerCase())
          if (f?.reports.length) setReports(f.reports)
          const p = allProfiles.find(x => x.symbol.toLowerCase() === hit.symbol.toLowerCase()) ?? null
          if (p) setProfile(p)
          if (ix && ix.close > 0) setIndexLine(`NEPSE ${ix.close.toFixed(2)} (${ix.change >= 0 ? '+' : ''}${ix.changePct.toFixed(2)}%)`)
        } catch {
          // filings are supplemental — price display never blocks on them
        }
      } catch {
        if (!cancelled) setNotListed(true)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [companyName])

  return { stock, reports, profile, history, rank, indexLine, loading, notListed }
}

/** ── Market performance: price, ranges, history, latest filing ── */
export function MarketSection({ market }: { market: CompanyMarket }) {
  const { stock, history, rank, indexLine, loading, notListed } = market
  if (loading) {
    return (
      <section className="panel">
        <span style={{ fontSize: '.72rem', display: 'inline-flex', alignItems: 'center', gap: '.35rem' }} className="text-tertiary">
          <Activity size={13} /> Reading live market data…
        </span>
      </section>
    )
  }
  if (notListed || !stock) {
    return (
      <section className="panel">
        <p className="eyebrow" style={{ margin: 0 }}>MARKET PERFORMANCE</p>
        <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Not listed on NEPSE</h2>
        <p className="muted" style={{ marginTop: '.4rem' }}>
          No matching NEPSE symbol found. Many state enterprises are unlisted or trade infrequently —
          the MoF annual figures below are canonical for this company.
        </p>
        <a href="https://nepalstock.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.6rem', fontSize: '.68rem', fontWeight: 600 }} className="text-primary">
          Search NEPSE <ExternalLink size={12} />
        </a>
      </section>
    )
  }

  const up = (stock.percentChange ?? 0) >= 0
  const dayRange = stock.high > stock.low ? Math.min(100, Math.max(0, ((stock.ltp - stock.low) / (stock.high - stock.low)) * 100)) : null
  const histMin = history?.length ? Math.min(...history.map(h => h.close)) : null
  const histMax = history?.length ? Math.max(...history.map(h => h.close)) : null
  const latestRep = [...sortReportsByPeriod(market.reports ?? [])].reverse().find(r => r.profit != null) ?? null

  return (
    <section className="panel">
      <p className="eyebrow" style={{ margin: 0 }}>MARKET PERFORMANCE · NEPSE</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
        <div className={up ? 'bg-primary-50 text-primary rounded-[8px]' : 'bg-red-50 text-red-600 rounded-[8px]'} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.3rem', margin: 0 }}>
            {stock.symbol} · NPR {stock.ltp.toLocaleString()}
          </h2>
          <p className="muted" style={{ margin: '.1rem 0 0' }}>
            {stock.companyName}{rank ? ` · turnover rank #${rank.byTurnover} of ${rank.of}` : ''}{indexLine ? ` · ${indexLine}` : ''}
          </p>
        </div>
        <span style={{ fontSize: '.85rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '.25rem' }} className={up ? 'positive' : 'negative'}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {up ? '+' : ''}{(stock.percentChange ?? 0).toFixed(2)}%
        </span>
        <a href={`https://nepalstock.com/company/${stock.symbol}`} target="_blank" rel="noreferrer" className="bg-primary-50 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold">
          View <ExternalLink size={11} />
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '.5rem', marginTop: '.8rem' }}>
        <div style={{ padding: '.6rem' }} className="bg-sunken rounded-[8px]">
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Day range</span>
          <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.1rem' }}>{stock.low.toLocaleString()} – {stock.high.toLocaleString()}</strong>
          {dayRange != null && (
            <span style={{ display: 'block', height: 5, borderRadius: 99, background: 'var(--border-light)', position: 'relative', marginTop: '.35rem' }}>
              <span style={{ position: 'absolute', left: `calc(${dayRange}% - 5px)`, top: -2.5, width: 10, height: 10, borderRadius: '50%', background: up ? 'var(--primary)' : 'var(--danger)', border: '2px solid var(--bg-elevated)' }} />
            </span>
          )}
        </div>
        <div style={{ padding: '.6rem' }} className="bg-sunken rounded-[8px]">
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Volume / Turnover</span>
          <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.1rem' }}>{formatNumber(stock.volume)}</strong>
          <span style={{ fontSize: '.62rem' }} className="text-secondary">{formatNprAmount(stock.turnover)}</span>
        </div>
        <div style={{ padding: '.6rem' }} className="bg-sunken rounded-[8px]">
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Latest filed profit</span>
          <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.1rem' }} className={(latestRep?.profit ?? 0) >= 0 ? 'positive' : 'negative'}>
            {latestRep?.profit != null ? formatNprAmount(latestRep.profit) : '—'}
          </strong>
          <span style={{ fontSize: '.62rem' }} className="text-secondary">{latestRep ? `${latestRep.quarter} ${latestRep.fy}` : 'No filings yet'}</span>
        </div>
      </div>

      {history && (
        <div style={{ marginTop: '.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.25rem' }}>
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }} className="text-tertiary">Price · recent sessions</span>
            <span style={{ fontSize: '.6rem' }} className="text-tertiary">{history[0]?.date} → {history[history.length - 1]?.date}</span>
          </div>
          <LineChart data={history.map(h => ({ year: h.date.slice(5), value: h.close }))} color={up ? 'var(--primary)' : 'var(--danger)'} height={110} formatValue={v => `NPR ${v.toLocaleString()}`} />
          {histMin != null && histMax != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', marginTop: '.2rem' }} className="text-tertiary">
              <span>Period low NPR {Math.round(histMin).toLocaleString()}</span>
              <span>Period high NPR {Math.round(histMax).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

/** ── Quarterly reports: NEPSE filings first, MoF table as fallback ── */
export function FilingsSection({ market, mofQuarters }: { market: CompanyMarket; mofQuarters: Company['quarters'] }) {
  const { reports, loading } = market
  if (loading) return null
  if (!reports?.length) {
    return (
      <section className="panel">
        <p className="eyebrow" style={{ margin: 0 }}>QUARTERLY BREAKDOWN · MOF REVIEW</p>
        <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Q1–Q4 performance</h2>
        <p className="muted" style={{ marginTop: '.25rem' }}>
          No NEPSE filings found — figures below come from the MoF annual review. Unavailable quarters are marked Pending/Unknown.
        </p>
        <div style={{ marginTop: '.85rem', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.78rem' }}>
            <thead>
              <tr className="text-tertiary" style={{ textAlign: 'left', fontSize: '.68rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                <th className="border-b border-line-light" style={{ padding: '.55rem .6rem', fontWeight: 600 }}>Quarter</th>
                <th className="border-b border-line-light" style={{ padding: '.55rem .6rem', fontWeight: 600 }}>Revenue</th>
                <th className="border-b border-line-light" style={{ padding: '.55rem .6rem', fontWeight: 600 }}>Result</th>
                <th className="border-b border-line-light" style={{ padding: '.55rem .6rem', fontWeight: 600 }}>State</th>
              </tr>
            </thead>
            <tbody>
              {mofQuarters.map(q => (
                <tr key={q.label} className="border-t border-line-light">
                  <td style={{ padding: '.7rem .6rem', fontWeight: 700 }}>{q.label}</td>
                  <td className="text-secondary" style={{ padding: '.7rem .6rem' }}>{q.revenue}</td>
                  <td style={{ padding: '.7rem .6rem' }}>
                    <span style={{ fontWeight: 600, color: q.result.startsWith('+') || q.result.toLowerCase().includes('profit') || q.result.includes('Dividend') ? 'var(--primary)' : q.result.startsWith('-') || q.result.toLowerCase().includes('loss') ? 'var(--danger)' : 'var(--text)' }}>
                      {q.result}
                    </span>
                  </td>
                  <td style={{ padding: '.7rem .6rem' }}><StatusBadge status={q.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    )
  }

  const groups = groupReportsByFy(reports)
  const groupsDesc = [...groups].reverse()
  const totals = groups.filter(g => g.total != null)
  const firstTotal = totals[0]?.total ?? null
  const lastTotal = totals[totals.length - 1]?.total ?? null
  const trendUp = firstTotal != null && lastTotal != null && totals.length > 1 ? lastTotal >= firstTotal : null
  const latestWithNumbers = [...(reports ?? [])].reverse().find(r => r.profit != null || r.eps != null || r.net_worth_per_share != null) ?? null
  const shownGroups = groupsDesc.slice(0, 3)
  const hiddenCount = reports.length - shownGroups.reduce((a, g) => a + g.quarters.length + (g.annual ? 1 : 0), 0)

  const shortQ = (q: string) => q.replace(' Quarter', 'Q').replace('First', 'Q1').replace('Second', 'Q2').replace('Third', 'Q3').replace('Fourth', 'Q4')

  return (
    <section className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <span className="bg-primary-50 text-primary grid place-items-center rounded-[7px]" style={{ width: 24, height: 24, display: 'grid', placeItems: 'center' }}><LineChartIcon size={12} /></span>
        <p className="eyebrow" style={{ margin: 0 }}>QUARTERLY REPORTS · NEPSE FILINGS</p>
        {trendUp !== null && (
          <span className={trendUp ? 'bg-primary-50 text-primary rounded-[20px]' : 'bg-red-50 text-red-600 rounded-[20px]'} style={{ marginLeft: 'auto', fontSize: '.62rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.2rem', padding: '.2rem .45rem' }}>
            {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {trendUp ? 'Profit rising' : 'Profit falling'}
          </span>
        )}
      </div>
      <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.3rem 0 0' }}>
        {reports.length} filings <small style={{ fontSize: '.68rem', fontFamily: 'var(--font)' }} className="text-tertiary">grouped by fiscal year</small>
      </h2>

      {/* Top-header key metrics — latest filed values when available */}
      {latestWithNumbers && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '.45rem', marginTop: '.7rem' }}>
          {[
            { label: 'Net worth / share', val: latestWithNumbers.net_worth_per_share != null ? latestWithNumbers.net_worth_per_share.toFixed(1) : null },
            { label: 'Profit', val: latestWithNumbers.profit != null ? formatNprAmount(latestWithNumbers.profit) : null, accent: (latestWithNumbers.profit ?? 0) >= 0 },
            { label: 'EPS', val: latestWithNumbers.eps != null ? latestWithNumbers.eps.toFixed(2) : null },
          ].filter(m => m.val != null).map(m => (
            <div key={m.label} style={{ padding: '.55rem .65rem', textAlign: 'center' }} className="bg-sunken rounded-[8px]">
              <span style={{ fontSize: '.56rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">{m.label}</span>
              <strong style={{ display: 'block', fontSize: '.95rem', marginTop: '.1rem' }} className={m.accent === undefined ? '' : m.accent ? 'positive' : 'negative'}>{m.val}</strong>
              <span style={{ fontSize: '.58rem' }} className="text-tertiary">{latestWithNumbers.quarter} {latestWithNumbers.fy}</span>
            </div>
          ))}
        </div>
      )}

      {/* Year-over-year story */}
      {totals.length > 1 && (
        <div style={{ display: 'flex', gap: '.45rem', marginTop: '.7rem', overflowX: 'auto', paddingBottom: '.2rem' }}>
          {[...groups].reverse().filter(g => g.total != null).map(g => (
            <div key={g.fy} style={{ flex: '1 0 150px', padding: '.6rem .7rem', border: '1px solid var(--border-light)' }} className="bg-card rounded-[10px]">
              <span style={{ fontSize: '.6rem', fontWeight: 700 }} className="text-tertiary">FY {g.fy}</span>
              <strong style={{ display: 'block', fontSize: '.9rem', marginTop: '.15rem', color: (g.total ?? 0) >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {g.total != null ? formatNprAmount(g.total) : '—'}
              </strong>
              <span style={{ fontSize: '.62rem', fontWeight: 700 }} className={g.yoy == null ? 'text-tertiary' : g.yoy >= 0 ? 'positive' : 'negative'}>
                {g.yoy == null ? (g.totalBasis === 'annual' ? 'Audited annual' : `Sum of quarters`) : `${g.yoy >= 0 ? '+' : ''}${g.yoy.toFixed(1)}% YoY`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Grouped filings */}
      {shownGroups.map(g => (
        <div key={g.fy} style={{ marginTop: '.8rem', overflowX: 'auto' }} className="border border-line-light rounded-[8px]">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', padding: '.5rem .6rem', background: 'var(--bg-sunken)' }}>
            <strong style={{ fontSize: '.74rem' }}>FY {g.fy}</strong>
            {g.total != null && (
              <span style={{ fontSize: '.68rem', fontWeight: 700, color: g.total >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
                {formatNprAmount(g.total)}
              </span>
            )}
            {g.yoy != null && (
              <span style={{ fontSize: '.62rem', fontWeight: 700 }} className={g.yoy >= 0 ? 'positive' : 'negative'}>
                {g.yoy >= 0 ? '▲' : '▼'} {Math.abs(g.yoy).toFixed(1)}% vs prior FY
              </span>
            )}
            <span style={{ marginLeft: 'auto', fontSize: '.58rem' }} className="text-tertiary">
              {g.totalBasis === 'annual' ? 'audited annual' : g.totalBasis === 'quarters' ? `sum of ${g.quarters.length} quarters` : ''}
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.7rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600 }}>Period</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>Profit</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>EPS</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>P/E</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>Net worth/sh</th>
              </tr>
            </thead>
            <tbody>
              {[...(g.annual ? [g.annual] : []), ...g.quarters].map((r, i) => {
                const pUp = (r.profit ?? 0) >= 0
                return (
                  <tr key={`${g.fy}-${r.quarter}-${r.type}-${i}`} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={{ padding: '.45rem .6rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {r.type === 'Annual Report' ? 'Annual' : shortQ(r.quarter)}
                    </td>
                    <td style={{ padding: '.45rem .6rem', fontWeight: 600, color: pUp ? 'var(--primary)' : 'var(--danger)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pUp ? '▲' : '▼'} {r.profit != null ? formatNprAmount(r.profit) : '—'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.eps != null ? r.eps.toFixed(2) : '—'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.pe != null ? r.pe.toFixed(1) : '—'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.net_worth_per_share != null ? r.net_worth_per_share.toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {hiddenCount > 0 && (
        <p style={{ margin: '.5rem 0 0', fontSize: '.62rem' }} className="text-tertiary">+{hiddenCount} older filings — newest 3 fiscal years shown.</p>
      )}
      <p style={{ margin: '.5rem 0 0', fontSize: '.62rem', lineHeight: 1.5 }} className="text-tertiary">
        Source: NEPSE filings via YONepse ({reports.filter(r => r.type === 'Annual Report').length} annual · {reports.filter(r => r.type !== 'Annual Report').length} quarterly). Year totals use audited annuals where filed, else the sum of that year&apos;s quarters.
      </p>
    </section>
  )
}

/** ── Company information: registry profile + every market fact in one place ── */
export function CompanyInfoSection({ company, market }: { company: Company; market: CompanyMarket }) {
  const [expanded, setExpanded] = useState(false)
  const { profile, stock, rank } = market
  const latestRep = [...sortReportsByPeriod(market.reports ?? [])].reverse().find(r => r.profit != null) ?? null
  const about = profile?.profile?.trim() ?? ''
  const long = about.length > 280
  return (
    <section className="panel">
      <p className="eyebrow" style={{ margin: 0 }}>COMPANY INFORMATION</p>
      <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>What this company is</h2>
      {about && (
        <div style={{ marginTop: '.6rem' }}>
          <p className="text-secondary" style={{ fontSize: '.8rem', lineHeight: 1.65, margin: 0 }}>
            {long && !expanded ? `${about.slice(0, 280)}…` : about}
          </p>
          {long && (
            <button onClick={() => setExpanded(!expanded)} style={{ marginTop: '.35rem', color: 'var(--accent)', fontSize: '.7rem', fontWeight: 700 }}>
              {expanded ? 'Show less' : 'Read full profile'}
            </button>
          )}
        </div>
      )}
      {(profile?.address || profile?.phone || profile?.email) && (
        <div style={{ marginTop: '.7rem', display: 'flex', flexDirection: 'column', gap: '.3rem', fontSize: '.72rem' }} className="text-secondary">
          {profile.address && <span style={{ display: 'flex', gap: '.4rem', alignItems: 'flex-start' }}><MapPin size={13} style={{ flexShrink: 0, marginTop: '.15rem' }} /> {profile.address}</span>}
          {(profile.phone || profile.email) && (
            <span style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}><Phone size={13} style={{ flexShrink: 0 }} /> {[profile.phone, profile.email].filter(Boolean).join(' · ')}{profile.contact_person ? ` (${profile.contact_person})` : ''}</span>
          )}
        </div>
      )}
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.8rem' }}>
        {[
          company.sector,
          company.operatingStatus,
          `Coverage: ${company.coverage}`,
          stock ? `${stock.symbol} · NPR ${stock.ltp.toLocaleString()}` : 'Unlisted on NEPSE',
          rank ? `Turnover #${rank.byTurnover}/${rank.of}` : '',
          latestRep?.pe != null ? `P/E ${latestRep.pe.toFixed(1)}` : '',
          latestRep?.eps != null ? `EPS ${latestRep.eps.toFixed(2)}` : '',
          latestRep?.paid_up_capital != null ? `Paid-up ${formatNprAmount(latestRep.paid_up_capital)}` : '',
        ].filter(Boolean).map(chip => (
          <span key={chip as string} style={{ fontSize: '.64rem', padding: '.3rem .55rem', display: 'inline-flex', alignItems: 'center', gap: '.3rem' }} className="bg-sunken rounded-[20px] text-secondary">
            <Building2 size={11} /> {chip}
          </span>
        ))}
      </div>
    </section>
  )
}

/** Client sections for the (server) company detail page. */
export function CompanyMarketSections({ company }: { company: Company }) {
  const market = useCompanyMarket(company.name)
  return (
    <>
      <MarketSection market={market} />
      <FilingsSection market={market} mofQuarters={company.quarters} />
      <CompanyInfoSection company={company} market={market} />
    </>
  )
}
