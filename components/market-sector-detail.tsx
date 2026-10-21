'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Activity, ArrowDown, ArrowLeft, ArrowUp, ArrowUpDown, Flame, Search, TrendingDown, TrendingUp } from 'lucide-react'
import { formatNpr, formatNum } from '@/lib/currency'
import { MarketSectorChart } from '@/components/market-sector-chart'
import type { NepseSectorPerformancePoint } from '@/lib/nepse'
import type { NepseStock } from '@/lib/types'

type SortKey = 'symbol' | 'company' | 'ltp' | 'change' | 'high' | 'low' | 'volume' | 'turnover' | 'trades'
type SortState = { key: SortKey; direction: 1 | -1 | 0 }

function columnsLabel(key: SortKey) {
  return ({ symbol: 'Symbol', company: 'Company', ltp: 'LTP', change: 'Change', high: 'High', low: 'Low', volume: 'Volume', turnover: 'Turnover', trades: 'Trades' })[key]
}

function changeText(value: number) {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

function tone(value: number) {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : ''
}

function Movers({ title, icon, rows, direction }: { title: string; icon: 'up' | 'down'; rows: NepseStock[]; direction: 'up' | 'down' }) {
  const Icon = icon === 'up' ? TrendingUp : TrendingDown
  const color = direction === 'up' ? 'var(--accent)' : 'var(--danger)'
  return (
    <section className="panel" style={{ padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.45rem' }}>
        <Icon size={15} style={{ color }} /><h2 style={{ margin: 0, fontSize: '.95rem' }}>{title}</h2>
      </div>
      {rows.length ? rows.map((stock, index) => (
        <Link key={stock.symbol} href={`/market/${stock.symbol}`} style={{ display: 'grid', gridTemplateColumns: '20px minmax(0,1fr) auto', gap: '.5rem', alignItems: 'center', padding: '.5rem .2rem', borderTop: index ? '1px solid var(--border-light)' : 0, color: 'inherit', textDecoration: 'none' }}>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '.58rem' }}>{index + 1}</span>
          <span style={{ minWidth: 0 }}><strong style={{ display: 'block', fontSize: '.7rem' }}>{stock.symbol}</strong><span style={{ display: 'block', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', color: 'var(--text-tertiary)', fontSize: '.58rem' }}>{stock.companyName}</span></span>
          <strong className={tone(stock.percentChange)} style={{ fontSize: '.7rem' }}>{changeText(stock.percentChange)}</strong>
        </Link>
      )) : <p className="muted" style={{ fontSize: '.68rem' }}>No {direction === 'up' ? 'gainers' : 'decliners'} in this session.</p>}
    </section>
  )
}

export function MarketSectorDetail({ sector, rows, marketTurnover, performance }: { sector: string; rows: NepseStock[]; marketTurnover: number; performance: NepseSectorPerformancePoint[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortState>({ key: 'turnover', direction: -1 })

  const sortedRows = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const filtered = rows.filter(stock => !needle || stock.symbol.toLowerCase().includes(needle) || stock.companyName.toLowerCase().includes(needle))
    if (sort.direction === 0) return filtered
    const accessors: Record<SortKey, (stock: NepseStock) => number | string> = {
      symbol: stock => stock.symbol,
      company: stock => stock.companyName,
      ltp: stock => stock.ltp,
      change: stock => stock.percentChange,
      high: stock => stock.high,
      low: stock => stock.low,
      volume: stock => stock.volume,
      turnover: stock => stock.turnover,
      trades: stock => stock.trades ?? 0,
    }
    const get = accessors[sort.key]
    return [...filtered].sort((a, b) => {
      const av = get(a), bv = get(b)
      return (typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv))) * sort.direction
    })
  }, [rows, query, sort])

  const turnover = rows.reduce((sum, stock) => sum + stock.turnover, 0)
  const advances = rows.filter(stock => stock.percentChange > 0).length
  const declines = rows.filter(stock => stock.percentChange < 0).length
  const unchanged = rows.length - advances - declines
  const avgMove = rows.length ? rows.reduce((sum, stock) => sum + stock.percentChange, 0) / rows.length : 0
  const leaders = [...rows].sort((a, b) => b.turnover - a.turnover).slice(0, 5)
  const leaderMax = Math.max(1, leaders[0]?.turnover ?? 0)
  const gainers = rows.filter(stock => stock.percentChange > 0).sort((a, b) => b.percentChange - a.percentChange).slice(0, 5)
  const losers = rows.filter(stock => stock.percentChange < 0).sort((a, b) => a.percentChange - b.percentChange).slice(0, 5)
  const advShare = rows.length ? advances / rows.length * 100 : 0
  const breadthLabel = advShare >= 60 ? 'Broadly advancing' : advShare <= 40 ? 'Broadly declining' : 'Mixed session'
  const breadthColor = advShare >= 60 ? 'var(--accent)' : advShare <= 40 ? 'var(--danger)' : 'var(--text-secondary)'
  const sortName = columnsLabel(sort.key)
  const sortDirection = sort.direction === 0 ? 'default order' : sort.direction === 1 ? (sort.key === 'symbol' || sort.key === 'company' ? 'A to Z' : 'lowest first') : (sort.key === 'symbol' || sort.key === 'company' ? 'Z to A' : 'highest first')

  function toggleSort(key: SortKey) {
    setSort(current => {
      if (current.key !== key) return { key, direction: key === 'symbol' || key === 'company' ? 1 : -1 }
      const text = key === 'symbol' || key === 'company'
      if (current.direction === 0) return { key, direction: text ? 1 : -1 }
      if (text) return { key, direction: current.direction === 1 ? -1 : 0 }
      return { key, direction: current.direction === -1 ? 1 : 0 }
    })
  }

  const columns: { key: SortKey; label: string; text?: boolean }[] = [
    { key: 'symbol', label: 'Symbol', text: true }, { key: 'company', label: 'Company', text: true },
    { key: 'ltp', label: 'LTP' }, { key: 'change', label: 'Change' }, { key: 'high', label: 'High' },
    { key: 'low', label: 'Low' }, { key: 'volume', label: 'Volume' }, { key: 'turnover', label: 'Turnover' }, { key: 'trades', label: 'Trades' },
  ]

  return (
    <div className="content-wrap">
      <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', margin: '1rem 0 .8rem', fontSize: '.68rem', color: 'var(--text-tertiary)' }}>
        <Link href="/market" aria-label="Back to market" style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', color: 'inherit', textDecoration: 'none' }}><ArrowLeft size={14} /> Market</Link><span>/</span><span>{sector}</span>
      </div>

      <section className="sector-hero">
        <div className="sector-hero-title"><div><p className="eyebrow" style={{ marginBottom: '.2rem' }}>NEPSE sector overview</p><h1>{sector}</h1><p className="muted">{rows.length} securities · {marketTurnover ? `${(turnover / marketTurnover * 100).toFixed(1)}% of market turnover` : 'Latest available session'}</p></div><div className="sector-hero-move"><span className="eyebrow">Average move</span><strong className={tone(avgMove)}>{changeText(avgMove)}</strong></div></div>
        <div className="sector-quick-stats"><div><span>Turnover</span><strong>{formatNpr(turnover)}</strong></div><div><span>Volume</span><strong>{formatNum(rows.reduce((sum, stock) => sum + stock.volume, 0))}</strong></div><div><span>Trades</span><strong>{formatNum(rows.reduce((sum, stock) => sum + (stock.trades ?? 0), 0))}</strong></div></div>
      </section>

      <MarketSectorChart sector={sector} history={performance} />

      <div className="sector-overview-grid">
        <section className="panel" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '.75rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '.45rem' }}><Activity size={15} style={{ color: breadthColor }} /><h2 style={{ margin: 0, fontSize: '.95rem' }}>Market breadth</h2></div><strong style={{ color: breadthColor, fontSize: '.7rem' }}>{breadthLabel}</strong></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '.5rem', margin: '.85rem 0 .65rem' }}>
            {[{ label: 'Advancing', value: advances, color: 'var(--accent)' }, { label: 'Unchanged', value: unchanged, color: 'var(--text-secondary)' }, { label: 'Declining', value: declines, color: 'var(--danger)' }].map(item => <div key={item.label} style={{ padding: '.55rem .65rem', borderRadius: 9, background: 'var(--bg-sunken)' }}><span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '.56rem', textTransform: 'uppercase' }}>{item.label}</span><strong style={{ display: 'block', color: item.color, fontSize: '1.05rem' }}>{item.value}</strong></div>)}
          </div>
          <div aria-label={`${advances} advancing, ${unchanged} unchanged, ${declines} declining`} style={{ display: 'flex', height: 9, overflow: 'hidden', borderRadius: 99, background: 'var(--bg-sunken)' }}><span style={{ width: `${advShare}%`, background: 'var(--accent)' }} /><span style={{ width: `${rows.length ? unchanged / rows.length * 100 : 0}%`, background: 'var(--border)' }} /><span style={{ width: `${rows.length ? declines / rows.length * 100 : 0}%`, background: 'var(--danger)' }} /></div>
          <p className="muted" style={{ margin: '.55rem 0 0', fontSize: '.62rem' }}>Breadth reflects listed stocks with a positive, flat or negative session change.</p>
        </section>
        <section className="panel" style={{ padding: '1rem 1.1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.7rem' }}><Flame size={15} style={{ color: 'var(--accent)' }} /><h2 style={{ margin: 0, fontSize: '.95rem' }}>Turnover leaders</h2></div>
          {leaders.map((stock, index) => <Link key={stock.symbol} href={`/market/${stock.symbol}`} style={{ display: 'block', padding: '.42rem .1rem', borderTop: index ? '1px solid var(--border-light)' : 0, color: 'inherit', textDecoration: 'none' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5rem', fontSize: '.67rem' }}><strong>{index + 1}. {stock.symbol}</strong><span>{formatNpr(stock.turnover)}</span></div><div style={{ height: 4, marginTop: '.3rem', borderRadius: 99, background: 'var(--bg-sunken)', overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${stock.turnover / leaderMax * 100}%`, background: 'var(--accent)' }} /></div></Link>)}
        </section>
      </div>

      <div className="lower-grid-3" style={{ marginBottom: '.75rem' }}>
        <Movers title="Top gainers" icon="up" rows={gainers} direction="up" />
        <Movers title="Top decliners" icon="down" rows={losers} direction="down" />
        <section className="panel" style={{ padding: '1rem 1.1rem' }}><div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', marginBottom: '.55rem' }}><Activity size={15} style={{ color: 'var(--text-tertiary)' }} /><h2 style={{ margin: 0, fontSize: '.95rem' }}>Session summary</h2></div><div style={{ display: 'grid', gap: '.6rem', fontSize: '.68rem' }}><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Average move</span><strong className={tone(avgMove)}>{changeText(avgMove)}</strong></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Turnover share</span><strong>{marketTurnover ? `${(turnover / marketTurnover * 100).toFixed(1)}%` : '—'}</strong></div><div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="muted">Advancers / decliners</span><strong><span className="positive">{advances}</span> / <span className="negative">{declines}</span></strong></div></div></section>
      </div>

      <section className="panel" id="constituents" style={{ scrollMarginTop: 90 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.7rem' }}><div><p className="eyebrow" style={{ marginBottom: '.2rem' }}>Sector constituents</p><h2 style={{ margin: 0, fontSize: '1.05rem' }}>All {rows.length} securities</h2><p className="muted">Sort: <strong style={{ color: 'var(--accent)' }}>{sortName} · {sortDirection}</strong>. Click a heading to change order; click the same heading to cycle through both directions and original order.</p></div><label style={{ display: 'flex', alignItems: 'center', gap: '.4rem', border: '1px solid var(--border)', borderRadius: 8, padding: '.45rem .6rem', background: 'var(--bg)' }}><Search size={13} style={{ color: 'var(--text-tertiary)' }} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search symbol or company" aria-label="Search sector stocks" style={{ width: 180, border: 0, outline: 0, background: 'transparent', fontSize: '.68rem' }} /></label></div>
        <div style={{ overflowX: 'auto', marginTop: '.8rem' }}><table style={{ width: '100%', minWidth: 930, borderCollapse: 'collapse', fontSize: '.68rem' }}><thead><tr>{columns.map(column => <th key={column.key} scope="col" style={{ padding: '.5rem .45rem', borderBottom: '1px solid var(--border)', textAlign: column.text ? 'left' : 'right', color: sort.key === column.key ? 'var(--accent)' : 'var(--text-tertiary)', fontSize: '.56rem', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}><button type="button" onClick={() => toggleSort(column.key)} aria-label={`Sort by ${column.label}`} aria-sort={sort.key === column.key ? sort.direction === 0 ? 'none' : sort.direction === 1 ? 'ascending' : 'descending' : 'none'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: column.text ? 'flex-start' : 'flex-end', gap: '.2rem', width: '100%', color: 'inherit', font: 'inherit', cursor: 'pointer' }}>{column.label}{sort.key === column.key && sort.direction !== 0 ? sort.direction === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} /> : <ArrowUpDown size={11} style={{ opacity: .5 }} />}</button></th>)}</tr></thead><tbody>{sortedRows.map(stock => <tr key={stock.symbol} className="market-row"><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', fontWeight: 750 }}><Link href={`/market/${stock.symbol}`} style={{ color: 'inherit', textDecoration: 'none' }}>{stock.symbol}</Link></td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', color: 'var(--text-secondary)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.companyName}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNpr(stock.ltp)}</td><td className={tone(stock.percentChange)} style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right', fontWeight: 700 }}>{changeText(stock.percentChange)}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNpr(stock.high)}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNpr(stock.low)}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNum(stock.volume)}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNpr(stock.turnover)}</td><td style={{ padding: '.55rem .45rem', borderTop: '1px solid var(--border-light)', textAlign: 'right' }}>{formatNum(stock.trades)}</td></tr>)}</tbody></table></div>
        <p className="muted" style={{ margin: '.65rem 0 0', fontSize: '.6rem' }}>{sortedRows.length} of {rows.length} securities · High and low are session values.</p>
      </section>
      <p className="muted" style={{ margin: '.8rem 0 0', fontSize: '.6rem', lineHeight: 1.6 }}>Source: YONepse mirror of NEPSE, refreshed hourly. Session figures can lag the official close. Informational only.</p>
    </div>
  )
}
