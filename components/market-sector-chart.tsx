'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, LineChart as LineChartIcon } from 'lucide-react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { NepseSectorPerformancePoint } from '@/lib/nepse'

type Range = '1M' | '3M' | '6M' | '1Y'
type ChartRow = NepseSectorPerformancePoint & { sma20: number | null; sma50: number | null }

function movingAverage(points: NepseSectorPerformancePoint[], index: number, period: number): number | null {
  if (index + 1 < period) return null
  const slice = points.slice(index - period + 1, index + 1)
  return slice.reduce((sum, point) => sum + point.value, 0) / period
}

export function MarketSectorChart({ history, sector }: { history: NepseSectorPerformancePoint[]; sector: string }) {
  const [range, setRange] = useState<Range>('1Y')
  const [showSma20, setShowSma20] = useState(true)
  const [showSma50, setShowSma50] = useState(false)
  const [accent, setAccent] = useState('#138568')

  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    if (value) setAccent(value)
  }, [])

  const visibleHistory = useMemo(() => {
    if (!history.length) return []
    const days = range === '1M' ? 30 : range === '3M' ? 90 : range === '6M' ? 183 : 365
    const latest = new Date(`${history[history.length - 1]!.date}T00:00:00Z`)
    latest.setUTCDate(latest.getUTCDate() - days)
    const visible = history.filter(point => point.date >= latest.toISOString().slice(0, 10))
    const baseline = visible[0]?.value ?? 100
    return visible.map(point => ({ ...point, value: (point.value / baseline) * 100 }))
  }, [history, range])

  const data = useMemo<ChartRow[]>(() => visibleHistory.map((point, index) => ({
    ...point,
    sma20: movingAverage(visibleHistory, index, 20),
    sma50: movingAverage(visibleHistory, index, 50),
  })), [visibleHistory])

  const latest = data[data.length - 1]
  const first = data[0]
  const change = first && latest ? ((latest.value - first.value) / first.value) * 100 : 0

  return (
    <section className="panel" style={{ marginBottom: '.75rem', padding: '1rem 1.1rem' }}>
      <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.7rem' }}>
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: '.3rem', marginBottom: '.2rem' }}><LineChartIcon size={12} /> Sector trend</p>
          <h2 style={{ margin: 0, fontSize: '1.05rem' }}>Constituent performance</h2>
          <p className="muted">Equal-weighted, rebased to 100 · not an official sector index</p>
        </div>
        {latest && <div style={{ textAlign: 'right' }}><strong style={{ display: 'block', fontSize: '1.15rem', fontVariantNumeric: 'tabular-nums' }}>{latest.value.toFixed(2)}</strong><span className={change >= 0 ? 'positive' : 'negative'} style={{ fontSize: '.65rem', fontWeight: 700 }}>{change >= 0 ? '+' : ''}{change.toFixed(2)}% over {range}</span></div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginTop: '.8rem' }}>
        <div aria-label="Chart range" style={{ display: 'flex', gap: '.25rem' }}>{(['1M', '3M', '6M', '1Y'] as Range[]).map(item => <button key={item} type="button" onClick={() => setRange(item)} aria-pressed={range === item} style={{ border: '1px solid var(--border-light)', borderRadius: 7, padding: '.28rem .55rem', background: range === item ? 'var(--accent)' : 'var(--bg-sunken)', color: range === item ? '#fff' : 'var(--text-secondary)', fontSize: '.62rem', fontWeight: 700, cursor: 'pointer' }}>{item}</button>)}</div>
        <div aria-label="Technical indicators" style={{ display: 'flex', gap: '.3rem' }}>
          <button type="button" onClick={() => setShowSma20(value => !value)} aria-pressed={showSma20} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid var(--border-light)', borderRadius: 7, padding: '.28rem .5rem', background: showSma20 ? 'var(--bg-elevated)' : 'var(--bg-sunken)', color: 'var(--text-secondary)', fontSize: '.6rem', fontWeight: 700, cursor: 'pointer' }}><span style={{ width: 10, height: 2, background: '#d97706' }} /> SMA 20</button>
          <button type="button" onClick={() => setShowSma50(value => !value)} aria-pressed={showSma50} style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', border: '1px solid var(--border-light)', borderRadius: 7, padding: '.28rem .5rem', background: showSma50 ? 'var(--bg-elevated)' : 'var(--bg-sunken)', color: 'var(--text-secondary)', fontSize: '.6rem', fontWeight: 700, cursor: 'pointer' }}><span style={{ width: 10, height: 2, background: '#7c3aed' }} /> SMA 50</button>
        </div>
      </div>

      {data.length > 1 ? <div style={{ height: 250, marginTop: '.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 2, left: 0 }}>
            <defs><linearGradient id="sector-trend-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={accent} stopOpacity={.2} /><stop offset="100%" stopColor={accent} stopOpacity={0} /></linearGradient></defs>
            <CartesianGrid vertical={false} stroke="var(--border-light)" strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={32} tickFormatter={value => String(value).slice(5)} />
            <YAxis domain={['auto', 'auto']} width={48} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={value => Number(value).toFixed(0)} />
            <Tooltip labelFormatter={label => String(label)} formatter={(value, name) => [Number(value).toFixed(2), String(name)]} contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
            <Area type="monotone" dataKey="value" name={sector} stroke={accent} strokeWidth={2} fill="url(#sector-trend-fill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            {showSma20 && <Line type="monotone" dataKey="sma20" name="SMA 20" stroke="#d97706" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
            {showSma50 && <Line type="monotone" dataKey="sma50" name="SMA 50" stroke="#7c3aed" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div> : <div style={{ height: 180, display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', fontSize: '.7rem' }}><span><Activity size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '.35rem' }} />Sector price history is unavailable.</span></div>}
      <p className="muted" style={{ margin: '.2rem 0 0', fontSize: '.57rem' }}>SMA = simple moving average of the equal-weighted daily constituent series. Source: YONepse monthly price archive.</p>
    </section>
  )
}
