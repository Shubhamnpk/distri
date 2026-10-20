'use client'

import { useEffect, useState } from 'react'
import { LineChart } from '@/components/charts'
import { fetchBipadGeo, fetchBipadNap, type BipadGeo, type BipadNapPoint, type BipadNapRow } from '@/lib/bipad'

/** Projection splits from the current year: solid = past model run, dashed = forward projection. */
const PROJECT_FROM = new Date().getFullYear()

const PERIODS = [
  { label: '1981–2010 · observed baseline', from: 1981, to: 2010 },
  { label: '2041–2070 · mid-century', from: 2041, to: 2070 },
  { label: '2071–2100 · end of century', from: 2071, to: 2100 },
]

function periodMean(points: BipadNapPoint[] | undefined, from: number, to: number): number | null {
  const win = (points ?? []).filter(p => p.year >= from && p.year <= to)
  return win.length ? win.reduce((s, p) => s + p.value, 0) / win.length : null
}

/** NAP series are 120 annual points (1981→2100). Thinned to every 5th year and shown as
 *  change from the 1981–2010 baseline — absolute values are near-flat lines otherwise. */
function napAnomaly(points: BipadNapPoint[] | undefined, unit: 'temp' | 'rain', step = 5) {
  const base = periodMean(points, 1981, 2010)
  if (base == null) return []
  return (points ?? []).filter((_, i) => i % step === 0).map(p => ({
    year: String(p.year),
    value: unit === 'temp' ? Number((p.value - base).toFixed(2)) : base !== 0 ? Number((((p.value - base) / base) * 100).toFixed(1)) : null,
  }))
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

      {nap.temp || nap.precip ? (
        <>
          <div className="feature-grid" style={{ marginTop: '.9rem' }}>
            <div>
              <LineChart
                data={napAnomaly(napTemp, 'temp')}
                color="var(--danger)"
                height={130}
                forecastFrom={PROJECT_FROM}
                title={`${napName} · temperature change vs 1981–2010 · °C · ${napLabel}`}
                formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}°C`}
              />
            </div>
            <div>
              <LineChart
                data={napAnomaly(napPrecip, 'rain')}
                color="var(--primary)"
                height={130}
                forecastFrom={PROJECT_FROM}
                title={`${napName} · rainfall change vs 1981–2010 · % · ${napLabel}`}
                formatValue={v => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`}
              />
            </div>
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
            Both curves show change against the 1981–2010 baseline; the dashed stretch is {PROJECT_FROM} onward, so it is projection rather
            than past model run, and the absolute values are in the table. The 120 annual points per region are reproduced from BIPAD&apos;s
            NAP tables, and the 30-year means and changes shown are computed here from those points — not published by NAP. RCP4.5 and
            RCP8.5 are two emissions pathways, not two forecasts, and the spread between model runs (`sdRcp45`/`sdRcp85`) is not drawn.
          </p>
        </>
      ) : (
        <p className="muted" style={{ marginTop: '.75rem' }}>Loading projections…</p>
      )}
    </section>
  )
}
