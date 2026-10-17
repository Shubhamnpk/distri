'use client'

import { useState, useEffect } from 'react'
import {
  ResponsiveContainer,
  AreaChart as RAreaChart,
  Area,
  LineChart as RLineChart,
  Line,
  BarChart as RBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Tooltip,
} from 'recharts'
import { USD_SYMBOL } from '@/lib/currency'

type DataPoint = { year: string; value: number | null }

function resolveColor(color: string): string {
  if (!color.startsWith('var(')) return color
  const varName = color.replace('var(', '').replace(')', '')
  if (typeof document === 'undefined') return '#6366f1'
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#6366f1'
}

const defaultFormat = (v: number): string => {
  if (Math.abs(v) >= 1e9) return `${USD_SYMBOL}${(v / 1e9).toFixed(1)}B`
  if (Math.abs(v) >= 1e6) return `${USD_SYMBOL}${(v / 1e6).toFixed(0)}M`
  if (Math.abs(v) < 100) return v.toFixed(1) + '%'
  return v.toLocaleString()
}

/** Dark pill tooltip — recharts positions it natively (flips at edges, no viewport math). */
function ChartTip({ active, payload, label, format, base, baseLabel, showDelta }: {
  active?: boolean
  payload?: { value: number | string }[]
  label?: string
  format: (v: number) => string
  base?: number | null
  baseLabel?: string
  showDelta?: boolean
}) {
  if (!active || !payload?.length) return null
  const v = Number(payload[0].value ?? 0)
  let delta: string | null = null
  if (showDelta && base != null && base !== 0) {
    const pct = ((v - base) / Math.abs(base)) * 100
    delta = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}% vs ${baseLabel ?? 'start'}`
  }
  return (
    <div style={{
      background: 'var(--text)',
      color: 'var(--bg)',
      padding: '.35rem .6rem',
      borderRadius: '6px',
      fontSize: '.68rem',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      boxShadow: '0 4px 12px rgba(0,0,0,.15)',
    }}>
      <div>{label}: {format(v)}</div>
      {delta && <div style={{ marginTop: '.15rem', fontWeight: 500, opacity: .7 }}>{delta}</div>}
    </div>
  )
}

/** First non-null point — the baseline for change-from-start readouts. */
function firstPoint(data: DataPoint[]): { value: number; year: string } | null {
  const p = data.find(d => d.value != null)
  return p ? { value: p.value as number, year: p.year } : null
}

function useResolved(color: string) {
  const [resolved, setResolved] = useState(color)
  const [grid, setGrid] = useState('#e5e7eb')
  const [tick, setTick] = useState('#9ca3af')
  const [ink, setInk] = useState('#111827')
  useEffect(() => {
    const nextResolved = resolveColor(color)
    const nextGrid = resolveColor('var(--border-light)')
    const nextTick = resolveColor('var(--text-tertiary)')
    const nextInk = resolveColor('var(--text)')
    setResolved(prev => (prev === nextResolved ? prev : nextResolved))
    setGrid(prev => (prev === nextGrid ? prev : nextGrid))
    setTick(prev => (prev === nextTick ? prev : nextTick))
    setInk(prev => (prev === nextInk ? prev : nextInk))
  }, [color])
  return { resolved, grid, tick, ink }
}

/** Vertical marker for the current year - history left of it, forecast right. */
function NowLine({ refX, refLabel, ink }: { refX: string; refLabel?: string; ink: string }) {
  return (
    <ReferenceLine
      x={refX}
      stroke={ink}
      strokeWidth={1.5}
      strokeDasharray="4,3"
      label={{ value: refLabel ?? refX, position: 'top', fill: ink, fontSize: 8, fontWeight: 700 }}
    />
  )
}

function toRows(data: DataPoint[]) {
  return data.map(d => ({ name: d.year, value: d.value ?? 0 }))
}

/** Show ~7 x labels max so dense series don't crowd the axis. */
function tickInterval(n: number): number | 'preserveStartEnd' {
  return n > 8 ? Math.ceil(n / 7) - 1 : 'preserveStartEnd'
}

/* ─── BAR CHART ─── */
export function BarChart({
  data, color = 'var(--primary)', height = 180, formatValue, title, showDelta = false, yAxis = false, refX, refLabel,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  title?: string
  showDelta?: boolean
  yAxis?: boolean
  refX?: string
  refLabel?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { resolved, grid, tick, ink } = useResolved(color)
  const format = formatValue || defaultFormat
  const first = firstPoint(data)
  if (!data.length) return null
  const rows = toRows(data)

  return (
    <div>
      {title && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '.35rem' }}>{title}</span>}
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} onMouseLeave={() => setActive(null)}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3,3" />
          <XAxis
            dataKey="name"
            tick={{ fill: tick, fontSize: 8 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            tickFormatter={(v: string) => v.slice(2)}
            interval={tickInterval(rows.length)}
            minTickGap={16}
          />
          {yAxis && (
            <YAxis
              width={46}
              tick={{ fill: tick, fontSize: 8 }}
              tickLine={false}
              axisLine={false}
              tickCount={5}
              tickFormatter={format}
            />
          )}
          <Tooltip content={<ChartTip format={format} showDelta={showDelta} base={first?.value} baseLabel={first?.year} />} cursor={{ fill: grid, opacity: 0.35 }} />
          {refX && <NowLine refX={refX} refLabel={refLabel} ink={ink} />}
          <Bar dataKey="value" radius={[3, 3, 0, 0]} onMouseEnter={(_, i) => setActive(i)} isAnimationActive={false}>
            {rows.map((_, i) => (
              <Cell key={i} fill={resolved} fillOpacity={active === null || active === i ? 0.85 : 0.35} />
            ))}
          </Bar>
        </RBarChart>
      </ResponsiveContainer>
    </div>
  )
}

/* ─── LINE / AREA CHART ─── */
export function LineChart({
  data, color = 'var(--primary)', height = 120, formatValue, title, showArea = true, showDelta = false, yAxis = false, refX, refLabel,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  title?: string
  showArea?: boolean
  showDelta?: boolean
  yAxis?: boolean
  refX?: string
  refLabel?: string
}) {
  const { resolved, grid, tick, ink } = useResolved(color)
  const format = formatValue || defaultFormat
  const first = firstPoint(data)
  if (data.length < 2) return null
  const rows = toRows(data)
  const gradId = `lg-${data[0]?.year}-${data[data.length - 1]?.year}-${height}-${color.replace(/[^a-z0-9]/gi, '').slice(0, 5)}`

  const axes = (
    <>
      <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3,3" />
      <XAxis
        dataKey="name"
        tick={{ fill: tick, fontSize: 7.5 }}
        tickLine={false}
        axisLine={false}
        interval={tickInterval(rows.length)}
        minTickGap={24}
      />
      {yAxis && (
        <YAxis
          width={46}
          tick={{ fill: tick, fontSize: 8 }}
          tickLine={false}
          axisLine={false}
          tickCount={5}
          domain={['auto', 'auto']}
          tickFormatter={format}
        />
      )}
      <Tooltip content={<ChartTip format={format} showDelta={showDelta} base={first?.value} baseLabel={first?.year} />} cursor={{ stroke: grid, strokeDasharray: '3,3' }} />
      {refX && <NowLine refX={refX} refLabel={refLabel} ink={ink} />}
    </>
  )

  return (
    <div>
      {title && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '.35rem' }}>{title}</span>}
      <ResponsiveContainer width="100%" height={height}>
        {showArea ? (
          <RAreaChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={resolved} stopOpacity={0.2} />
                <stop offset="100%" stopColor={resolved} stopOpacity={0} />
              </linearGradient>
            </defs>
            {axes}
            <Area type="monotone" dataKey="value" stroke={resolved} strokeWidth={2} fill={`url(#${gradId})`} dot={false} activeDot={{ r: 5, fill: resolved, strokeWidth: 0 }} isAnimationActive={false} />
          </RAreaChart>
        ) : (
          <RLineChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
            {axes}
            <Line type="monotone" dataKey="value" stroke={resolved} strokeWidth={2} dot={false} activeDot={{ r: 5, fill: resolved, strokeWidth: 0 }} isAnimationActive={false} />
          </RLineChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

/* ─── PROGRESS RING ─── */
export function ProgressRing({ value, size = 80, stroke = 6, color = 'var(--primary)', label }: {
  value: number; size?: number; stroke?: number; color?: string; label?: string
}) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '.25rem' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-light)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset .6s ease' }} />
      </svg>
      {label && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{label}</span>}
    </div>
  )
}
