'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Activity, BarChart3, Building2, LineChartIcon } from 'lucide-react'
import { fetchNepseStocks, fetchNepseMarketSummary, fetchNepseCompanyFinancials, fetchNepseCompanyProfiles, formatNprAmount, formatNumber } from '@/lib/nepse'
import type { NepseStock, NepseCompanyFinancial, NepseCompanyProfile } from '@/lib/types'

function findMatchingStock(stocks: NepseStock[], companyName: string): NepseStock | null {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
  const target = normalize(companyName)
  // split company name into tokens, try symbol or companyName match
  const tokens = companyName.toLowerCase().split(/[\s&]+/).filter(t => t.length > 2)
  // exact symbol match attempts
  const symbolHints: Record<string, string> = {
    'nepal telecom': 'NTC',
    'rastriya banijya bank': 'RBB',
    'citizen investment trust': 'CIT',
    'salt trading corporation': 'STC',
    'nepal electricity authority': 'NEA',
  }
  const hint = Object.entries(symbolHints).find(([k]) => target.includes(normalize(k)))?.[1]
  if (hint) {
    const bySymbol = stocks.find(s => s.symbol.toLowerCase() === hint.toLowerCase())
    if (bySymbol) return bySymbol
  }
  // token match
  for (const t of tokens) {
    const hit = stocks.find(s => s.symbol.toLowerCase() === t || normalize(s.companyName).includes(normalize(t)))
    if (hit && t.length > 3) return hit
  }
  // full phrase contained
  const hit = stocks.find(s => normalize(s.companyName).includes(target.slice(0, 10)) || target.includes(normalize(s.companyName).slice(0, 10)))
  return hit ?? null
}

export function NepseTicker() {
  const [loading, setLoading] = useState(true)
  const [stocks, setStocks] = useState<NepseStock[]>([])
  const [summary, setSummary] = useState<{ marketIndex: number; indexChange: number; totalTurnover: number; totalVolume: number } | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, m] = await Promise.all([fetchNepseStocks(), fetchNepseMarketSummary()])
        if (cancelled) return
        setStocks(s.slice(0, 30))
        if (m) setSummary({ marketIndex: (m as unknown as { marketIndex?: number }).marketIndex ?? 0, indexChange: (m as unknown as { indexChange?: number }).indexChange ?? 0, totalTurnover: (m as unknown as { totalTurnover?: number }).totalTurnover ?? 0, totalVolume: (m as unknown as { totalVolume?: number }).totalVolume ?? 0 })
      } catch {
        // silent — ticker is supplemental
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '.7rem .9rem', background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 10, fontSize: '.72rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <Activity size={13} /> Loading NEPSE live feed…
      </div>
    )
  }
  if (!stocks.length && !summary) return null

  const gainers = [...stocks].sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0)).slice(0, 3)
  const losers = [...stocks].sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0)).slice(0, 3)

  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '.85rem .95rem', display: 'flex', flexDirection: 'column', gap: '.6rem', boxShadow: 'var(--shadow-sm)', marginTop: '.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--primary)' }}>
          <BarChart3 size={13} /> NEPSE Live
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 0 3px var(--primary-50)', display: 'inline-block' }} />
        </span>
        <a href="https://nepalstock.com" target="_blank" rel="noreferrer" style={{ fontSize: '.66rem', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>
          Official <ExternalLink size={11} />
        </a>
      </div>
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '.5rem' }}>
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem .6rem' }}>
            <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>NEPSE Index</span>
            <strong style={{ display: 'block', fontSize: '.92rem', marginTop: '.1rem' }}>{summary.marketIndex ? summary.marketIndex.toFixed(2) : '—'} {summary.indexChange ? <span style={{ fontSize: '.64rem', color: summary.indexChange >= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 600 }}>{summary.indexChange >= 0 ? '+' : ''}{summary.indexChange.toFixed(2)}</span> : null}</strong>
          </div>
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem .6rem' }}>
            <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Turnover</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalTurnover ? formatNprAmount(summary.totalTurnover) : '—'}</strong>
          </div>
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem .6rem' }}>
            <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Volume</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalVolume ? formatNumber(summary.totalVolume) : '—'}</strong>
          </div>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        <div>
          <span style={{ fontSize: '.6rem', color: 'var(--primary)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Top gainers</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.35rem' }}>
            {gainers.map(g => (
              <span key={g.symbol} className="flex justify-between bg-primary-50 text-primary rounded-md px-2 py-1 text-xs">
                <span style={{ fontWeight: 600 }}>{g.symbol}</span>
                <span className="text-primary inline-flex items-center gap-1 font-bold"><TrendingUp size={11} /> +{(g.percentChange ?? 0).toFixed(2)}%</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '.6rem', color: 'var(--danger)', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }}>Top losers</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.35rem' }}>
            {losers.map(g => (
              <span key={g.symbol} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.7rem', background: 'var(--danger-light)', padding: '.3rem .45rem', borderRadius: 6 }}>
                <span style={{ fontWeight: 600 }}>{g.symbol}</span>
                <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}><TrendingDown size={11} /> {(g.percentChange ?? 0).toFixed(2)}%</span>
              </span>
            ))}
          </div>
        </div>
      </div>
      <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>YONepse / Nepal Stock Exchange · revalidate 1h · supplemental to MoF annual figures</span>
    </div>
  )
}

export function CompanyNepseCard({ companyName }: { companyName: string }) {
  const [stock, setStock] = useState<NepseStock | null>(null)
  const [financials, setFinancials] = useState<NepseCompanyFinancial[] | null>(null)
  const [profile, setProfile] = useState<NepseCompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [notListed, setNotListed] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const stocks = await fetchNepseStocks()
        if (cancelled) return
        const hit = findMatchingStock(stocks, companyName)
        if (!hit) {
          setNotListed(true)
          return
        }
        setStock(hit)
        // fetch financials & profile for this symbol — best-effort, never blocks LTP display
        try {
          const [allFinancials, allProfiles] = await Promise.all([fetchNepseCompanyFinancials(), fetchNepseCompanyProfiles()])
          if (cancelled) return
          const f = allFinancials.filter(x => x.symbol.toLowerCase() === hit.symbol.toLowerCase()).sort((a, b) => a.fiscalYear.localeCompare(b.fiscalYear))
          if (f.length) setFinancials(f)
          const p = allProfiles.find(x => x.symbol.toLowerCase() === hit.symbol.toLowerCase()) ?? null
          if (p) setProfile(p)
        } catch {
          // financials are supplemental — keep stock card visible
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

  if (loading) {
    return (
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)' }}>
        <span style={{ fontSize: '.72rem', color: 'var(--text-tertiary)', display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}><Activity size={13} /> Checking NEPSE listing…</span>
      </div>
    )
  }

  if (notListed || !stock) {
    return (
      <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
        <strong style={{ display: 'block', fontSize: '.78rem' }}>Market listing</strong>
        <p style={{ margin: '.35rem 0 0', fontSize: '.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          No matching NEPSE symbol found for <strong>{companyName}</strong>. Many SOEs are unlisted or trade infrequently. Use MoF annual figures as canonical.
        </p>
        <a href="https://nepalstock.com" target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', marginTop: '.6rem', fontSize: '.68rem', fontWeight: 600, color: 'var(--primary)' }}>
          Search NEPSE <ExternalLink size={12} />
        </a>
      </div>
    )
  }

   const up = (stock.percentChange ?? 0) >= 0
  const latestFin = financials?.[financials.length - 1] ?? null
  const firstFin = financials?.[0] ?? null
  const trendUp = latestFin && firstFin ? (latestFin.netIncome ?? 0) >= (firstFin.netIncome ?? 0) : null
  return (
    <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
        <div className={up ? 'bg-primary-50 text-primary' : 'bg-red-50 text-red-600'} style={{ width: 28, height: 28, borderRadius: 8, display: 'grid', placeItems: 'center' }}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: '.82rem' }}>{stock.symbol} · {stock.companyName}</strong>
          <span style={{ fontSize: '.64rem', color: 'var(--text-tertiary)' }}>{stock.sector ?? stock.asset_type} · NEPSE · {profile?.listedDate ? `Listed ${profile.listedDate}` : 'Live price'}</span>
        </div>
        <a href={`https://nepalstock.com/company/${stock.symbol}`} target="_blank" rel="noreferrer" className="bg-primary-50 text-primary inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold">
          View <ExternalLink size={11} />
        </a>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
        <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.6rem' }}>
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>LTP</span>
          <strong style={{ display: 'block', fontSize: '1rem', marginTop: '.1rem' }}>NPR {stock.ltp.toLocaleString()}</strong>
          <span style={{ fontSize: '.68rem', fontWeight: 700, color: up ? 'var(--primary)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>
            {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {up ? '+' : ''}{(stock.percentChange ?? 0).toFixed(2)}%
          </span>
        </div>
        <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.6rem' }}>
          <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Volume / Turnover</span>
          <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{formatNumber(stock.volume)}</strong>
          <span style={{ fontSize: '.62rem', color: 'var(--text-secondary)' }}>{formatNprAmount(stock.turnover)}</span>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.64rem', color: 'var(--text-tertiary)' }}>
        <span>Open {stock.open} · High {stock.high} · Low {stock.low}</span>
        <span>Close {stock.close}</span>
      </div>

      {/* Profile — market context */}
      {profile && (
        <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '.7rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.4rem' }}>
          {[
            { label: 'Market cap', value: profile.marketCap ? formatNprAmount(profile.marketCap) : '—', sub: 'Total value' },
            { label: 'EPS', value: profile.eps != null ? profile.eps.toFixed(2) : '—', sub: `P/E ${profile.peRatio?.toFixed(1) ?? '—'}` },
            { label: 'Book value', value: profile.bookValue != null ? profile.bookValue.toFixed(2) : '—', sub: `Yield ${profile.dividendYield != null ? (profile.dividendYield * 100).toFixed(2) + '%' : '—'}` },
          ].map(c => (
            <div key={c.label} style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem .55rem', textAlign: 'center' }}>
              <span style={{ fontSize: '.58rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>{c.label}</span>
              <strong style={{ display: 'block', fontSize: '.78rem', marginTop: '.1rem' }}>{c.value}</strong>
              <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{c.sub}</span>
            </div>
          ))}
        </div>
      )}

      {/* Financial history — the best use of yonepse */}
      <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.5rem' }}>
          <span className="bg-primary-50 text-primary grid place-items-center" style={{ width: 24, height: 24, borderRadius: 7, display: 'grid', placeItems: 'center' }}><LineChartIcon size={12} /></span>
          <strong style={{ fontSize: '.76rem' }}>Financial history</strong>
          <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', background: 'var(--bg-sunken)', padding: '.15rem .4rem', borderRadius: 20 }}>YONepse · revalidate 1h</span>
          {trendUp !== null && (
            <span className={trendUp ? 'bg-primary-50 text-primary' : 'bg-red-50 text-red-600'} style={{ marginLeft: 'auto', fontSize: '.62rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.2rem', padding: '.2rem .45rem', borderRadius: 20 }}>
              {trendUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {trendUp ? 'Strengthening' : 'Weakening'}
            </span>
          )}
        </div>
        {!financials ? (
          <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.7rem .75rem', fontSize: '.72rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Financial statements not yet published for <strong>{stock.symbol}</strong> in YONepse. Use MoF annual figures above as canonical. Data is shown when the company files audited reports.
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-light)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.7rem' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-sunken)', textAlign: 'left', color: 'var(--text-tertiary)', fontSize: '.62rem', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    <th style={{ padding: '.45rem .5rem', fontWeight: 600, whiteSpace: 'nowrap' }}>Fiscal year</th>
                    <th style={{ padding: '.45rem .5rem', fontWeight: 600 }}>Revenue</th>
                    <th style={{ padding: '.45rem .5rem', fontWeight: 600 }}>Net income</th>
                    <th style={{ padding: '.45rem .5rem', fontWeight: 600 }}>Equity</th>
                    <th style={{ padding: '.45rem .5rem', fontWeight: 600 }}>ROE</th>
                  </tr>
                </thead>
                <tbody>
                  {financials.slice(-5).map(f => {
                    const niUp = f.netIncome >= 0
                    return (
                      <tr key={f.fiscalYear} style={{ borderTop: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '.5rem .5rem', fontWeight: 600, whiteSpace: 'nowrap' }}>{f.fiscalYear}</td>
                        <td style={{ padding: '.5rem .5rem', color: 'var(--text-secondary)' }}>{f.revenue ? formatNprAmount(f.revenue) : '—'}</td>
                        <td style={{ padding: '.5rem .5rem', fontWeight: 600, color: niUp ? 'var(--primary)' : 'var(--danger)', display: 'inline-flex', alignItems: 'center', gap: '.2rem' }}>{niUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {f.netIncome ? formatNprAmount(f.netIncome) : '—'}</td>
                        <td style={{ padding: '.5rem .5rem' }}>{f.equity ? formatNprAmount(f.equity) : '—'}</td>
                        <td style={{ padding: '.5rem .5rem', fontWeight: 600 }}>{typeof f.roe === 'number' ? `${(f.roe > 1 ? f.roe : f.roe * 100).toFixed(1)}%` : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {latestFin && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.4rem', marginTop: '.5rem' }}>
                <div style={{ background: latestFin.netIncome >= 0 ? 'var(--primary-50)' : 'var(--danger-light)', borderRadius: 8, padding: '.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '.58rem', color: latestFin.netIncome >= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Latest profit</span>
                  <strong style={{ display: 'block', fontSize: '.78rem', color: latestFin.netIncome >= 0 ? 'var(--primary)' : 'var(--danger)', marginTop: '.1rem' }}>{formatNprAmount(latestFin.netIncome)}</strong>
                  <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{latestFin.fiscalYear}</span>
                </div>
                <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '.58rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>Revenue</span>
                  <strong style={{ display: 'block', fontSize: '.78rem', marginTop: '.1rem' }}>{formatNprAmount(latestFin.revenue)}</strong>
                  <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>Assets {formatNprAmount(latestFin.totalAssets)}</span>
                </div>
                <div style={{ background: 'var(--bg-sunken)', borderRadius: 8, padding: '.5rem', textAlign: 'center' }}>
                  <span style={{ fontSize: '.58rem', color: 'var(--text-tertiary)', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 600 }}>ROE</span>
                  <strong style={{ display: 'block', fontSize: '.78rem', marginTop: '.1rem' }}>{typeof latestFin.roe === 'number' ? `${(latestFin.roe > 1 ? latestFin.roe : latestFin.roe * 100).toFixed(1)}%` : '—'}</strong>
                  <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>EPS {latestFin.eps?.toFixed(2) ?? '—'}</span>
                </div>
              </div>
            )}
            <p style={{ margin: '.5rem 0 0', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              Source: YONepse / NEPSE audited statements. Compare with MoF <strong>{companyName}</strong> annual result above. NEPSE shows the listed entity, MoF shows the consolidated public-enterprise review. Trend is {trendUp ? 'improving' : 'under pressure'} over {financials.length} fiscal years.
            </p>
          </>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', paddingTop: '.35rem', borderTop: '1px dashed var(--border-light)', fontSize: '.62rem', color: 'var(--text-tertiary)' }}>
        <Building2 size={11} /> Live price updates 1h · financials 24h via YONepse GitHub Pages
      </div>
    </div>
  )
}
