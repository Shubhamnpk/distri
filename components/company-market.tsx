'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Activity, LineChart as LineChartIcon, Building2, MapPin, Phone, FileText } from 'lucide-react'
import { LineChart } from '@/components/charts'
import { StatusBadge } from '@/components/shared'
import {
  fetchNepseStocks, fetchNepseCompanyFinancials, fetchNepseCompanyProfiles,
  fetchNepseIndex, fetchLtpRecent, formatNprAmount, formatNumber, groupReportsByFy, latestAnnualCompanyResult, sortReportsByPeriod,
} from '@/lib/nepse'
import { symbolForCompany } from '@/lib/company-symbols'
import { formatNprOrNA, formatNprText } from '@/lib/currency'
import { formatFiscalYearLabel } from '@/lib/fiscal-year'
import type { NepseStock, NepseCompanyProfile, NepseReport, Company } from '@/lib/types'
import { getCompanyCategory } from '@/lib/company-categories'

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

const CompanyMarketContext = createContext<CompanyMarket | null>(null)

export function CompanyMarketProvider({ companyName, children }: { companyName: string; children: ReactNode }) {
  const market = useCompanyMarket(companyName)
  return <CompanyMarketContext.Provider value={market}>{children}</CompanyMarketContext.Provider>
}

function useCompanyMarketContext() {
  const market = useContext(CompanyMarketContext)
  if (!market) throw new Error('CompanyMarketProvider is required on company detail pages')
  return market
}

export function CompanyFinancialYear({ company }: { company: Company }) {
  const { reports } = useCompanyMarketContext()
  const latest = latestAnnualCompanyResult(reports ?? [])
  return <>{latest?.fy ? `FY ${formatFiscalYearLabel(latest.fy, latest.fyNepali)}` : formatFiscalYearLabel(company.year)}</>
}

export function CompanyLiveResult({ company }: { company: Company }) {
  const { reports, loading } = useCompanyMarketContext()
  const latestAnnual = latestAnnualCompanyResult(reports ?? [])
  const live = !loading && latestAnnual != null
  const profit = live ? latestAnnual.profit : null
  const positive = live ? profit! >= 0 : !/^\s*-/.test(company.result)
  const unknown = !live && company.resultType === 'unknown'
  const tint = unknown ? 'var(--text-secondary)' : positive ? 'var(--primary)' : 'var(--danger)'
  const label = live
    ? `Annual net result · FY ${formatFiscalYearLabel(latestAnnual.fy, latestAnnual.fyNepali)}`
    : `Net result · ${company.year}`
  const value = live ? formatNprAmount(profit) : formatNprOrNA(company.result)

  return <>
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', fontSize: '.62rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: tint }}>
      {unknown ? <FileText size={13} /> : positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />} {label}
    </span>
    <strong style={{ display: 'block', marginTop: '.35rem', fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: tint }}>{value}</strong>
    <span style={{ display: 'block', marginTop: '.35rem', fontSize: '.66rem', color: tint, opacity: .8 }}>
      {live ? `Reported by NEPSE · ${symbolForCompany(company.name)}` : loading ? `Checking latest NEPSE filings · fallback: ${company.source}` : unknown ? 'Result not reported' : positive ? 'Profitable' : company.operatingStatus === 'Closed' ? 'No operations' : 'Loss-making'}
    </span>
  </>
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
          setStock(null)
          setReports(null)
          setNotListed(true)
          return
        }
        setNotListed(false)
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
    const refreshTimer = window.setInterval(() => { void load() }, 60 * 60 * 1000)
    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
    }
  }, [companyName])

  return { stock, reports, profile, history, rank, indexLine, loading, notListed }
}

/** ── Market performance: price, ranges, history, latest filing ── */
export function MarketSection({ market }: { market: CompanyMarket }) {
  const [expanded, setExpanded] = useState(false)
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
        <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>No live NEPSE match</h2>
        <p className="muted" style={{ marginTop: '.4rem' }}>
          No verified symbol currently matches this company in the exact-symbol tracker. It may be unlisted, inactive, or awaiting verification; the MoF annual figures below remain available.
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
  const latestAnnual = latestAnnualCompanyResult(market.reports ?? [])

  return (
    <section className="panel" id="market-performance">
      <p className="eyebrow" style={{ margin: 0 }}>MARKET PERFORMANCE · NEPSE</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem', marginTop: '.4rem', flexWrap: 'wrap' }}>
        <div className={up ? 'bg-primary-50 text-primary rounded-[8px]' : 'bg-red-50 text-red-600 rounded-[8px]'} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.3rem', margin: 0 }}>
            {stock.symbol} · {formatNprAmount(stock.ltp)}
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
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="border border-line-light bg-card text-secondary rounded-md px-2 py-1 text-xs font-semibold">
          {expanded ? 'Hide market details' : 'Show market details'}
        </button>
      </div>

      {expanded && <div>
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
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Latest annual result</span>
          <strong style={{ display: 'block', fontSize: '.8rem', marginTop: '.1rem' }} className={(latestAnnual?.profit ?? 0) >= 0 ? 'positive' : 'negative'}>
            {latestAnnual ? formatNprAmount(latestAnnual.profit) : 'N/A'}
          </strong>
          <span style={{ fontSize: '.62rem' }} className="text-secondary">{latestAnnual ? `FY ${formatFiscalYearLabel(latestAnnual.fy, latestAnnual.fyNepali)} · ${latestAnnual.basis === 'annual' ? 'Annual filing' : 'Q1–Q4 total'}` : 'No full-year filing yet'}</span>
        </div>
      </div>

      {history && (
        <div style={{ marginTop: '.7rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '.25rem' }}>
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }} className="text-tertiary">Price · recent sessions</span>
            <span style={{ fontSize: '.6rem' }} className="text-tertiary">{history[0]?.date} → {history[history.length - 1]?.date}</span>
          </div>
          <LineChart data={history.map(h => ({ year: h.date.slice(5), value: h.close }))} color={up ? 'var(--primary)' : 'var(--danger)'} height={110} formatValue={formatNprAmount} />
          {histMin != null && histMax != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.6rem', marginTop: '.2rem' }} className="text-tertiary">
              <span>Period low {formatNprAmount(histMin)}</span>
              <span>Period high {formatNprAmount(histMax)}</span>
            </div>
          )}
        </div>
      )}
      </div>}
    </section>
  )
}

/** ── Quarterly reports: NEPSE filings first, MoF table as fallback ── */
export function FilingsSection({ market, company }: { market: CompanyMarket; company: Company }) {
  const { reports, loading } = market
  if (loading) return null
  if (company.publicFundFinancials?.length) {
    const metrics = [
      ['Contributions', 'contributions'],
      ['Investment income', 'investmentIncome'],
      ['Total operating income', 'operatingIncome'],
      ['Claims submitted', 'claimsSubmitted'],
      ['Benefits paid', 'benefitsPaid'],
      ['Operating expenses', 'operatingExpenses'],
      ['Annual fund surplus', 'annualSurplus'],
      ['Total assets', 'totalAssets'],
      ['Fund reserves', 'fundReserves'],
    ] as const
    return (
      <section className="panel">
        <p className="eyebrow" style={{ margin: 0 }}>PUBLIC FUND FINANCIALS</p>
        <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Annual fund statements</h2>
        <p className="muted" style={{ marginTop: '.25rem' }}>Fund income, benefits and balances from published annual reports. These are not company revenue or profit.</p>
        <div style={{ marginTop: '.75rem' }}>
          {[...company.publicFundFinancials].reverse().map((annual) => (
            <details key={annual.year} className="border border-line-light rounded-[8px]" style={{ marginTop: '.45rem' }}>
              <summary style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer', listStyle: 'none', padding: '.7rem .8rem', background: 'var(--bg-sunken)' }}>
                <strong style={{ minWidth: 120, fontSize: '.78rem' }}>{annual.year}</strong>
                {annual.operatingIncome && <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Operating income</small><strong>{formatNprOrNA(annual.operatingIncome)}</strong></span>}
                {annual.annualSurplus && <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Fund surplus</small><strong className="positive">{formatNprOrNA(annual.annualSurplus)}</strong></span>}
                {annual.claimsSubmitted && <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Claims submitted</small><strong>{formatNprOrNA(annual.claimsSubmitted)}</strong></span>}
                {annual.totalAssets && <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Total assets</small><strong>{formatNprOrNA(annual.totalAssets)}</strong></span>}
                <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.62rem' }}>Report details</span>
              </summary>
              <div style={{ padding: '.7rem .8rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: '.5rem' }}>
                  {metrics.map(([label, key]) => {
                    const value = annual[key]
                    return value ? <div key={key} className="bg-sunken rounded-[8px]" style={{ padding: '.55rem .65rem' }}>
                      <small className="text-tertiary" style={{ display: 'block', fontSize: '.62rem' }}>{label}</small>
                      <strong style={{ display: 'block', marginTop: '.12rem', fontSize: '.78rem' }}>{formatNprOrNA(value)}</strong>
                    </div> : null
                  })}
                </div>
                {annual.note && <p className="text-secondary" style={{ margin: '.6rem 0 .25rem', fontSize: '.7rem', lineHeight: 1.6 }}>{annual.note}</p>}
                <span className="text-tertiary" style={{ fontSize: '.66rem' }}>Source: {annual.source}</span>
                <a href={annual.sourceUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ marginLeft: '.45rem', fontSize: '.68rem' }}>Open report ↗</a>
              </div>
            </details>
          ))}
        </div>
      </section>
    )
  }
  if (!reports?.length) {
    return (
      <section className="panel">
        <p className="eyebrow" style={{ margin: 0 }}>ANNUAL SUMMARY · COMPANY / MOF DATA</p>
        <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.2rem 0 0' }}>Annual financials</h2>
        <p className="muted" style={{ marginTop: '.25rem' }}>
          {company.annualFinancials?.length ? 'Annual figures come from the linked reports. Expand a year for its source and reporting notes.' : 'No NEPSE filings found. Annual figures are shown first; expand the year only if you need quarter detail.'}
        </p>
        {company.annualFinancials?.length ? (
          <div style={{ marginTop: '.75rem' }}>
            {[...company.annualFinancials].reverse().map((annual) => (
              <details key={annual.year} className="border border-line-light rounded-[8px]" style={{ marginTop: '.45rem' }}>
                <summary style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer', listStyle: 'none', padding: '.7rem .8rem', background: 'var(--bg-sunken)' }}>
                  <strong style={{ minWidth: 150, fontSize: '.78rem' }}>{annual.year}</strong>
                  <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Revenue / income</small><strong>{annual.revenue ?? 'N/A'}</strong></span>
                  <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Net result</small><strong>{annual.result ?? 'N/A'}</strong></span>
                  <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.62rem' }}>Report details</span>
                </summary>
                {(annual.note || annual.source || annual.sourceUrl) && <div style={{ padding: '.65rem .8rem', fontSize: '.7rem', lineHeight: 1.6 }}>
                  {annual.note && <p className="text-secondary" style={{ margin: '0 0 .3rem' }}>{annual.note}</p>}
                  {annual.source && <span className="text-tertiary">Source: {annual.source}</span>}
                  {(annual.sourceUrl || company.sourceUrl) && <a href={annual.sourceUrl || company.sourceUrl} target="_blank" rel="noreferrer" className="text-primary" style={{ marginLeft: '.4rem' }}>Open report ↗</a>}
                </div>}
              </details>
            ))}
          </div>
        ) : (
        <details className="border border-line-light rounded-[8px]" style={{ marginTop: '.75rem' }}>
          <summary style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer', listStyle: 'none', padding: '.7rem .8rem', background: 'var(--bg-sunken)' }}>
            <strong style={{ minWidth: 150, fontSize: '.78rem' }}>FY {formatFiscalYearLabel(company.year)}</strong>
            <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Revenue</small><strong>{formatNprOrNA(company.revenue)}</strong></span>
            <span style={{ display: 'grid', gap: '.12rem', fontSize: '.68rem' }}><small className="text-tertiary">Net result</small><strong>{company.resultType === 'unknown' ? 'N/A' : formatNprOrNA(company.result)}</strong></span>
            <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.62rem' }}>Quarterly details</span>
          </summary>
          <div style={{ overflowX: 'auto', padding: '.25rem .7rem .7rem' }}>
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
              {company.quarters.map(q => (
                <tr key={q.label} className="border-t border-line-light">
                  <td style={{ padding: '.7rem .6rem', fontWeight: 700 }}>{q.label}</td>
                  <td className="text-secondary" style={{ padding: '.7rem .6rem' }}>{formatNprOrNA(q.revenue)}</td>
                  <td style={{ padding: '.7rem .6rem' }}>
                    <span style={{ fontWeight: 600, color: q.result.startsWith('+') || q.result.toLowerCase().includes('profit') || q.result.includes('Dividend') ? 'var(--primary)' : q.result.startsWith('-') || q.result.toLowerCase().includes('loss') ? 'var(--danger)' : 'var(--text)' }}>
                      {formatNprOrNA(q.result)}
                    </span>
                  </td>
                  <td style={{ padding: '.7rem .6rem' }}><StatusBadge status={q.state} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
        )}
      </section>
    )
  }

  const groups = groupReportsByFy(reports)
  const groupsDesc = [...groups].reverse()
  const shortQ = (q: string) => q.replace(' Quarter', 'Q').replace('First', 'Q1').replace('Second', 'Q2').replace('Third', 'Q3').replace('Fourth', 'Q4')
  const yearlyRevenue = (g: (typeof groups)[number]) => {
    if (g.annual?.revenue != null) return formatNprAmount(g.annual.revenue)
    const quarterlyRevenue = g.quarters.map(report => report.revenue)
    if (quarterlyRevenue.length === 4 && quarterlyRevenue.every(value => value != null)) {
      return formatNprAmount(quarterlyRevenue.reduce<number>((sum, value) => sum + (value ?? 0), 0))
    }
    const fiscalLabel = formatFiscalYearLabel(g.fy, g.fyNepali)
    const fiscalBsYear = fiscalLabel.match(/20\d{2}\/\d{2,4}/)?.[0]
    const years = [g.fy, g.fyNepali, fiscalBsYear].filter((year): year is string => !!year)
    return years.some(year => company.year.includes(year)) ? formatNprOrNA(company.revenue) : 'N/A'
  }

  return (
    <section className="panel">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <span className="bg-primary-50 text-primary grid place-items-center rounded-[7px]" style={{ width: 24, height: 24, display: 'grid', placeItems: 'center' }}><LineChartIcon size={12} /></span>
        <p className="eyebrow" style={{ margin: 0 }}>ANNUAL FINANCIALS · NEPSE FILINGS</p>
      </div>
      <h2 className="font-serif" style={{ fontWeight: 500, fontSize: '1.15rem', margin: '.3rem 0 0' }}>
        Yearly results <small style={{ fontSize: '.68rem', fontFamily: 'var(--font)' }} className="text-tertiary">{groupsDesc.length} fiscal years · quarter reports collapsed</small>
      </h2>
      {groupsDesc.map(g => {
        const profitLabel = g.total != null ? formatNprAmount(g.total) : 'N/A'
        return <details key={g.fy} className="border border-line-light rounded-[8px]" style={{ marginTop: '.65rem' }}>
          <summary style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', cursor: 'pointer', listStyle: 'none', padding: '.7rem .8rem', background: 'var(--bg-sunken)' }}>
            <strong style={{ minWidth: 145, fontSize: '.76rem' }}>FY {formatFiscalYearLabel(g.fy, g.fyNepali)}</strong>
            <span style={{ display: 'grid', gap: '.12rem', fontSize: '.67rem' }}><small className="text-tertiary">Revenue</small><strong>{yearlyRevenue(g)}</strong></span>
            <span style={{ display: 'grid', gap: '.12rem', fontSize: '.67rem' }}><small className="text-tertiary">Net result</small><strong className={g.total == null ? 'text-tertiary' : g.total >= 0 ? 'positive' : 'negative'}>{profitLabel}</strong></span>
            <span className="text-tertiary" style={{ marginLeft: 'auto', fontSize: '.61rem' }}>{g.totalBasis === 'annual' ? 'Annual report' : g.totalBasis === 'quarters' ? 'Quarter total' : 'No profit data'} · {g.quarters.length} quarter filings · click to expand</span>
          </summary>
          <div style={{ overflowX: 'auto', padding: '.25rem .7rem .7rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.7rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600 }}>Period</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>Revenue</th>
                <th style={{ padding: '.4rem .6rem', fontWeight: 600, textAlign: 'right' }}>Net result</th>
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
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.revenue != null ? formatNprAmount(r.revenue) : 'N/A'}</td>
                    <td style={{ padding: '.45rem .6rem', fontWeight: 600, color: r.profit == null ? 'var(--text-tertiary)' : pUp ? 'var(--primary)' : 'var(--danger)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.profit != null ? `${pUp ? '▲' : '▼'} ${formatNprAmount(r.profit)}` : 'N/A'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.eps != null ? r.eps.toFixed(2) : 'N/A'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.pe != null ? r.pe.toFixed(1) : 'N/A'}</td>
                    <td style={{ padding: '.45rem .6rem', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{r.net_worth_per_share != null ? r.net_worth_per_share.toFixed(1) : 'N/A'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        </details>
      })}
      <p style={{ margin: '.5rem 0 0', fontSize: '.62rem', lineHeight: 1.5 }} className="text-tertiary">
        Source: NEPSE filings via YONepse. Year profit uses an annual report when available; otherwise it sums reported quarterly profits. Revenue is shown only when the filing or matching company-year record provides it.
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
          getCompanyCategory(company),
          company.operatingStatus,
          stock ? `${stock.symbol} · ${formatNprAmount(stock.ltp)}` : 'Unlisted on NEPSE',
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
  const market = useCompanyMarketContext()
  return (
    <>
      <MarketSection market={market} />
      <FilingsSection market={market} company={company} />
      <CompanyInfoSection company={company} market={market} />
    </>
  )
}
