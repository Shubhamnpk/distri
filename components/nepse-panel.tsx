'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, ExternalLink, Activity, BarChart3 } from 'lucide-react'
import { fetchNepseStocks, fetchNepseMarketSummary, fetchNepseMarketStatus, fetchNepseIndex, fetchUpcomingIpos, formatNprAmount, formatNumber, type NepseUpcomingIpo } from '@/lib/nepse'
import type { NepseIndex, NepseMarketSummary, NepseStock } from '@/lib/types'

export function findMatchingStock(stocks: NepseStock[], companyName: string): NepseStock | null {
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
  const [summary, setSummary] = useState<NepseMarketSummary | null>(null)
  const [isOpen, setIsOpen] = useState<boolean | null>(null)
  const [ipos, setIpos] = useState<NepseUpcomingIpo[]>([])
  const [index, setIndex] = useState<NepseIndex | null>(null)
  const [openRow, setOpenRow] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [s, m, st, ip, ix] = await Promise.all([fetchNepseStocks(), fetchNepseMarketSummary(), fetchNepseMarketStatus(), fetchUpcomingIpos(), fetchNepseIndex()])
        if (cancelled) return
        setStocks(s)
        if (ix && ix.close > 0) setIndex(ix)
        if (ip.length) setIpos(ip.slice(0, 3))
        if (st && typeof st.is_open === 'boolean') setIsOpen(st.is_open)
        if (m) setSummary(m)
      } catch {
        // silent - ticker is supplemental
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div style={{ padding: '.7rem .9rem', fontSize: '.72rem', display: 'flex', alignItems: 'center', gap: '.4rem' }} className="bg-sunken border border-line-light rounded-[10px] text-tertiary">
        <Activity size={13} /> Loading NEPSE live feed…
      </div>
    )
  }
  if (!stocks.length && !summary) return null

  const withMove = stocks.filter(s => (s.percentChange ?? 0) !== 0)
  const gainers = [...withMove].sort((a, b) => (b.percentChange ?? 0) - (a.percentChange ?? 0)).slice(0, 4)
  const losers = [...withMove].sort((a, b) => (a.percentChange ?? 0) - (b.percentChange ?? 0)).slice(0, 4)
  const adv = stocks.filter(s => (s.percentChange ?? 0) > 0).length
  const dec = stocks.filter(s => (s.percentChange ?? 0) < 0).length
  const idxUp = (index?.change ?? 0) >= 0
  const rangePos = index && index.high52 > index.low52
    ? Math.min(100, Math.max(0, ((index.close - index.low52) / (index.high52 - index.low52)) * 100))
    : null

  const moverRow = (g: NepseStock, good: boolean) => {
    const open = openRow === g.symbol
    return (
      <div key={g.symbol}>
        <button
          onClick={() => setOpenRow(open ? null : g.symbol)}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', fontSize: '.7rem', padding: '.42rem .55rem', cursor: 'pointer', border: '1px solid transparent' }}
          className={good ? 'bg-primary-50 rounded-[8px]' : 'bg-danger-light rounded-[8px]'}
          aria-expanded={open}
        >
          <span style={{ textAlign: 'left', minWidth: 0 }}>
            <span style={{ fontWeight: 700, display: 'block' }} className="text-ink">{g.symbol}</span>
            <span style={{ fontSize: '.6rem', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 150 }} className="text-tertiary">{g.companyName}</span>
          </span>
          <span style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '.2rem' }} className={good ? 'text-primary' : 'text-danger'}>
              {good ? <TrendingUp size={11} /> : <TrendingDown size={11} />} {good ? '+' : ''}{(g.percentChange ?? 0).toFixed(2)}%
            </span>
            <span style={{ fontSize: '.62rem', display: 'block' }} className="text-secondary">NPR {g.ltp.toLocaleString()}</span>
          </span>
        </button>
        {open && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.3rem', padding: '.45rem .55rem .55rem', fontSize: '.64rem' }} className="text-secondary">
            {[['Open', g.open], ['High', g.high], ['Low', g.low], ['Close', g.close]].map(([k, v]) => (
              <span key={k as string}>
                <span style={{ display: 'block', fontSize: '.56rem' }} className="text-tertiary">{k}</span>
                <strong className="text-ink">{Number(v).toLocaleString()}</strong>
              </span>
            ))}
            <span style={{ gridColumn: '1 / -1' }} className="text-tertiary">
              Vol {formatNumber(g.volume)} · Turnover {formatNprAmount(g.turnover)}
            </span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '.85rem .95rem', display: 'flex', flexDirection: 'column', gap: '.6rem', marginTop: '.75rem' }} className="bg-card border border-line-light rounded-lg shadow-sm">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase' }} className="text-primary">
          <BarChart3 size={13} /> NEPSE Live
          <span style={{ width: 6, height: 6, background: isOpen === false ? 'var(--text-tertiary)' : 'var(--primary)', boxShadow: `0 0 0 3px ${isOpen === false ? 'var(--bg-sunken)' : 'var(--primary-50)'}`, display: 'inline-block' }} className="rounded-full" />
          {isOpen != null && (
            <span style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: '.06em', padding: '.1rem .45rem', background: isOpen ? 'var(--primary-50)' : 'var(--bg-sunken)', color: isOpen ? 'var(--primary)' : 'var(--text-tertiary)' }} className="rounded-[12px]">
              {isOpen ? 'Open' : 'Closed'}
            </span>
          )}
        </span>
        <a href="https://nepalstock.com" target="_blank" rel="noreferrer" style={{ fontSize: '.66rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '.2rem' }} className="text-primary">
          Official <ExternalLink size={11} />
        </a>
      </div>
      {/* Index hero */}
      {index && (
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '.7rem .8rem' }} className="bg-sunken rounded-[10px]">
          <div>
            <span style={{ fontSize: '.6rem', letterSpacing: '.08em', textTransform: 'uppercase', fontWeight: 700 }} className="text-tertiary">NEPSE Index</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem' }}>
              <strong style={{ fontSize: '1.7rem', letterSpacing: '-.04em', lineHeight: 1.1 }} className="text-ink">{index.close.toFixed(2)}</strong>
              <span style={{ fontSize: '.72rem', fontWeight: 700 }} className={idxUp ? 'text-primary' : 'text-danger'}>
                {idxUp ? '+' : ''}{index.change.toFixed(2)} ({idxUp ? '+' : ''}{index.changePct.toFixed(2)}%)
              </span>
            </div>
          </div>
          {rangePos != null && (
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.58rem', marginBottom: '.3rem' }} className="text-tertiary">
                <span>52W low {index.low52.toFixed(0)}</span>
                <strong className={idxUp ? 'text-primary' : 'text-danger'}>
                  {(((index.close - index.low52) / Math.max(1, index.high52 - index.low52)) * 100).toFixed(0)}% above low
                </strong>
                <span>52W high {index.high52.toFixed(0)}</span>
              </div>
              <div style={{ height: 10, borderRadius: 99, background: 'var(--border-light)', position: 'relative', overflow: 'visible' }}>
                <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${rangePos}%`, borderRadius: 99, background: idxUp ? 'linear-gradient(90deg, var(--primary-50), var(--primary))' : 'linear-gradient(90deg, var(--danger-light), var(--danger))' }} />
                <span style={{ position: 'absolute', left: `calc(${rangePos}% - 8px)`, top: -4, width: 16, height: 16, borderRadius: '50%', background: 'var(--bg-elevated)', border: `3px solid ${idxUp ? 'var(--primary)' : 'var(--danger)'}`, boxShadow: 'var(--shadow-sm)' }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Breadth */}
      {(adv > 0 || dec > 0) && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.62rem', fontWeight: 700, marginBottom: '.25rem' }}>
            <span className="text-primary">▲ {adv} advances</span>
            <span className="text-danger">{dec} declines ▼</span>
          </div>
          <div style={{ display: 'flex', height: 7, borderRadius: 99, overflow: 'hidden', background: 'var(--danger-light)' }}>
            <span style={{ width: `${(adv / Math.max(1, adv + dec)) * 100}%`, background: 'var(--primary)' }} />
          </div>
        </div>
      )}

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: '.5rem' }}>
          <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Turnover</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalTurnover ? formatNprAmount(summary.totalTurnover) : '-'}</strong>
          </div>
          <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Volume</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalVolume ? formatNumber(summary.totalVolume) : '-'}</strong>
          </div>
          <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Transactions</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalTrades ? formatNumber(summary.totalTrades) : '-'}</strong>
          </div>
          <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
            <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Volume</span>
            <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{summary.totalVolume ? formatNumber(summary.totalVolume) : '-'}</strong>
          </div>
          {summary.marketCap ? (
            <div style={{ padding: '.5rem .6rem' }} className="bg-sunken rounded-[8px]">
              <span style={{ fontSize: '.6rem', letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-tertiary">Market cap{summary.scripsTraded ? ` · ${summary.scripsTraded} scrips` : ''}</span>
              <strong style={{ display: 'block', fontSize: '.82rem', marginTop: '.1rem' }}>{formatNprAmount(summary.marketCap)}</strong>
            </div>
          ) : null}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
        <div>
          <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-primary">Top gainers · tap a row</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.35rem' }}>
            {gainers.map(g => moverRow(g, true))}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-danger">Top losers · tap a row</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.25rem', marginTop: '.35rem' }}>
            {losers.map(g => moverRow(g, false))}
          </div>
        </div>
      </div>
      <span style={{ fontSize: '.6rem' }} className="text-tertiary">YONepse / Nepal Stock Exchange · revalidate 1h · supplemental to MoF annual figures</span>
      {ipos.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', flexWrap: 'wrap', padding: '.5rem .6rem' }} className="bg-primary-50 rounded-[8px]">
          <span style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase' }} className="text-primary">IPO pipeline</span>
          {ipos.map(ip => (
            <span key={ip.company} style={{ fontSize: '.68rem' }} className="text-ink">
              <strong>{ip.company}</strong> <span className="text-secondary">· {ip.date_range}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

