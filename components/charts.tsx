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
  CartesianGrid,
  Tooltip,
} from 'recharts'

type DataPoint = { year: string; value: number | null }

function resolveColor(color: string): string {
  if (!color.startsWith('var(')) return color
  const varName = color.replace('var(', '').replace(')', '')
  if (typeof document === 'undefined') return '#6366f1'
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#6366f1'
}

const defaultFormat = (v: number): string => {
  if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  if (Math.abs(v) < 100) return v.toFixed(1) + '%'
  return v.toLocaleString()
}

/** Dark pill tooltip — recharts positions it natively (flips at edges, no viewport math). */
function ChartTip({ active, payload, label, format }: {
  active?: boolean
  payload?: { value: number | string }[]
  label?: string
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
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
      {label}: {format(Number(payload[0].value ?? 0))}
    </div>
  )
}

function useResolved(color: string) {
  const [resolved, setResolved] = useState(color)
  const [grid, setGrid] = useState('#e5e7eb')
  const [tick, setTick] = useState('#9ca3af')
  useEffect(() => {
    setResolved(resolveColor(color))
    setGrid(resolveColor('var(--border-light)'))
    setTick(resolveColor('var(--text-tertiary)'))
  }, [color])
  return { resolved, grid, tick }
}

function toRows(data: DataPoint[]) {
  return data.map(d => ({ name: d.year, value: d.value ?? 0 }))
}

/* ─── BAR CHART ─── */
export function BarChart({
  data, color = 'var(--primary)', height = 180, formatValue, title,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  title?: string
}) {
  const [active, setActive] = useState<number | null>(null)
  const { resolved, grid, tick } = useResolved(color)
  const format = formatValue || defaultFormat
  if (!data.length) return null

  return (
    <div>
      {title && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '.35rem' }}>{title}</span>}
      <ResponsiveContainer width="100%" height={height}>
        <RBarChart data={toRows(data)} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} onMouseLeave={() => setActive(null)}>
          <CartesianGrid vertical={false} stroke={grid} strokeDasharray="3,3" />
          <XAxis
            dataKey="name"
            tick={{ fill: tick, fontSize: 8 }}
            tickLine={false}
            axisLine={{ stroke: grid }}
            tickFormatter={(v: string) => v.slice(2)}
            interval="preserveStartEnd"
            minTickGap={16}
          />
          <Tooltip content={<ChartTip format={format} />} cursor={{ fill: grid, opacity: 0.35 }} />
          <Bar dataKey="value" radius={[3, 3, 0, 0]} onMouseEnter={(_, i) => setActive(i)} isAnimationActive={false}>
            {toRows(data).map((_, i) => (
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
  data, color = 'var(--primary)', height = 120, formatValue, title, showArea = true,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  title?: string
  showArea?: boolean
}) {
  const { resolved, grid, tick } = useResolved(color)
  const format = formatValue || defaultFormat
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
        interval="preserveStartEnd"
        minTickGap={24}
      />
      <Tooltip content={<ChartTip format={format} />} cursor={{ stroke: grid, strokeDasharray: '3,3' }} />
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
