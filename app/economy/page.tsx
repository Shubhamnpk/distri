'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, Users, Zap, Globe2, Heart, GraduationCap, Leaf, Landmark, Banknote, ChartLine, Info, X, Maximize2 } from 'lucide-react'
import { BarChart, LineChart } from '@/components/charts'
import { fetchEconomyData, pctChange, type EconomyData, type WbDataPoint } from '@/lib/api'
import { formatNpr, formatNprRate, formatFxPair, formatNum, formatUsd, NPR_SYMBOL, USD_SYMBOL } from '@/lib/currency'
import { getNrbUsdRate } from '@/lib/nrb'

const RANGE_OPTIONS = [
  { key: '2', label: '2Y' },
  { key: '3', label: '3Y' },
  { key: '5', label: '5Y' },
  { key: '10', label: '10Y' },
  { key: 'max', label: 'Max' },
] as const
type RangeKey = typeof RANGE_OPTIONS[number]['key']

/** Keep only the last N non-empty points (or everything for 'max'). */
function rangeData(data: WbDataPoint[], range: RangeKey): WbDataPoint[] {
  const clean = data.filter(d => d.value != null)
  return range === 'max' ? clean : clean.slice(-Number(range))
}

const CURRENT_YEAR = String(new Date().getFullYear())

/** Current-year point if present, else the latest actual ≤ this year. */
function pickCurrent(arr: WbDataPoint[]): WbDataPoint | null {
  const clean = arr.filter(d => d.value != null)
  return clean.find(d => d.year === CURRENT_YEAR)
    ?? [...clean].reverse().find(d => Number(d.year) <= Number(CURRENT_YEAR))
    ?? clean[clean.length - 1]
    ?? null
}

/** The point for the year immediately before `year`. */
function pickPrev(arr: WbDataPoint[], year: string): WbDataPoint | null {
  return arr.find(d => d.year === String(Number(year) - 1) && d.value != null) ?? null
}

type ModalData = {
  label: string
  value: string
  unit?: string
  data: WbDataPoint[]
  color: string
  icon: React.ElementType
}

function Stat({ icon: Icon, label, value, change, color, sparkData, onExpand }: {
  icon: React.ElementType; label: string; value: string; change?: number; color?: string; sparkData?: WbDataPoint[]; onExpand?: () => void
}) {
  const up = (change ?? 0) >= 0
  return (
    <div onClick={onExpand} style={{
      background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
      padding: '1.1rem 1.2rem', display: 'flex', flexDirection: 'column', gap: '.35rem',
      boxShadow: 'var(--shadow-sm)', position: 'relative', overflow: 'hidden',
      cursor: onExpand ? 'pointer' : undefined, transition: 'box-shadow .15s, border-color .15s',
    }}
      onMouseEnter={e => { if (onExpand) { e.currentTarget.style.borderColor = color || 'var(--primary)'; e.currentTarget.style.boxShadow = `0 4px 16px ${color || 'var(--primary)'}15` } }}
      onMouseLeave={e => { if (onExpand) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' } }}
    >
      {onExpand && <Maximize2 size={11} style={{ position: 'absolute', top: '.7rem', right: '.7rem', color: 'var(--text-tertiary)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <Icon size={15} style={{ color: color || 'var(--primary)' }} />
        <span style={{ fontSize: '.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <strong style={{ fontSize: '1.25rem', letterSpacing: '-.04em', lineHeight: 1.1 }}>{value}</strong>
      {change !== undefined && (
        <span style={{ fontSize: '.62rem', color: up ? 'var(--primary)' : 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '.15rem' }}>
          {up ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
          {Math.abs(change).toFixed(1)}% vs prev year
        </span>
      )}
      {sparkData && sparkData.length > 1 && (
        <div style={{ marginTop: '.3rem', opacity: .55 }}>
          <LineChart data={sparkData} color={color || 'var(--primary)'} height={30} showArea formatValue={() => ''} />
        </div>
      )}
    </div>
  )
}

function TrendCard({ icon: Icon, label, value, unit, data, color, wide, onExpand, delta, spark }: {
  icon: React.ElementType; label: string; value: string; unit?: string; data: WbDataPoint[]; color: string; wide?: boolean; onExpand?: () => void; delta?: number; spark?: WbDataPoint[]
}) {
  const view = spark && spark.length > 1 ? spark : data
  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const change = delta ?? pctChange(last, first)
  const up = change >= 0
  return (
    <div onClick={onExpand} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.1rem', boxShadow: 'var(--shadow-sm)', cursor: onExpand ? 'pointer' : undefined, transition: 'box-shadow .15s, border-color .15s', position: 'relative' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}15` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)' }}
    >
      {onExpand && <Maximize2 size={12} style={{ position: 'absolute', top: '.7rem', right: '.7rem', color: 'var(--text-tertiary)' }} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.45rem' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: `${color}15`, display: 'grid', placeItems: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontSize: '.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem' }}>
        <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>{value}</strong>
        {unit && <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{unit}</span>}
      </div>
      <div style={{ marginTop: '.5rem' }}>
        <LineChart data={view} color={color} height={wide ? 85 : 72} showArea formatValue={() => ''} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.52rem', color: 'var(--text-tertiary)', marginTop: '.25rem' }}>
        <span>{view[0]?.year}</span>
        <span>{view[view.length - 1]?.year}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.52rem', color: 'var(--text-tertiary)', marginTop: '.25rem' }}>
        <span style={{ color: up ? 'var(--primary)' : 'var(--danger)', fontWeight: 600 }}>
          {up ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% {delta != null ? 'vs prev year' : 'over period'}
        </span>
      </div>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <article className="panel" style={{ marginBottom: '1rem' }}>
      <span className="sk" style={{ width: 130, height: 11, marginBottom: '.55rem' }} />
      <span className="sk" style={{ width: 280, height: 22, marginBottom: '.5rem' }} />
      <span className="sk" style={{ width: '65%', height: 12, marginBottom: '.9rem' }} />
      <span className="sk" style={{ width: '100%', height: 170 }} />
      <div className="grid-4" style={{ marginTop: '.8rem', marginBottom: 0 }}>
        {[0, 1, 2, 3].map(i => <span key={i} className="sk" style={{ width: '100%', height: 110 }} />)}
      </div>
    </article>
  )
}

function EconomySkeleton() {
  return (
    <div className="content-wrap" aria-busy="true" aria-label="Loading economy data">
      <div className="eco-hero">
        <div className="eco-hero-grid">
          <div>
            <span className="sk" style={{ width: 150, height: 11, background: 'rgba(255,255,255,.2)' }} />
            <span className="sk" style={{ width: '65%', height: 46, margin: '.55rem 0', background: 'rgba(255,255,255,.2)' }} />
            <span className="sk" style={{ width: '85%', height: 13, background: 'rgba(255,255,255,.15)' }} />
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.15rem', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3].map(i => <span key={i} className="sk" style={{ width: 72, height: 36, background: 'rgba(255,255,255,.15)' }} />)}
            </div>
          </div>
          <div>
            <span className="sk" style={{ width: 140, height: 11, marginBottom: '.5rem', background: 'rgba(255,255,255,.15)' }} />
            <span className="sk" style={{ width: '100%', height: 150, background: 'rgba(255,255,255,.12)' }} />
          </div>
        </div>
      </div>

      <nav className="eco-nav" aria-hidden="true">
        {['01 · Growth', '02 · Prices & money', '03 · People', '04 · Structure', '05 · World outlook'].map(s => <span key={s}>{s}</span>)}
      </nav>

      <section className="grid-auto" style={{ marginBottom: '1rem' }}>
        {[0, 1, 2, 3].map(i => (
          <article key={i} className="panel" style={{ padding: '1.1rem 1.2rem' }}>
            <span className="sk" style={{ width: 110, height: 11, marginBottom: '.6rem' }} />
            <span className="sk" style={{ width: 90, height: 26, marginBottom: '.6rem' }} />
            <span className="sk" style={{ width: '100%', height: 30 }} />
          </article>
        ))}
      </section>

      <PanelSkeleton />
      <PanelSkeleton />
    </div>
  )
}

export default function EconomyPage() {
  const [data, setData] = useState<EconomyData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalData | null>(null)
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')
  const [timeRange, setTimeRange] = useState<RangeKey>('5')
  const [liveNrb, setLiveNrb] = useState<number | null>(null)
  const [imfSource, setImfSource] = useState<string | null>(null)

  useEffect(() => {
    fetchEconomyData()
      .then(async d => {
        // IMF's direct DataMapper host is Akamai-blocked from some networks,
        // which empties every IMF series. Backfill them from our DBnomics-proxied
        // API route (same WEO dataset) so the outlook cards still populate.
        const imfKeys = ['imfGdpGrowth', 'imfInflation', 'imfUnemployment', 'imfCurrentAccount', 'imfGovtDebt', 'imfFiscalBalance'] as const
        if (imfKeys.some(k => !d[k].length)) {
          try {
            const res = await fetch('/api/imf')
            if (res.ok) {
              const { series, version } = (await res.json()) as { series?: Partial<EconomyData>; version?: string }
              if (series) d = { ...d, ...series }
              if (version) setImfSource(`IMF WEO ${version}`)
            }
          } catch {}
        }
        setData(d)
      })
      .catch(() => setError('Failed to load economy data'))
    let cancelled = false
    getNrbUsdRate().then(r => { if (!cancelled && r) setLiveNrb(r) }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const latest = (arr: WbDataPoint[]) => arr[arr.length - 1]
  const prev = (arr: WbDataPoint[]) => arr.length >= 2 ? arr[arr.length - 2] : null
  const openModal = useCallback((m: ModalData) => { setModal(m); setChartType('area'); setTimeRange('5') }, [])
  const modalFmt = useCallback((m: ModalData) => (v: number) => m.unit?.includes('%') ? `${v.toFixed(1)}%` : v >= 1e9 ? formatUsd(v) : formatNum(v), [])

  if (error) return (
    <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
      <p className="muted">{error}</p>
    </div>
  )

  if (!data) return <EconomySkeleton />

  const gdpL = latest(data.gdp)
  const gdpGrL = latest(data.gdpGrowth)
  const gdpPcL = latest(data.gdpPerCapita)
  const gdpPppL = latest(data.gdpPpp)
  const inflL = latest(data.inflation)
  const popL = latest(data.population)
  const expL = latest(data.exports)
  const impL = latest(data.imports)
  const remL = latest(data.remittances)
  const unempL = latest(data.unemployment)
  const fdiL = latest(data.fdi)
  const debtL = latest(data.debt)
  const elecL = latest(data.electricityAccess)
  const renewL = latest(data.renewableEnergy)
  const lifeL = latest(data.lifeExpectancy)
  const infantL = latest(data.infantMortality)
  const healthL = latest(data.healthSpending)
  const eduL = latest(data.educationSpending)

  const tradeBalance = (expL?.value ?? 0) - (impL?.value ?? 0)
  const liveNprRate = data.exchangeRate.length ? (latest(data.exchangeRate)?.value ?? 133.5) : 133.5

  // World Outlook — every IMF WEO series we have. A series the source can't
  // supply is simply absent from /api/imf, so its card is never rendered.
  const fmtPct = (v: number) => `${v.toFixed(1)}%`
  const outlookCards: { icon: React.ElementType; label: string; d: WbDataPoint[]; color: string; fmt: (v: number) => string; unit: string }[] = [
    { icon: TrendingUp, label: 'Real GDP growth', d: data.imfGdpGrowth, color: 'var(--primary)', fmt: fmtPct, unit: 'annual %' },
    { icon: Globe2, label: 'GDP, nominal', d: data.imfNominalGdp, color: '#6366f1', fmt: formatUsd, unit: 'US$, current prices' },
    { icon: Users, label: 'GDP per capita', d: data.imfGdpPerCapita, color: '#3b82f6', fmt: formatUsd, unit: 'US$ per person' },
    { icon: Globe2, label: 'GDP (PPP)', d: data.imfGdpPpp, color: '#8b5cf6', fmt: formatUsd, unit: 'international $, PPP' },
    { icon: Users, label: 'GDP per capita (PPP)', d: data.imfPppPerCapita, color: '#8b5cf6', fmt: formatUsd, unit: 'int$ PPP per person' },
    { icon: BarChart3, label: 'Inflation', d: data.imfInflation, color: 'var(--warning)', fmt: fmtPct, unit: 'average consumer prices' },
    { icon: Users, label: 'Unemployment', d: data.imfUnemployment, color: 'var(--danger)', fmt: fmtPct, unit: '% of labor force' },
    { icon: Globe2, label: 'Current account', d: data.imfCurrentAccount, color: '#6366f1', fmt: fmtPct, unit: '% of GDP' },
    { icon: Banknote, label: 'Investment', d: data.imfInvestment, color: '#3b82f6', fmt: fmtPct, unit: '% of GDP' },
    { icon: Landmark, label: 'Govt revenue', d: data.imfGovtRevenue, color: '#16a34a', fmt: fmtPct, unit: '% of GDP' },
    { icon: Landmark, label: 'Govt expenditure', d: data.imfGovtExpenditure, color: '#e0a351', fmt: fmtPct, unit: '% of GDP' },
    { icon: Landmark, label: 'Govt gross debt', d: data.imfGrossDebt, color: '#e11d48', fmt: fmtPct, unit: '% of GDP' },
    { icon: Landmark, label: 'Govt net debt', d: data.imfGovtDebt, color: '#6366f1', fmt: fmtPct, unit: '% of GDP' },
    { icon: Banknote, label: 'Fiscal balance', d: data.imfFiscalBalance, color: 'var(--warning)', fmt: fmtPct, unit: '% of GDP (negative = deficit)' },
  ]
  // Forecast cards track the *current* year, not the far-year projection, and
  // compare it with the previous year so the % is a real year-on-year move.
  const outlook = outlookCards.filter(c => c.d.length > 0).map(c => {
    const cur = pickCurrent(c.d)
    const pv = cur ? pickPrev(c.d, cur.year) : null
    const delta = cur && pv && pv.value ? pctChange(cur.value ?? 0, pv.value) : undefined
    return { ...c, cur, delta }
  })
  const outlookYear = outlook.length ? String(Math.max(...outlook.map(c => Number(c.cur?.year ?? 0)))) : ''

  const imfCur = pickCurrent(data.imfGdpGrowth)
  const imfPrev = imfCur ? pickPrev(data.imfGdpGrowth, imfCur.year) : null

  const modalShown = modal ? rangeData(modal.data, timeRange) : []
  const refX = modalShown.some(d => d.year === CURRENT_YEAR) ? CURRENT_YEAR : undefined

  return (
    <>
      <div className="content-wrap">
        {/* ─── HERO ─── */}
        <div className="eco-hero">
          <div className="eco-hero-grid">
            <div>
              <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>NEPAL ECONOMY · LIVE DATA</p>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2.2rem, 4vw, 3.2rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.02 }}>
                {formatUsd(gdpL?.value ?? 0)}
              </h1>
              <p style={{ fontSize: '.8rem', opacity: .85, margin: 0 }}>Gross Domestic Product · {gdpL?.year} estimate · {formatNpr((gdpL?.value ?? 0) * (liveNrb ?? liveNprRate))} at {liveNrb ? 'today’s NRB rate' : 'official rate'}</p>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Growth', val: `${(gdpGrL?.value ?? 0).toFixed(1)}%` },
                  { label: 'Per capita', val: formatUsd(gdpPcL?.value ?? 0) },
                  { label: 'PPP per capita', val: formatUsd(gdpPppL?.value ?? 0) },
                  { label: 'Inflation', val: `${(inflL?.value ?? 0).toFixed(1)}%` },
                ].map(item => (
                  <div key={item.label}>
                    <span style={{ fontSize: '.55rem', opacity: .6, textTransform: 'uppercase', letterSpacing: '.1em' }}>{item.label}</span>
                    <strong style={{ display: 'block', fontSize: '1.15rem', letterSpacing: '-.03em' }}>{item.val}</strong>
                  </div>
                ))}
              </div>
              {liveNrb && (
                <div style={{ display: 'inline-block', marginTop: '1rem', background: 'rgba(255,255,255,.14)', borderRadius: 20, padding: '.35rem .8rem', fontSize: '.7rem', fontWeight: 700 }}>
                  Live NRB fixing today: {formatFxPair(liveNrb)}
                </div>
              )}
            </div>
            <div>
              <p style={{ fontSize: '.55rem', opacity: .6, textTransform: 'uppercase', letterSpacing: '.1em', margin: '0 0 .3rem' }}>Nominal GDP · current US$</p>
              <LineChart data={data.gdp} color="#ffffff" height={150} showArea formatValue={v => formatUsd(v)} />
            </div>
          </div>
        </div>

        {/* ─── SECTION NAV ─── */}
        <nav className="eco-nav" aria-label="Economy sections">
          <a href="#growth">01 · Growth</a>
          <a href="#prices">02 · Prices & money</a>
          <a href="#people">03 · People</a>
          <a href="#structure">04 · Structure</a>
          <a href="#outlook">05 · World outlook</a>
        </nav>

        {/* ─── PULSE ─── */}
        <section className="grid-auto" style={{ marginBottom: '1rem' }}>
          <Stat icon={TrendingUp} label="GDP growth" value={`${(gdpGrL?.value ?? 0).toFixed(1)}%`} change={gdpGrL && data.gdpGrowth.length >= 2 ? pctChange(gdpGrL.value ?? 0, (prev(data.gdpGrowth)?.value ?? 0)) : undefined} color="var(--primary)" sparkData={data.gdpGrowth} onExpand={() => openModal({ label: 'GDP growth', value: `${(gdpGrL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.gdpGrowth, color: 'var(--primary)', icon: TrendingUp })} />
          <Stat icon={BarChart3} label="Inflation (CPI)" value={`${(inflL?.value ?? 0).toFixed(1)}%`} change={inflL && data.inflation.length >= 2 ? -(pctChange(inflL.value ?? 0, (prev(data.inflation)?.value ?? 0))) : undefined} color="var(--warning)" sparkData={data.inflation} onExpand={() => openModal({ label: 'Inflation (CPI)', value: `${(inflL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.inflation, color: 'var(--warning)', icon: BarChart3 })} />
          <Stat icon={Globe2} label="Exports" value={formatUsd(expL?.value ?? 0)} change={expL && data.exports.length >= 2 ? pctChange(expL.value ?? 0, (prev(data.exports)?.value ?? 0)) : undefined} color="var(--primary)" sparkData={data.exports} onExpand={() => openModal({ label: 'Exports', value: formatUsd(expL?.value ?? 0), data: data.exports, color: 'var(--primary)', icon: Globe2 })} />
          <Stat icon={Users} label="Unemployment" value={`${(unempL?.value ?? 0).toFixed(1)}%`} color="var(--danger)" sparkData={data.unemployment} onExpand={() => openModal({ label: 'Unemployment', value: `${(unempL?.value ?? 0).toFixed(1)}%`, unit: 'of labor force', data: data.unemployment, color: 'var(--danger)', icon: Users })} />
          {imfCur && (
            <Stat icon={ChartLine} label={`GDP forecast · ${imfCur.year}`} value={`${(imfCur.value ?? 0).toFixed(1)}%`} change={imfPrev && imfPrev.value ? pctChange(imfCur.value ?? 0, imfPrev.value) : undefined} color="#6366f1" sparkData={data.imfGdpGrowth.slice(-16)} onExpand={() => openModal({ label: 'Real GDP growth (IMF forecast)', value: `${(imfCur.value ?? 0).toFixed(1)}%`, unit: `annual %, incl. forecasts to ${outlookYear}`, data: data.imfGdpGrowth, color: '#6366f1', icon: ChartLine })} />
          )}
        </section>

        {/* ─── 01 GROWTH ─── */}
        <section id="growth" className="eco-section">
          <article className="panel" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">01 · GROWTH</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.3rem', margin: '.15rem 0 0' }}>How fast Nepal grows</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Annual growth, investment appetite, and what funds the state. Hover any chart for exact values.</p>
            <BarChart data={data.gdpGrowth} height={170} color="var(--primary)" formatValue={v => `${v.toFixed(1)}%`} />
            <div style={{ marginTop: '.6rem', padding: '.65rem', background: 'var(--bg-sunken)', borderRadius: '8px', fontSize: '.7rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
              Nepal grew {(gdpGrL?.value ?? 0).toFixed(1)}% in {gdpGrL?.year}.
              {inflL && (inflL.value ?? 0) < 5 ? ` Inflation eased to ${(inflL.value ?? 0).toFixed(1)}%.` : ` Inflation stood at ${(inflL?.value ?? 0).toFixed(1)}%.`}
              {` `}GDP per capita reached {formatUsd(gdpPcL?.value ?? 0)}.
            </div>
            <div className="grid-4" style={{ marginTop: '.7rem', marginBottom: 0 }}>
              <TrendCard icon={Banknote} label="Investment" value={`${(latest(data.investment)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.investment)?.year}`} data={data.investment} color="#3b82f6" onExpand={() => openModal({ label: 'Investment (% of GDP)', value: `${(latest(data.investment)?.value ?? 0).toFixed(1)}%`, unit: 'gross capital formation', data: data.investment, color: '#3b82f6', icon: Banknote })} />
              <TrendCard icon={TrendingUp} label="FDI" value={fdiL ? `${(fdiL.value ?? 0).toFixed(2)}%` : 'N/A'} unit={`of GDP · ${fdiL?.year}`} data={data.fdi} color="#8b5cf6" onExpand={() => openModal({ label: 'FDI (% of GDP)', value: fdiL ? `${(fdiL.value ?? 0).toFixed(2)}%` : 'N/A', data: data.fdi, color: '#8b5cf6', icon: TrendingUp })} />
              <TrendCard icon={GraduationCap} label="Education spend" value={eduL ? `${(eduL.value ?? 0).toFixed(1)}%` : 'N/A'} unit={`of GDP · ${eduL?.year}`} data={data.educationSpending} color="#3b82f6" onExpand={() => openModal({ label: 'Education spending', value: eduL ? `${(eduL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of GDP', data: data.educationSpending, color: '#3b82f6', icon: GraduationCap })} />
              <TrendCard icon={Heart} label="Health spend" value={healthL ? `${(healthL.value ?? 0).toFixed(1)}%` : 'N/A'} unit={`of GDP · ${healthL?.year}`} data={data.healthSpending} color="#e11d48" onExpand={() => openModal({ label: 'Health spending', value: healthL ? `${(healthL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of GDP', data: data.healthSpending, color: '#e11d48', icon: Heart })} />
            </div>
            <div style={{ marginTop: '.4rem', fontSize: '.58rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              SDG targets: 4–6% of GDP on education, 5% on health. FDI remains among the lowest in South Asia.
            </div>
          </article>
        </section>

        {/* ─── 02 PRICES & MONEY ─── */}
        <section id="prices" className="eco-section">
          <article className="panel" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">02 · PRICES & MONEY</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.3rem', margin: '.15rem 0 0' }}>What money buys, and where it comes from</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Inflation, the rupee, remittances that fund a third of the economy, and the trade gap they cover.</p>
            <div className="grid-auto">
              <TrendCard icon={BarChart3} label="Inflation rate" value={`${(inflL?.value ?? 0).toFixed(1)}%`} unit="annual %" data={data.inflation} color="var(--warning)" onExpand={() => openModal({ label: 'Inflation rate', value: `${(inflL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.inflation, color: 'var(--warning)', icon: BarChart3 })} />
              <TrendCard icon={Banknote} label="Remittances" value={formatUsd(remL?.value ?? 0)} data={data.remittances} color="#8b5cf6" onExpand={() => openModal({ label: 'Remittances', value: formatUsd(remL?.value ?? 0), data: data.remittances, color: '#8b5cf6', icon: Banknote })} />
              <TrendCard icon={Landmark} label="Govt debt" value={debtL ? `${(debtL.value ?? 0).toFixed(1)}%` : 'N/A'} unit={`of GDP · ${debtL?.year}`} data={data.debt} color="#6366f1" onExpand={() => openModal({ label: 'Govt debt (% GDP)', value: debtL ? `${(debtL.value ?? 0).toFixed(1)}%` : 'N/A', data: data.debt, color: '#6366f1', icon: Landmark })} />
              <TrendCard icon={Banknote} label="Govt revenue" value={data.govtRevenue.length ? `${(latest(data.govtRevenue)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={`of GDP · ${latest(data.govtRevenue)?.year}`} data={data.govtRevenue} color="#16a34a" onExpand={() => openModal({ label: 'Govt revenue', value: `${(latest(data.govtRevenue)?.value ?? 0).toFixed(1)}%`, unit: '% of GDP, excl. grants', data: data.govtRevenue, color: '#16a34a', icon: Banknote })} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.6rem', marginTop: '.6rem', marginBottom: '.6rem' }}>
              <div style={{ padding: '.7rem', background: 'var(--primary-50)', borderRadius: '10px' }}>
                <span style={{ fontSize: '.6rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Exports ({expL?.year})</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', margin: '.2rem 0 0' }}>{formatUsd(expL?.value ?? 0)}</strong>
              </div>
              <div style={{ padding: '.7rem', background: 'var(--danger-light)', borderRadius: '10px' }}>
                <span style={{ fontSize: '.6rem', color: 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Imports ({impL?.year})</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', margin: '.2rem 0 0' }}>{formatUsd(impL?.value ?? 0)}</strong>
              </div>
              <div style={{ padding: '.7rem', background: tradeBalance >= 0 ? 'var(--primary-50)' : 'var(--danger-light)', borderRadius: '10px' }}>
                <span style={{ fontSize: '.6rem', color: tradeBalance >= 0 ? 'var(--primary)' : 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Trade balance</span>
                <strong style={{ display: 'block', fontSize: '1.1rem', margin: '.2rem 0 0', color: tradeBalance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>{formatUsd(tradeBalance)}</strong>
              </div>
            </div>
            <div className="grid-2" style={{ marginBottom: 0 }}>
              <div>
                <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.55rem' }}>EXPORTS VS IMPORTS</p>
                <LineChart data={data.exports} color="var(--primary)" height={110} title="Exports over time" />
                <div style={{ marginTop: '.4rem' }}>
                  <LineChart data={data.imports} color="var(--danger)" height={110} title="Imports over time" />
                </div>
              </div>
              <div>
                <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.55rem' }}>{NPR_SYMBOL} PER US DOLLAR</p>
                {data.exchangeRate.length ? (
                  <>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem' }}>
                      <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>{formatNprRate(latest(data.exchangeRate)?.value ?? 0)}</strong>
                      <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{USD_SYMBOL}1 · {latest(data.exchangeRate)?.year}</span>
                    </div>
                    <div style={{ marginTop: '.4rem' }}>
                      <LineChart data={data.exchangeRate} color="#e0a351" height={110} formatValue={v => formatNprRate(v)} title="Exchange rate trend" />
                    </div>
                    {liveNrb && (
                      <div style={{ marginTop: '.4rem', padding: '.5rem .65rem', background: 'var(--primary-50)', borderRadius: 8, fontSize: '.68rem', fontWeight: 700, color: 'var(--primary)' }}>
                        Live NRB fixing today: {formatNprRate(liveNrb)}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="muted">Exchange rate data unavailable.</p>
                )}
                <div style={{ marginTop: '.5rem' }}>
                  <LineChart data={data.tradeOpenness} color="#8b5cf6" height={80} formatValue={v => `${v.toFixed(1)}%`} title="Trade openness (% of GDP)" />
                </div>
              </div>
            </div>
          </article>
        </section>

        {/* ─── 03 PEOPLE ─── */}
        <section id="people" className="eco-section">
          <article className="panel" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">03 · PEOPLE</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.3rem', margin: '.15rem 0 0' }}>Who the economy serves</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Population, health, learning and work — click any card for the full series.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start', marginTop: '.6rem', marginBottom: '.7rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginBottom: '.5rem' }}>
                  <strong style={{ fontSize: '1.6rem', letterSpacing: '-.04em' }}>{formatNum(popL?.value ?? 0)}</strong>
                  <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{popL?.year}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.35rem' }}>
                  {[
                    { label: 'Per capita GDP', val: formatUsd(gdpPcL?.value ?? 0) },
                    { label: 'Per capita PPP', val: formatUsd(gdpPppL?.value ?? 0) },
                    { label: 'Unemployment', val: `${(unempL?.value ?? 0).toFixed(1)}%` },
                    { label: 'Life expectancy', val: lifeL ? `${(lifeL.value ?? 0).toFixed(1)} yrs` : '—' },
                  ].map(item => (
                    <div key={item.label} style={{ padding: '.4rem', background: 'var(--bg-sunken)', borderRadius: '6px' }}>
                      <span style={{ fontSize: '.52rem', color: 'var(--text-tertiary)' }}>{item.label}</span>
                      <strong style={{ display: 'block', fontSize: '.75rem' }}>{item.val}</strong>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.55rem' }}>POPULATION TREND</p>
                <LineChart data={data.population} color="#3b82f6" height={120} title="Population trend" formatValue={v => formatNum(v)} />
              </div>
            </div>
            <div className="grid-auto">
              <TrendCard icon={Heart} label="Life expectancy" value={lifeL ? `${(lifeL.value ?? 0).toFixed(1)} yrs` : 'N/A'} data={data.lifeExpectancy} color="#e11d48" onExpand={() => openModal({ label: 'Life expectancy', value: lifeL ? `${(lifeL.value ?? 0).toFixed(1)} yrs` : 'N/A', data: data.lifeExpectancy, color: '#e11d48', icon: Heart })} />
              <TrendCard icon={TrendingDown} label="Infant mortality" value={infantL ? `${(infantL.value ?? 0).toFixed(1)}‰` : 'N/A'} unit="per 1,000 live births" data={data.infantMortality} color="var(--primary)" onExpand={() => openModal({ label: 'Infant mortality', value: infantL ? `${(infantL.value ?? 0).toFixed(1)}‰` : 'N/A', unit: 'per 1,000 live births', data: data.infantMortality, color: 'var(--primary)', icon: TrendingDown })} />
              <TrendCard icon={Heart} label="Maternal mortality" value={data.maternalMortality.length ? `${(latest(data.maternalMortality)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.maternalMortality.length ? `per 100k births · ${latest(data.maternalMortality)?.year}` : undefined} data={data.maternalMortality} color="#e11d48" onExpand={() => openModal({ label: 'Maternal mortality', value: data.maternalMortality.length ? `${(latest(data.maternalMortality)?.value ?? 0).toFixed(0)}` : 'N/A', unit: 'maternal deaths per 100,000 live births', data: data.maternalMortality, color: '#e11d48', icon: Heart })} />
              <TrendCard icon={Users} label="Fertility rate" value={data.fertility.length ? `${(latest(data.fertility)?.value ?? 0).toFixed(1)}` : 'N/A'} unit={data.fertility.length ? `births/woman · ${latest(data.fertility)?.year}` : undefined} data={data.fertility} color="var(--warning)" onExpand={() => openModal({ label: 'Fertility rate', value: data.fertility.length ? `${(latest(data.fertility)?.value ?? 0).toFixed(1)}` : 'N/A', unit: 'total births per woman', data: data.fertility, color: 'var(--warning)', icon: Users })} />
              <TrendCard icon={GraduationCap} label="Literacy rate" value={latest(data.literacy) ? `${(latest(data.literacy).value ?? 0).toFixed(1)}%` : 'N/A'} data={data.literacy} color="#3b82f6" onExpand={() => openModal({ label: 'Literacy rate', value: latest(data.literacy) ? `${(latest(data.literacy).value ?? 0).toFixed(1)}%` : 'N/A', data: data.literacy, color: '#3b82f6', icon: GraduationCap })} />
              <TrendCard icon={Users} label="Unemployment" value={`${(unempL?.value ?? 0).toFixed(1)}%`} unit="of labor force" data={data.unemployment} color="var(--danger)" onExpand={() => openModal({ label: 'Unemployment', value: `${(unempL?.value ?? 0).toFixed(1)}%`, unit: '% of labor force', data: data.unemployment, color: 'var(--danger)', icon: Users })} />
            </div>
          </article>
        </section>

        {/* ─── 04 STRUCTURE ─── */}
        <section id="structure" className="eco-section">
          <article className="panel" style={{ marginBottom: '1rem' }}>
            <p className="eyebrow">04 · STRUCTURE</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.3rem', margin: '.15rem 0 0' }}>What Nepal makes, and how it connects</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Sector shares, fairness, energy and the digital leap.</p>
            <div className="grid-auto">
              <TrendCard icon={Leaf} label="Agriculture" value={`${(latest(data.agriculture)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.agriculture)?.year}`} data={data.agriculture} color="#16a34a" onExpand={() => openModal({ label: 'Agriculture (% of GDP)', value: `${(latest(data.agriculture)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.agriculture, color: '#16a34a', icon: Leaf })} />
              <TrendCard icon={Zap} label="Industry" value={`${(latest(data.industry)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.industry)?.year}`} data={data.industry} color="#e0a351" onExpand={() => openModal({ label: 'Industry (% of GDP)', value: `${(latest(data.industry)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.industry, color: '#e0a351', icon: Zap })} />
              <TrendCard icon={ChartLine} label="Services" value={`${(latest(data.services)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.services)?.year}`} data={data.services} color="#8b5cf6" onExpand={() => openModal({ label: 'Services (% of GDP)', value: `${(latest(data.services)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.services, color: '#8b5cf6', icon: ChartLine })} />
              <TrendCard icon={BarChart3} label="GINI inequality" value={data.gini.length ? `${(latest(data.gini)?.value ?? 0).toFixed(1)}` : 'N/A'} unit={data.gini.length ? `0=equal · ${latest(data.gini)?.year}` : undefined} data={data.gini} color="var(--warning)" onExpand={() => openModal({ label: 'GINI index', value: `${(latest(data.gini)?.value ?? 0).toFixed(1)}`, unit: '0 = perfectly equal, 100 = unequal', data: data.gini, color: 'var(--warning)', icon: BarChart3 })} />
              <TrendCard icon={Users} label="Poverty headcount" value={data.poverty.length ? `${(latest(data.poverty)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.poverty.length ? `under $2.15/day · ${latest(data.poverty)?.year}` : undefined} data={data.poverty} color="var(--danger)" onExpand={() => openModal({ label: 'Poverty headcount', value: `${(latest(data.poverty)?.value ?? 0).toFixed(1)}%`, unit: 'share under $2.15/day', data: data.poverty, color: 'var(--danger)', icon: Users })} />
              <TrendCard icon={Landmark} label="Urban population" value={`${(latest(data.urbanPopulation)?.value ?? 0).toFixed(1)}%`} unit={`of total · ${latest(data.urbanPopulation)?.year}`} data={data.urbanPopulation} color="#6366f1" onExpand={() => openModal({ label: 'Urban population', value: `${(latest(data.urbanPopulation)?.value ?? 0).toFixed(1)}%`, unit: 'share living in cities', data: data.urbanPopulation, color: '#6366f1', icon: Landmark })} />
              <TrendCard icon={Zap} label="Internet users" value={`${(latest(data.internetUsers)?.value ?? 0).toFixed(1)}%`} unit={`of population · ${latest(data.internetUsers)?.year}`} data={data.internetUsers} color="var(--primary)" onExpand={() => openModal({ label: 'Internet users', value: `${(latest(data.internetUsers)?.value ?? 0).toFixed(1)}%`, unit: 'share of population online', data: data.internetUsers, color: 'var(--primary)', icon: Zap })} />
              <TrendCard icon={Globe2} label="Mobile subscriptions" value={data.mobileSubs.length ? `${(latest(data.mobileSubs)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.mobileSubs.length ? `per 100 people · ${latest(data.mobileSubs)?.year}` : undefined} data={data.mobileSubs} color="#3b82f6" onExpand={() => openModal({ label: 'Mobile subscriptions', value: `${(latest(data.mobileSubs)?.value ?? 0).toFixed(0)}`, unit: 'subscriptions per 100 people', data: data.mobileSubs, color: '#3b82f6', icon: Globe2 })} />
              <TrendCard icon={GraduationCap} label="Primary enrollment" value={data.primaryEnrollment.length ? `${(latest(data.primaryEnrollment)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.primaryEnrollment.length ? `net rate · ${latest(data.primaryEnrollment)?.year}` : undefined} data={data.primaryEnrollment} color="#16a34a" onExpand={() => openModal({ label: 'Primary enrollment', value: `${(latest(data.primaryEnrollment)?.value ?? 0).toFixed(1)}%`, unit: 'net enrollment rate, primary', data: data.primaryEnrollment, color: '#16a34a', icon: GraduationCap })} />
              <TrendCard icon={Zap} label="Electricity access" value={elecL ? `${(elecL.value ?? 0).toFixed(1)}%` : 'N/A'} unit="% of population" data={data.electricityAccess} color="var(--primary)" onExpand={() => openModal({ label: 'Electricity access', value: elecL ? `${(elecL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of population', data: data.electricityAccess, color: 'var(--primary)', icon: Zap })} />
              <TrendCard icon={Leaf} label="Renewable energy" value={renewL ? `${(renewL.value ?? 0).toFixed(1)}%` : 'N/A'} unit="% of total energy" data={data.renewableEnergy} color="#16a34a" onExpand={() => openModal({ label: 'Renewable energy', value: renewL ? `${(renewL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of total energy', data: data.renewableEnergy, color: '#16a34a', icon: Leaf })} />
              <TrendCard icon={Leaf} label="Forest area" value={data.forestArea.length ? `${(latest(data.forestArea)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.forestArea.length ? `% of land · ${latest(data.forestArea)?.year}` : undefined} data={data.forestArea} color="#16a34a" onExpand={() => openModal({ label: 'Forest area', value: data.forestArea.length ? `${(latest(data.forestArea)?.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of land area', data: data.forestArea, color: '#16a34a', icon: Leaf })} />
              <TrendCard icon={Zap} label="Energy use pc" value={data.energyUse.length ? `${(latest(data.energyUse)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.energyUse.length ? `kg oil eq. · ${latest(data.energyUse)?.year}` : undefined} data={data.energyUse} color="#e0a351" onExpand={() => openModal({ label: 'Energy use per capita', value: data.energyUse.length ? `${(latest(data.energyUse)?.value ?? 0).toFixed(0)}` : 'N/A', unit: 'kg of oil equivalent per person', data: data.energyUse, color: '#e0a351', icon: Zap })} />
            </div>
          </article>
        </section>

        {/* ─── 05 WORLD OUTLOOK ─── */}
        <section id="outlook" className="eco-section">
          {outlook.length > 0 && (
            <article className="panel" style={{ marginBottom: '1rem' }}>
              <p className="eyebrow">05 · WORLD OUTLOOK · IMF FORECASTS TO {outlookYear}</p>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.3rem', margin: '.15rem 0 0' }}>What the world expects of Nepal</h3>
              <p className="muted" style={{ marginBottom: '.6rem' }}>IMF World Economic Outlook — history plus projections beyond {latest(data.gdpGrowth)?.year}{imfSource ? ` · via ${imfSource}` : ''}. Click any card to explore.</p>
              <div className="grid-auto">
                {outlook.map(c => (
                  <TrendCard key={c.label} icon={c.icon} label={c.label} value={c.cur ? c.fmt(c.cur.value ?? 0) : '—'} unit={c.cur ? `${c.unit} · ${c.cur.year}${Number(c.cur.year) >= Number(CURRENT_YEAR) ? ' forecast' : ''}` : c.unit} data={c.d} spark={c.d.slice(-16)} delta={c.delta} color={c.color} wide onExpand={() => openModal({ label: `${c.label} (IMF)`, value: c.cur ? c.fmt(c.cur.value ?? 0) : '—', unit: `${c.unit}, incl. forecasts`, data: c.d, color: c.color, icon: c.icon })} />
                ))}
              </div>
            </article>
          )}
        </section>

        {/* ─── SOURCE ─── */}
        <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)' }}>
          <Info size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '.74rem' }}>Data sources: World Bank Open Data API · IMF World Economic Outlook · NRB fixing</strong>
            <p style={{ margin: '.1rem 0 0', fontSize: '.62rem', color: 'var(--text-secondary)' }}>
              Historical data from api.worldbank.org, projections from imf.org DataMapper, today&apos;s rate from nrb.org.np · Hover any chart for exact values
              <a href="https://data.worldbank.org/country/nepal" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '.3rem' }}>View on World Bank <ArrowUpRight size={10} style={{ display: 'inline' }} /></a>
              <a href="https://www.imf.org/en/Publications/WEO" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '.5rem' }}>IMF World Economic Outlook <ArrowUpRight size={10} style={{ display: 'inline' }} /></a>
            </p>
          </div>
        </div>

        {/* ─── MODAL ─── */}
        {modal && (
          <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.25)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem 1.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${modal.color}15`, display: 'grid', placeItems: 'center' }}>
                    <modal.icon size={18} style={{ color: modal.color }} />
                  </div>
                  <div>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>{modal.label}</h3>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', marginTop: '.15rem' }}>
                      <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>{modal.value}</strong>
                      {modal.unit && <span style={{ fontSize: '.65rem', color: 'var(--text-tertiary)' }}>{modal.unit}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                  <div style={{ display: 'flex', background: 'var(--bg-sunken)', borderRadius: '8px', padding: '3px' }}>
                    {(['area', 'line', 'bar'] as const).map(t => (
                      <button key={t} onClick={() => setChartType(t)} style={{ padding: '.3rem .65rem', borderRadius: '6px', fontSize: '.65rem', fontWeight: 600, border: 'none', cursor: 'pointer', background: chartType === t ? 'var(--bg-elevated)' : 'transparent', color: chartType === t ? 'var(--text)' : 'var(--text-tertiary)', boxShadow: chartType === t ? 'var(--shadow-sm)' : 'none', textTransform: 'capitalize', transition: 'all .15s' }}>
                        {t}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setModal(null)} style={{ background: 'var(--bg-sunken)', border: 'none', borderRadius: '8px', width: 32, height: 32, display: 'grid', placeItems: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>
                    {modalShown.length > 1 ? `${modalShown[0].year}–${modalShown[modalShown.length - 1].year} · hover for change vs start` : 'No data in range'}
                  </span>
                  <div style={{ display: 'flex', background: 'var(--bg-sunken)', borderRadius: '8px', padding: '3px' }}>
                    {RANGE_OPTIONS.map(o => (
                      <button key={o.key} onClick={() => setTimeRange(o.key)} style={{ padding: '.3rem .6rem', borderRadius: '6px', fontSize: '.62rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: timeRange === o.key ? 'var(--bg-elevated)' : 'transparent', color: timeRange === o.key ? 'var(--text)' : 'var(--text-tertiary)', boxShadow: timeRange === o.key ? 'var(--shadow-sm)' : 'none', transition: 'all .15s' }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
                {chartType === 'bar' ? (
                  <BarChart data={modalShown} height={320} color={modal.color} showDelta yAxis refX={refX} refLabel={`${CURRENT_YEAR} · now`} formatValue={modalFmt(modal)} />
                ) : (
                  <LineChart data={modalShown} color={modal.color} height={320} showArea={chartType === 'area'} showDelta yAxis refX={refX} refLabel={`${CURRENT_YEAR} · now`} formatValue={modalFmt(modal)} />
                )}
                {(() => {
                  const sorted = [...modalShown].filter(d => d.value != null).sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
                  const low = sorted[0]
                  const high = sorted[sorted.length - 1]
                  const fmt = modalFmt(modal)
                  return (
                    <div style={{ marginTop: '1.2rem', borderTop: '1px solid var(--border-light)', paddingTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
                      <div style={{ padding: '.7rem', background: 'var(--primary-50)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '.6rem', color: 'var(--primary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Highest</span>
                        <strong style={{ display: 'block', fontSize: '1.1rem', margin: '.2rem 0 0', color: 'var(--primary)' }}>{high ? fmt(high.value ?? 0) : '—'}</strong>
                        <span style={{ fontSize: '.55rem', color: 'var(--text-tertiary)' }}>{high?.year}</span>
                      </div>
                      <div style={{ padding: '.7rem', background: 'var(--danger-light)', borderRadius: '10px' }}>
                        <span style={{ fontSize: '.6rem', color: 'var(--danger)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Lowest</span>
                        <strong style={{ display: 'block', fontSize: '1.1rem', margin: '.2rem 0 0', color: 'var(--danger)' }}>{low ? fmt(low.value ?? 0) : '—'}</strong>
                        <span style={{ fontSize: '.55rem', color: 'var(--text-tertiary)' }}>{low?.year}</span>
                      </div>
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
