'use client'

import { useEffect, useState } from 'react'
import { LineChart } from '@/components/charts'
import { fetchBipadGeo, fetchBipadNap, type BipadGeo, type BipadNapPoint, type BipadNapRow } from '@/lib/bipad'

/** Projection splits from the current year: solid = past model run, dashed = forward projection. */
const PROJECT_FROM = new Date().getFullYear()

const NAP_RANGES = [
  { key: 'all', label: '1981–2100', from: 1981, to: 2100 },
  { key: 'near', label: '1981–2050', from: 1981, to: 2050 },
  { key: 'future', label: '2021–2100', from: 2021, to: 2100 },
] as const
type NapRangeKey = typeof NAP_RANGES[number]['key']

const PERIODS = [
  { label: '1981–2010 · observed baseline', from: 1981, to: 2010 },
  { label: '2041–2070 · mid-century', from: 2041, to: 2070 },
  { label: '2071–2100 · end of century', from: 2071, to: 2100 },
]

function periodMean(points: BipadNapPoint[] | undefined, from: number, to: number): number | null {
  const win = (points ?? []).filter(p => p.year >= from && p.year <= to)
  return win.length ? win.reduce((s, p) => s + p.value, 0) / win.length : null
}

/** Compact period label: 1981–85, 2021–25, 2096–2100. */
function periodLabel(from: number, to: number): string {
  return `${from}–${to === 2100 ? '2100' : String(to).slice(2)}`
}

/** 5-year means, split exactly at the current year: the past blocks end at
 *  `PROJECT_FROM - 1`, the projection blocks start at `PROJECT_FROM`. */
function napBins(points: BipadNapPoint[] | undefined, unit: 'temp' | 'rain') {
  const base = periodMean(points, 1981, 2010)
  if (base == null) return []
  const byYear = new Map((points ?? []).map(p => [p.year, p.value]))
  const meanOf = (from: number, to: number) => {
    let sum = 0, n = 0
    for (let y = from; y <= to; y++) { const v = byYear.get(y); if (v != null) { sum += v; n++ } }
    return n ? sum / n : null
  }

  const ranges: [number, number][] = []
  let end = PROJECT_FROM - 1
  while (end >= 1981) {
    const from = Math.max(1981, end - 4)
    ranges.unshift([from, end])
    end = from - 1
  }
  for (let from = PROJECT_FROM; from <= 2100; from += 5) ranges.push([from, Math.min(2100, from + 4)])

  return ranges.map(([from, to]) => {
    const mean = meanOf(from, to)
    const value = mean == null ? null
      : unit === 'temp' ? Number((mean - base).toFixed(2))
      : base !== 0 ? Number((((mean - base) / base) * 100).toFixed(1)) : null
    return { year: String(to), value, from, to, label: periodLabel(from, to) }
  })
}

/** ~7 labels, always including the actual/projection boundary and the last period. */
function napTicks(bins: { from: number; label: string }[]): string[] {
  return bins
    .filter((b, i) => i % 4 === 0 || b.from === PROJECT_FROM || i === bins.length - 1)
    .map(b => b.label)
}

/** Mean for a 30-year window, with the change against the 1981–2010 baseline. */
function periodCell(points: BipadNapPoint[] | undefined, from: number, to: number, unit: 'temp' | 'rain'): string {
  const mean = periodMean(points, from, to)
  if (mean == null) return '—'
  const base = periodMean(points, 1981, 2010)
  const head = unit === 'temp' ? `${mean.toFixed(1)}°C` : `${Math.round(mean)} mm`
  if (from === 1981 || base == null || base === 0) return head
  const delta = unit === 'temp'
    ? `${mean - base >= 0 ? '+' : ''}${(mean - base).toFixed(1)}°C`
    : `${(mean - base) / base >= 0 ? '+' : ''}${(((mean - base) / base) * 100).toFixed(0)}%`
  return `${head} · ${delta}`
}

const TH = { textAlign: 'right' as const, padding: '.45rem .55rem', borderBottom: '1px solid var(--border)', fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase' as const, fontWeight: 700 }
const TD = { padding: '.5rem .55rem', borderBottom: '1px solid var(--border-light)', textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const }

export function ClimatePanel({
  districtId, districtName, picker = false,
}: {
  /** Fixed region (station pages); omit for national. Ignored when `picker` is on. */
  districtId?: number
  districtName?: string
  /** District dropdown + national option (used on /environment). */
  picker?: boolean
}) {
  const [districts, setDistricts] = useState<BipadGeo[]>([])
  const [pick, setPick] = useState<number | ''>(picker ? districtId ?? '' : '')
  const [nap, setNap] = useState<{ temp?: BipadNapRow; precip?: BipadNapRow }>({})
  const [napRcp, setNapRcp] = useState<'rcp45' | 'rcp85'>('rcp45')
  const [napRange, setNapRange] = useState<NapRangeKey>('all')
  const target: number | null = picker ? (pick === '' ? null : pick) : districtId ?? null

  useEffect(() => {
    if (!picker) return
    let cancelled = false
    fetchBipadGeo('district', 100, 'id,title,province')
      .then(d => { if (!cancelled) setDistricts(d.results) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [picker])

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchBipadNap('temperature', target == null ? {} : { district: target }),
      fetchBipadNap('precipitation', target == null ? {} : { district: target }),
    ])
      .then(([t, p]) => { if (!cancelled) setNap({ temp: t.results[0], precip: p.results[0] }) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [target])

  const napTemp = nap.temp?.[napRcp]
  const napPrecip = nap.precip?.[napRcp]
  const napLabel = napRcp === 'rcp45' ? 'RCP4.5' : 'RCP8.5'
  const napName = target == null
    ? 'Nepal'
    : districtName ?? districts.find(d => d.id === target)?.title ?? 'district'

  const range = NAP_RANGES.find(r => r.key === napRange)!
  const shownTemp = napBins(napTemp, 'temp').filter(b => b.from >= range.from && b.to <= range.to)
  const shownPrecip = napBins(napPrecip, 'rain').filter(b => b.from >= range.from && b.to <= range.to)

  return (
    <section className="panel" style={{ marginTop: '.75rem' }}>
      <div className="panel-head" style={{ flexWrap: 'wrap' }}>
        <div>
          <p className="eyebrow">NAP · DOWNSCALED PROJECTIONS · 1981–2100</p>
          <h3>How hot and how wet by the end of the century</h3>
          <p className="muted">
            Annual mean temperature and annual rainfall under two emissions pathways, as published in Nepal&apos;s National Adaptation Plan.
            {target != null && districtName ? ` Shown for the district nearest to this station: ${districtName}.` : ' Pick any district, or the national average.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap', flexShrink: 0 }}>
          {picker && (
            <select value={pick} onChange={e => setPick(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Nepal · national</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          )}
          {(['rcp45', 'rcp85'] as const).map(k => (
            <button
              key={k}
              onClick={() => setNapRcp(k)}
              className={napRcp === k ? 'status-badge status-good' : 'status-badge'}
              style={{ cursor: 'pointer', border: '1px solid var(--border-light)' }}
            >
              {k === 'rcp45' ? 'RCP4.5' : 'RCP8.5'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginTop: '.8rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-tertiary)' }}>Range</span>
        {NAP_RANGES.map(r => (
          <button
            key={r.key}
            onClick={() => setNapRange(r.key)}
            className={napRange === r.key ? 'status-badge status-good' : 'status-badge'}
            style={{ cursor: 'pointer', border: '1px solid var(--border-light)' }}
          >
            {r.label}
          </button>
        ))}
      </div>

      {nap.temp || nap.precip ? (
        <>
          <div className="feature-grid" style={{ marginTop: '.9rem' }}>
            <div>
              <LineChart
                data={shownTemp}
                color="var(--danger)"
                height={130}
                forecastFrom={PROJECT_FROM}
                xTicks={napTicks(shownTemp)}
                title={`${napName} · temperature change vs 1981–2010 · °C · ${napLabel} · 5-yr mean`}
                formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°C`}
              />
            </div>
            <div>
              <LineChart
                data={shownPrecip}
                color="var(--primary)"
                height={130}
                forecastFrom={PROJECT_FROM}
                xTicks={napTicks(shownPrecip)}
                title={`${napName} · rainfall change vs 1981–2010 · % · ${napLabel} · 5-yr mean`}
                formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '.5rem', fontSize: '.6rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
              <span style={{ display: 'inline-block', width: 22, borderTop: '2px solid', borderTopColor: 'var(--text-secondary)' }} /> past model run
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
              <span style={{ display: 'inline-block', width: 22, borderTop: '2px dashed', borderTopColor: 'var(--text-secondary)' }} /> projection from {PROJECT_FROM}
            </span>
          </div>
          <div className="overflow-x-auto" style={{ marginTop: '.9rem' }}>
            <table style={{ width: '100%', minWidth: 620, borderCollapse: 'collapse', fontSize: '.72rem' }}>
              <thead>
                <tr>
                  <th style={{ ...TH, textAlign: 'left' }}>Period</th>
                  <th style={TH}>Temp · RCP4.5</th>
                  <th style={TH}>Temp · RCP8.5</th>
                  <th style={TH}>Rain · RCP4.5</th>
                  <th style={TH}>Rain · RCP8.5</th>
                </tr>
              </thead>
              <tbody>
                {PERIODS.map(p => (
                  <tr key={p.label}>
                    <td style={{ ...TD, textAlign: 'left', color: 'var(--text-secondary)' }}>{p.label}</td>
                    <td style={TD}>{periodCell(nap.temp?.rcp45, p.from, p.to, 'temp')}</td>
                    <td style={TD}>{periodCell(nap.temp?.rcp85, p.from, p.to, 'temp')}</td>
                    <td style={TD}>{periodCell(nap.precip?.rcp45, p.from, p.to, 'rain')}</td>
                    <td style={TD}>{periodCell(nap.precip?.rcp85, p.from, p.to, 'rain')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted" style={{ marginTop: '.7rem' }}>
            Each point is a 5-year mean (change against the 1981–2010 baseline), so the chart stays readable without flattening the trend.
            The dashed stretch starts with the {PROJECT_FROM}–{PROJECT_FROM + 4} period; everything before it is the past model run. The 120
            annual points per region are reproduced from BIPAD&apos;s NAP tables, and the 30-year means and changes shown are computed here
            from those points — not published by NAP. RCP4.5 and RCP8.5 are two emissions pathways, not two forecasts, and the spread
            between model runs (`sdRcp45`/`sdRcp85`) is not drawn.
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: '.75rem' }}>Loading projections…</p>
      )}
    </section>
  )
}
