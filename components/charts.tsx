'use client'

import { useState, useRef, useEffect } from 'react'

type DataPoint = { year: string; value: number | null }

function resolveColor(color: string): string {
  if (!color.startsWith('var(')) return color
  const varName = color.replace('var(', '').replace(')', '')
  if (typeof document === 'undefined') return '#6366f1'
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || '#6366f1'
}

/* ─── INTERACTIVE BAR CHART ─── */
export function BarChart({
  data, color = 'var(--primary)', height = 180, formatValue, title,
}: {
  data: DataPoint[]
  color?: string
  height?: number
  formatValue?: (v: number) => string
  title?: string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement>(null)

  if (!data.length) return null
  const vals = data.map(d => d.value ?? 0)
  const max = Math.max(...vals)
  const min = 0
  const pad = { top: 24, bottom: 24, left: 4, right: 4 }
  const w = 400
  const h = height
  const chartH = h - pad.top - pad.bottom
  const barW = (w - pad.left - pad.right) / data.length

  const format = formatValue || ((v: number) => {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
    if (Math.abs(v) < 100) return v.toFixed(1) + '%'
    return v.toLocaleString()
  })

  return (
    <div style={{ position: 'relative' }}>
      {title && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '.35rem' }}>{title}</span>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: `${h}px`, display: 'block' }}
        onMouseLeave={() => setHovered(null)}
      >
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(pct => (
          <line
            key={pct}
            x1={pad.left} y1={pad.top + chartH * (1 - pct)}
            x2={w - pad.right} y2={pad.top + chartH * (1 - pct)}
            stroke="var(--border-light)" strokeWidth="1" strokeDasharray={pct === 0 ? '0' : '3,3'}
          />
        ))}

        {/* Bars */}
        {data.map((d, i) => {
          const val = d.value ?? 0
          const barH = max ? (val / max) * chartH : 0
          const x = pad.left + i * barW + barW * 0.15
          const bw = barW * 0.7
          const y = pad.top + chartH - barH
          const isHovered = hovered === i

          return (
            <g key={d.year}>
              {/* Invisible hover target */}
              <rect
                x={pad.left + i * barW} y={pad.top}
                width={barW} height={chartH}
                fill="transparent"
                onMouseEnter={(e) => {
                  setHovered(i)
                  const rect = svgRef.current?.getBoundingClientRect()
                  if (rect) {
                    setTooltipPos({
                      x: rect.left + (pad.left + i * barW + barW / 2) / w * rect.width,
                      y: rect.top + (y - 8) / h * rect.height,
                    })
                  }
                }}
                style={{ cursor: 'crosshair' }}
              />
              {/* Bar */}
              <rect
                x={x} y={y} width={bw} height={barH}
                rx="3" ry="3"
                fill={color}
                opacity={hovered === null || isHovered ? 0.85 : 0.35}
                style={{ transition: 'opacity .15s, height .3s ease', transitionDelay: `${i * 30}ms` }}
              />
              {/* Year label */}
              <text
                x={pad.left + i * barW + barW / 2}
                y={h - 4}
                textAnchor="middle"
                fill="var(--text-tertiary)"
                fontSize="8"
                fontFamily="var(--font)"
              >
                {d.year.slice(2)}
              </text>
              {/* Hover value on top */}
              {isHovered && (
                <text
                  x={x + bw / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--text)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="var(--font)"
                >
                  {format(val)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {/* Floating tooltip */}
      {hovered !== null && (
        <div style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--text)',
          color: 'var(--bg)',
          padding: '.35rem .6rem',
          borderRadius: '6px',
          fontSize: '.68rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        }}>
          {data[hovered]?.year}: {format(data[hovered]?.value ?? 0)}
        </div>
      )}
    </div>
  )
}

/* ─── INTERACTIVE LINE CHART ─── */
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
  const [hovered, setHovered] = useState<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [resolved, setResolved] = useState(color)

  useEffect(() => { setResolved(resolveColor(color)) }, [color])

  if (data.length < 2) return null
  const vals = data.map(d => d.value ?? 0)
  const max = Math.max(...vals)
  const min = Math.min(...vals)
  const range = max - min || 1
  const pad = { top: 20, bottom: 20, left: 2, right: 2 }
  const w = 400
  const h = height
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  const points = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * chartW,
    y: pad.top + (1 - ((d.value ?? 0) - min) / range) * chartH,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${points[points.length - 1].x} ${h - pad.bottom} L ${points[0].x} ${h - pad.bottom} Z`

  const format = formatValue || ((v: number) => {
    if (Math.abs(v) >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
    if (Math.abs(v) < 100) return v.toFixed(1) + '%'
    return v.toLocaleString()
  })

  const gradId = `lg-${data[0]?.year}-${data[data.length - 1]?.year}-${height}-${color.replace(/[^a-z0-9]/gi, '').slice(0, 5)}`

  return (
    <div style={{ position: 'relative' }}>
      {title && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)', display: 'block', marginBottom: '.35rem' }}>{title}</span>}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: '100%', height: `${h}px`, display: 'block' }}
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={resolved} stopOpacity=".2" />
            <stop offset="100%" stopColor={resolved} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {[0, 0.5, 1].map(pct => (
          <line key={pct} x1={pad.left} y1={pad.top + chartH * (1 - pct)} x2={w - pad.right} y2={pad.top + chartH * (1 - pct)} stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3,3" />
        ))}

        {/* Area */}
        {showArea && <polygon points={areaD} fill={`url(#${gradId})`} />}

        {/* Line */}
        <path d={pathD} fill="none" stroke={resolved} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Hover targets + dots */}
        {data.map((d, i) => (
          <g key={d.year}>
            <circle
              cx={points[i].x} cy={points[i].y}
              r={hovered === i ? 6 : 0}
              fill="var(--bg-elevated)" stroke={resolved} strokeWidth="2"
              style={{ transition: 'r .15s' }}
            />
            <rect
              x={points[i].x - (chartW / data.length) / 2}
              y={pad.top}
              width={chartW / data.length}
              height={chartH}
              fill="transparent"
              onMouseEnter={(e) => {
                setHovered(i)
                const rect = svgRef.current?.getBoundingClientRect()
                if (rect) {
                  setTooltipPos({
                    x: rect.left + points[i].x / w * rect.width,
                    y: rect.top + (points[i].y - 10) / h * rect.height,
                  })
                }
              }}
              style={{ cursor: 'crosshair' }}
            />
          </g>
        ))}

        {/* Year labels */}
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1).map((d, _, arr) => {
          const i = data.indexOf(d)
          return (
            <text key={d.year} x={points[i].x} y={h - 4} textAnchor="middle" fill="var(--text-tertiary)" fontSize="7.5" fontFamily="var(--font)">
              {d.year}
            </text>
          )
        })}
      </svg>

      {/* Tooltip */}
      {hovered !== null && format(data[hovered]?.value ?? 0) !== '' && (
        <div style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -100%)',
          background: 'var(--text)',
          color: 'var(--bg)',
          padding: '.35rem .6rem',
          borderRadius: '6px',
          fontSize: '.68rem',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,.15)',
        }}>
          {data[hovered]?.year}: {format(data[hovered]?.value ?? 0)}
        </div>
      )}
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
