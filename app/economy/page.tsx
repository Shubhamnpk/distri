'use client'

import { useEffect, useState, useCallback } from 'react'
import { ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown, BarChart3, Users, Zap, Globe2, Heart, GraduationCap, Leaf, Landmark, Banknote, ChartLine, Info, X, Maximize2 } from 'lucide-react'
import { BarChart, LineChart } from '@/components/charts'
import { fetchEconomyData, formatUsd, formatNpr, formatNum, pctChange, type EconomyData, type WbDataPoint } from '@/lib/api'

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

function TrendCard({ icon: Icon, label, value, unit, data, color, wide, onExpand }: {
  icon: React.ElementType; label: string; value: string; unit?: string; data: WbDataPoint[]; color: string; wide?: boolean; onExpand?: () => void
}) {
  const first = data[0]?.value ?? 0
  const last = data[data.length - 1]?.value ?? 0
  const dir = last >= first
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
        <LineChart data={data} color={color} height={wide ? 85 : 72} showArea formatValue={() => ''} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.52rem', color: 'var(--text-tertiary)', marginTop: '.25rem' }}>
        <span>{data[0]?.year}</span>
        <span style={{ color: dir ? 'var(--primary)' : 'var(--danger)', fontWeight: 600 }}>
          {dir ? '↑' : '↓'} {Math.abs(pctChange(last, first)).toFixed(1)}% over period
        </span>
        <span>{data[data.length - 1]?.year}</span>
      </div>
    </div>
  )
}

export default function EconomyPage() {
  const [data, setData] = useState<EconomyData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalData | null>(null)
  const [chartType, setChartType] = useState<'area' | 'line' | 'bar'>('area')

  useEffect(() => {
    fetchEconomyData()
      .then(setData)
      .catch(() => setError('Failed to load economy data'))
      .finally(() => setLoading(false))
  }, [])

  const latest = (arr: WbDataPoint[]) => arr[arr.length - 1]
  const prev = (arr: WbDataPoint[]) => arr.length >= 2 ? arr[arr.length - 2] : null
  const openModal = useCallback((m: ModalData) => { setModal(m); setChartType('area') }, [])

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin .6s linear infinite', margin: '0 auto 1.2rem' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <p className="muted" style={{ fontSize: '.85rem' }}>Fetching live data from World Bank Open Data API...</p>
    </div>
  )

  if (error || !data) return (
    <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
      <p className="muted">{error || 'No data available'}</p>
    </div>
  )

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

  return (
    <>
      <div className="content-wrap">
        {/* ─── HERO ─── */}

      <div style={{ background: 'var(--primary)', borderRadius: 'var(--radius-xl)', padding: 'clamp(1.5rem, 3vw, 2.5rem)', color: '#fff', marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -40, right: -20, opacity: .08 }}><BarChart3 size={200} /></div>
        <p style={{ fontSize: '.6rem', letterSpacing: '.16em', fontWeight: 700, opacity: .7, margin: 0 }}>NEPAL ECONOMY · LIVE DATA</p>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 500, letterSpacing: '-.04em', margin: '.3rem 0 .4rem', lineHeight: 1.05 }}>
          {formatUsd(gdpL?.value ?? 0)}
        </h1>
        <p style={{ fontSize: '.8rem', opacity: .85, margin: 0 }}>Gross Domestic Product · {gdpL?.year} estimate</p>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Growth', val: `${(gdpGrL?.value ?? 0).toFixed(1)}%` },
            { label: 'Per capita', val: `$${(gdpPcL?.value ?? 0).toLocaleString()}` },
            { label: 'PPP per capita', val: `$${(gdpPppL?.value ?? 0).toLocaleString()}` },
            { label: 'NPR equivalent', val: `रू${((gdpL?.value ?? 0) * liveNprRate / 1e12).toFixed(2)}T` },
          ].map(item => (
            <div key={item.label}>
              <span style={{ fontSize: '.55rem', opacity: .6, textTransform: 'uppercase', letterSpacing: '.1em' }}>{item.label}</span>
              <strong style={{ display: 'block', fontSize: '1.15rem', letterSpacing: '-.03em' }}>{item.val}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ─── STAT CARDS ─── */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.65rem', marginBottom: '1rem' }}>
        <Stat icon={TrendingUp} label="GDP growth" value={`${(gdpGrL?.value ?? 0).toFixed(1)}%`} change={gdpGrL && data.gdpGrowth.length >= 2 ? pctChange(gdpGrL.value ?? 0, (prev(data.gdpGrowth)?.value ?? 0)) : undefined} color="var(--primary)" sparkData={data.gdpGrowth} onExpand={() => openModal({ label: 'GDP growth', value: `${(gdpGrL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.gdpGrowth, color: 'var(--primary)', icon: TrendingUp })} />
        <Stat icon={BarChart3} label="Inflation (CPI)" value={`${(inflL?.value ?? 0).toFixed(1)}%`} change={inflL && data.inflation.length >= 2 ? -(pctChange(inflL.value ?? 0, (prev(data.inflation)?.value ?? 0))) : undefined} color="var(--warning)" sparkData={data.inflation} onExpand={() => openModal({ label: 'Inflation (CPI)', value: `${(inflL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.inflation, color: 'var(--warning)', icon: BarChart3 })} />
        <Stat icon={Globe2} label="Exports" value={formatUsd(expL?.value ?? 0)} change={expL && data.exports.length >= 2 ? pctChange(expL.value ?? 0, (prev(data.exports)?.value ?? 0)) : undefined} color="var(--primary)" sparkData={data.exports} onExpand={() => openModal({ label: 'Exports', value: formatUsd(expL?.value ?? 0), data: data.exports, color: 'var(--primary)', icon: Globe2 })} />
        <Stat icon={Users} label="Unemployment" value={`${(unempL?.value ?? 0).toFixed(1)}%`} color="var(--danger)" sparkData={data.unemployment} onExpand={() => openModal({ label: 'Unemployment', value: `${(unempL?.value ?? 0).toFixed(1)}%`, unit: 'of labor force', data: data.unemployment, color: 'var(--danger)', icon: Users })} />
      </section>

      {/* ─── NATIONAL OUTPUT + MACRO ─── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
        <article className="panel">
          <p className="eyebrow">NATIONAL OUTPUT</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>GDP growth & investment</h3>
          <p className="muted" style={{ marginBottom: '.5rem' }}>Hover over the charts to see exact values for each year</p>
          <BarChart data={data.gdpGrowth} height={170} color="var(--primary)" formatValue={v => `${v.toFixed(1)}%`} />
          <div style={{ marginTop: '.6rem', padding: '.65rem', background: 'var(--bg-sunken)', borderRadius: '8px', fontSize: '.7rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            Nepal grew {(gdpGrL?.value ?? 0).toFixed(1)}% in {gdpGrL?.year}. 
            {inflL && (inflL.value ?? 0) < 5 ? ` Inflation eased to ${(inflL.value ?? 0).toFixed(1)}%.` : ` Inflation stood at ${(inflL?.value ?? 0).toFixed(1)}%.`}
            {` `}GDP per capita reached ${(gdpPcL?.value ?? 0).toLocaleString()}.
          </div>
          <div style={{ marginTop: '.7rem' }}>
            <p className="eyebrow" style={{ margin: '0 0 .35rem' }}>NOMINAL GDP · CURRENT US$</p>
            <LineChart data={data.gdp} color="var(--primary)" height={130} title="GDP over time" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.35rem', marginTop: '.45rem' }}>
              {data.gdp.slice(-4).map(d => (
                <div key={d.year} style={{ padding: '.45rem', background: 'var(--bg-elevated)', borderRadius: '6px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '.52rem', color: 'var(--text-tertiary)' }}>{d.year}</span>
                  <strong style={{ display: 'block', fontSize: '.72rem' }}>{formatUsd(d.value ?? 0)}</strong>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop: '.7rem' }}>
            <p className="eyebrow" style={{ margin: '0 0 .35rem' }}>FOREIGN DIRECT INVESTMENT · % OF GDP</p>
            <LineChart data={data.fdi} color="#8b5cf6" height={110} formatValue={v => `${v.toFixed(2)}%`} title="FDI trend" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.35rem' }}>
              <span style={{ fontSize: '.64rem', color: 'var(--text-secondary)' }}>Latest: {fdiL ? `${(fdiL.value ?? 0).toFixed(2)}% of GDP (${fdiL.year})` : 'N/A'}</span>
              <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>Among the lowest in South Asia</span>
            </div>
          </div>
          <div style={{ marginTop: '.7rem', padding: '.7rem', background: 'var(--bg-sunken)', borderRadius: '10px' }}>
            <p className="eyebrow" style={{ margin: '0 0 .5rem' }}>PUBLIC SPENDING · % OF GDP</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.45rem', marginBottom: '.5rem' }}>
              <div style={{ padding: '.6rem', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <GraduationCap size={16} style={{ color: '#3b82f6', margin: '0 auto .25rem' }} />
                <span style={{ fontSize: '.58rem', color: 'var(--text-secondary)', display: 'block' }}>Education</span>
                <strong style={{ fontSize: '1rem' }}>{eduL ? `${(eduL.value ?? 0).toFixed(1)}%` : 'N/A'}</strong>
              </div>
              <div style={{ padding: '.6rem', background: 'var(--bg-elevated)', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-light)' }}>
                <Heart size={16} style={{ color: '#e11d48', margin: '0 auto .25rem' }} />
                <span style={{ fontSize: '.58rem', color: 'var(--text-secondary)', display: 'block' }}>Health</span>
                <strong style={{ fontSize: '1rem' }}>{healthL ? `${(healthL.value ?? 0).toFixed(1)}%` : 'N/A'}</strong>
              </div>
            </div>
            <LineChart data={data.educationSpending} color="#3b82f6" height={65} formatValue={v => `${v.toFixed(1)}%`} title="Education spending" />
            <div style={{ marginTop: '.3rem' }}>
              <LineChart data={data.healthSpending} color="#e11d48" height={65} formatValue={v => `${v.toFixed(1)}%`} title="Health spending" />
            </div>
            <div style={{ marginTop: '.4rem', fontSize: '.58rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              SDG target: 4–6% education, 5% health.
            </div>
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">MACRO SNAPSHOT</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>Key indicators</h3>
          <p className="muted" style={{ marginBottom: '.5rem' }}>Each with trend line</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.45rem', marginTop: '.25rem' }}>
            <TrendCard icon={BarChart3} label="Inflation rate" value={`${(inflL?.value ?? 0).toFixed(1)}%`} unit="annual %" data={data.inflation} color="var(--warning)" onExpand={() => openModal({ label: 'Inflation rate', value: `${(inflL?.value ?? 0).toFixed(1)}%`, unit: 'annual %', data: data.inflation, color: 'var(--warning)', icon: BarChart3 })} />
            <TrendCard icon={Banknote} label="Remittances" value={formatUsd(remL?.value ?? 0)} data={data.remittances} color="#8b5cf6" onExpand={() => openModal({ label: 'Remittances', value: formatUsd(remL?.value ?? 0), data: data.remittances, color: '#8b5cf6', icon: Banknote })} />
            <TrendCard icon={Users} label="Population" value={formatNum(popL?.value ?? 0)} data={data.population} color="#3b82f6" onExpand={() => openModal({ label: 'Population', value: formatNum(popL?.value ?? 0), data: data.population, color: '#3b82f6', icon: Users })} />
            <TrendCard icon={Landmark} label="Govt debt (% GDP)" value={debtL ? `${(debtL.value ?? 0).toFixed(1)}%` : 'N/A'} data={data.debt} color="#6366f1" onExpand={() => openModal({ label: 'Govt debt (% GDP)', value: debtL ? `${(debtL.value ?? 0).toFixed(1)}%` : 'N/A', data: data.debt, color: '#6366f1', icon: Landmark })} />
            <TrendCard icon={GraduationCap} label="Literacy rate" value={latest(data.literacy) ? `${(latest(data.literacy).value ?? 0).toFixed(1)}%` : 'N/A'} data={data.literacy} color="#3b82f6" onExpand={() => openModal({ label: 'Literacy rate', value: latest(data.literacy) ? `${(latest(data.literacy).value ?? 0).toFixed(1)}%` : 'N/A', data: data.literacy, color: '#3b82f6', icon: GraduationCap })} />
          </div>
        </article>
      </section>

      {/* ─── IMF OUTLOOK (FORECASTS) ─── */}
      {data.imfGdpGrowth.length > 0 && (
        <section style={{ marginBottom: '1rem' }}>
          <article className="panel">
            <p className="eyebrow">IMF WORLD ECONOMIC OUTLOOK · FORECASTS</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>IMF projections</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>IMF projections for Nepal, including forecast years beyond {latest(data.gdpGrowth)?.year}. Click any card to explore the full series.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
              <TrendCard icon={TrendingUp} label="Real GDP growth (actual + forecast)" value={`${(latest(data.imfGdpGrowth)?.value ?? 0).toFixed(1)}%`} unit={`${latest(data.imfGdpGrowth)?.year} projection`} data={data.imfGdpGrowth} color="var(--primary)" wide onExpand={() => openModal({ label: 'Real GDP growth (IMF)', value: `${(latest(data.imfGdpGrowth)?.value ?? 0).toFixed(1)}%`, unit: 'annual %, incl. forecasts', data: data.imfGdpGrowth, color: 'var(--primary)', icon: TrendingUp })} />
              <TrendCard icon={BarChart3} label="Inflation (actual + forecast)" value={`${(latest(data.imfInflation)?.value ?? 0).toFixed(1)}%`} unit={`${latest(data.imfInflation)?.year} projection`} data={data.imfInflation} color="var(--warning)" wide onExpand={() => openModal({ label: 'Inflation (IMF)', value: `${(latest(data.imfInflation)?.value ?? 0).toFixed(1)}%`, unit: 'annual %, incl. forecasts', data: data.imfInflation, color: 'var(--warning)', icon: BarChart3 })} />
              <TrendCard icon={Users} label="Unemployment (actual + forecast)" value={data.imfUnemployment.length ? `${(latest(data.imfUnemployment)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.imfUnemployment.length ? `${latest(data.imfUnemployment)?.year} projection` : undefined} data={data.imfUnemployment} color="var(--danger)" wide onExpand={() => openModal({ label: 'Unemployment (IMF)', value: `${(latest(data.imfUnemployment)?.value ?? 0).toFixed(1)}%`, unit: '% of labor force, incl. forecasts', data: data.imfUnemployment, color: 'var(--danger)', icon: Users })} />
              <TrendCard icon={Globe2} label="Current account balance" value={data.imfCurrentAccount.length ? `${(latest(data.imfCurrentAccount)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.imfCurrentAccount.length ? `% of GDP · ${latest(data.imfCurrentAccount)?.year}` : undefined} data={data.imfCurrentAccount} color="#6366f1" wide onExpand={() => openModal({ label: 'Current account balance (IMF)', value: `${(latest(data.imfCurrentAccount)?.value ?? 0).toFixed(1)}%`, unit: '% of GDP, incl. forecasts', data: data.imfCurrentAccount, color: '#6366f1', icon: Globe2 })} />
              <TrendCard icon={Landmark} label="Govt net debt (actual + forecast)" value={data.imfGovtDebt.length ? `${(latest(data.imfGovtDebt)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.imfGovtDebt.length ? `% of GDP · ${latest(data.imfGovtDebt)?.year} projection` : undefined} data={data.imfGovtDebt} color="#6366f1" wide onExpand={() => openModal({ label: 'Govt net debt (IMF)', value: `${(latest(data.imfGovtDebt)?.value ?? 0).toFixed(1)}%`, unit: '% of GDP, incl. forecasts', data: data.imfGovtDebt, color: '#6366f1', icon: Landmark })} />
              <TrendCard icon={Banknote} label="Fiscal balance (actual + forecast)" value={data.imfFiscalBalance.length ? `${(latest(data.imfFiscalBalance)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.imfFiscalBalance.length ? `% of GDP · ${latest(data.imfFiscalBalance)?.year} projection` : undefined} data={data.imfFiscalBalance} color={((latest(data.imfFiscalBalance)?.value ?? 0) >= 0) ? 'var(--primary)' : 'var(--danger)'} wide onExpand={() => openModal({ label: 'Fiscal balance (IMF)', value: `${(latest(data.imfFiscalBalance)?.value ?? 0).toFixed(1)}%`, unit: '% of GDP, incl. forecasts (negative = deficit)', data: data.imfFiscalBalance, color: 'var(--warning)', icon: Banknote })} />
            </div>
          </article>
        </section>
      )}

      {/* ─── STRUCTURE OF ECONOMY ─── */}
      {(data.agriculture.length > 0 || data.services.length > 0) && (
        <section style={{ marginBottom: '1rem' }}>
          <article className="panel">
            <p className="eyebrow">ECONOMIC STRUCTURE</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>Where Nepal&apos;s output comes from</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Value added by sector as % of GDP. Agriculture has shrunk as services grow.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.6rem' }}>
              <TrendCard icon={Leaf} label="Agriculture" value={`${(latest(data.agriculture)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.agriculture)?.year}`} data={data.agriculture} color="#16a34a" onExpand={() => openModal({ label: 'Agriculture (% of GDP)', value: `${(latest(data.agriculture)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.agriculture, color: '#16a34a', icon: Leaf })} />
              <TrendCard icon={Zap} label="Industry" value={`${(latest(data.industry)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.industry)?.year}`} data={data.industry} color="#e0a351" onExpand={() => openModal({ label: 'Industry (% of GDP)', value: `${(latest(data.industry)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.industry, color: '#e0a351', icon: Zap })} />
              <TrendCard icon={ChartLine} label="Services" value={`${(latest(data.services)?.value ?? 0).toFixed(1)}%`} unit={`of GDP · ${latest(data.services)?.year}`} data={data.services} color="#8b5cf6" onExpand={() => openModal({ label: 'Services (% of GDP)', value: `${(latest(data.services)?.value ?? 0).toFixed(1)}%`, unit: 'sector share', data: data.services, color: '#8b5cf6', icon: ChartLine })} />
              <TrendCard icon={Banknote} label="Investment" value={`${(latest(data.investment)?.value ?? 0).toFixed(1)}%`} unit={`gross capital formation · ${latest(data.investment)?.year}`} data={data.investment} color="#3b82f6" onExpand={() => openModal({ label: 'Investment (% of GDP)', value: `${(latest(data.investment)?.value ?? 0).toFixed(1)}%`, unit: 'gross capital formation', data: data.investment, color: '#3b82f6', icon: Banknote })} />
            </div>
          </article>
        </section>
      )}

      {/* ─── SOCIETY & OPPORTUNITY ─── */}
      {(data.gini.length > 0 || data.poverty.length > 0 || data.urbanPopulation.length > 0 || data.internetUsers.length > 0 || data.mobileSubs.length > 0 || data.primaryEnrollment.length > 0) && (
        <section style={{ marginBottom: '1rem' }}>
          <article className="panel">
            <p className="eyebrow">SOCIETY & OPPORTUNITY</p>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>Inequality, poverty & connectivity</h3>
            <p className="muted" style={{ marginBottom: '.6rem' }}>Who shares in growth, and who does not.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '.6rem' }}>
              <TrendCard icon={BarChart3} label="GINI inequality index" value={data.gini.length ? `${(latest(data.gini)?.value ?? 0).toFixed(1)}` : 'N/A'} unit={data.gini.length ? `0=equal · ${latest(data.gini)?.year}` : undefined} data={data.gini} color="var(--warning)" onExpand={() => openModal({ label: 'GINI index', value: `${(latest(data.gini)?.value ?? 0).toFixed(1)}`, unit: '0 = perfectly equal, 100 = unequal', data: data.gini, color: 'var(--warning)', icon: BarChart3 })} />
              <TrendCard icon={Users} label="Poverty headcount" value={data.poverty.length ? `${(latest(data.poverty)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.poverty.length ? `under $2.15/day · ${latest(data.poverty)?.year}` : undefined} data={data.poverty} color="var(--danger)" onExpand={() => openModal({ label: 'Poverty headcount', value: `${(latest(data.poverty)?.value ?? 0).toFixed(1)}%`, unit: 'share under $2.15/day', data: data.poverty, color: 'var(--danger)', icon: Users })} />
              <TrendCard icon={Landmark} label="Urban population" value={`${(latest(data.urbanPopulation)?.value ?? 0).toFixed(1)}%`} unit={`of total · ${latest(data.urbanPopulation)?.year}`} data={data.urbanPopulation} color="#6366f1" onExpand={() => openModal({ label: 'Urban population', value: `${(latest(data.urbanPopulation)?.value ?? 0).toFixed(1)}%`, unit: 'share living in cities', data: data.urbanPopulation, color: '#6366f1', icon: Landmark })} />
              <TrendCard icon={Zap} label="Internet users" value={`${(latest(data.internetUsers)?.value ?? 0).toFixed(1)}%`} unit={`of population · ${latest(data.internetUsers)?.year}`} data={data.internetUsers} color="var(--primary)" onExpand={() => openModal({ label: 'Internet users', value: `${(latest(data.internetUsers)?.value ?? 0).toFixed(1)}%`, unit: 'share of population online', data: data.internetUsers, color: 'var(--primary)', icon: Zap })} />
              <TrendCard icon={Globe2} label="Mobile subscriptions" value={data.mobileSubs.length ? `${(latest(data.mobileSubs)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.mobileSubs.length ? `per 100 people · ${latest(data.mobileSubs)?.year}` : undefined} data={data.mobileSubs} color="#3b82f6" onExpand={() => openModal({ label: 'Mobile subscriptions', value: `${(latest(data.mobileSubs)?.value ?? 0).toFixed(0)}`, unit: 'subscriptions per 100 people', data: data.mobileSubs, color: '#3b82f6', icon: Globe2 })} />
              <TrendCard icon={GraduationCap} label="Primary enrollment" value={data.primaryEnrollment.length ? `${(latest(data.primaryEnrollment)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.primaryEnrollment.length ? `net rate · ${latest(data.primaryEnrollment)?.year}` : undefined} data={data.primaryEnrollment} color="#16a34a" onExpand={() => openModal({ label: 'Primary enrollment', value: `${(latest(data.primaryEnrollment)?.value ?? 0).toFixed(1)}%`, unit: 'net enrollment rate, primary', data: data.primaryEnrollment, color: '#16a34a', icon: GraduationCap })} />
            </div>
          </article>
        </section>
      )}

      {/* ─── TRADE ─── */}
      <section style={{ marginBottom: '1rem' }}>
        <article className="panel">
          <p className="eyebrow">EXTERNAL SECTOR</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>Trade & remittances</h3>
          <p className="muted" style={{ marginBottom: '.6rem' }}>Exports, imports, and remittances over time.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.6rem', marginBottom: '.6rem' }}>
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.6rem' }}>
            <div>
              <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.55rem' }}>EXPORTS TREND</p>
              <LineChart data={data.exports} color="var(--primary)" height={110} title="Exports over time" />
            </div>
            <div>
              <p className="eyebrow" style={{ margin: '0 0 .3rem', fontSize: '.55rem' }}>IMPORTS TREND</p>
              <LineChart data={data.imports} color="var(--danger)" height={110} title="Imports over time" />
            </div>
          </div>
          <div style={{ marginTop: '.5rem', padding: '.55rem .7rem', background: '#eff4ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
            <Banknote size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <div>
              <span style={{ fontSize: '.6rem', color: '#3b82f6', fontWeight: 600 }}>Remittances ({remL?.year})</span>
              <strong style={{ display: 'block', fontSize: '.88rem', color: '#3b82f6' }}>{formatUsd(remL?.value ?? 0)}</strong>
            </div>
          </div>
        </article>
      </section>

      {/* ─── HUMAN DEV + ENERGY ─── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
        <article className="panel">
          <p className="eyebrow">LIVING STANDARDS</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1rem', margin: '.15rem 0 0' }}>Human development</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.55rem' }}>
            <TrendCard icon={Heart} label="Life expectancy" value={lifeL ? `${(lifeL.value ?? 0).toFixed(1)} yrs` : 'N/A'} data={data.lifeExpectancy} color="#e11d48" wide onExpand={() => openModal({ label: 'Life expectancy', value: lifeL ? `${(lifeL.value ?? 0).toFixed(1)} yrs` : 'N/A', data: data.lifeExpectancy, color: '#e11d48', icon: Heart })} />
            <TrendCard icon={TrendingDown} label="Infant mortality" value={infantL ? `${(infantL.value ?? 0).toFixed(1)}‰` : 'N/A'} unit="per 1,000 live births" data={data.infantMortality} color="var(--primary)" wide onExpand={() => openModal({ label: 'Infant mortality', value: infantL ? `${(infantL.value ?? 0).toFixed(1)}‰` : 'N/A', unit: 'per 1,000 live births', data: data.infantMortality, color: 'var(--primary)', icon: TrendingDown })} />
            <TrendCard icon={Heart} label="Maternal mortality" value={data.maternalMortality.length ? `${(latest(data.maternalMortality)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.maternalMortality.length ? `per 100,000 live births · ${latest(data.maternalMortality)?.year}` : undefined} data={data.maternalMortality} color="#e11d48" wide onExpand={() => openModal({ label: 'Maternal mortality', value: data.maternalMortality.length ? `${(latest(data.maternalMortality)?.value ?? 0).toFixed(0)}` : 'N/A', unit: 'maternal deaths per 100,000 live births', data: data.maternalMortality, color: '#e11d48', icon: Heart })} />
            <TrendCard icon={Users} label="Fertility rate" value={data.fertility.length ? `${(latest(data.fertility)?.value ?? 0).toFixed(1)}` : 'N/A'} unit={data.fertility.length ? `births per woman · ${latest(data.fertility)?.year}` : undefined} data={data.fertility} color="var(--warning)" wide onExpand={() => openModal({ label: 'Fertility rate', value: data.fertility.length ? `${(latest(data.fertility)?.value ?? 0).toFixed(1)}` : 'N/A', unit: 'total births per woman', data: data.fertility, color: 'var(--warning)', icon: Users })} />
          </div>
        </article>

        <article className="panel">
          <p className="eyebrow">ENERGY</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1rem', margin: '.15rem 0 0' }}>Energy & environment</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginTop: '.55rem' }}>
            <TrendCard icon={Zap} label="Electricity access" value={elecL ? `${(elecL.value ?? 0).toFixed(1)}%` : 'N/A'} unit="% of population" data={data.electricityAccess} color="var(--primary)" wide onExpand={() => openModal({ label: 'Electricity access', value: elecL ? `${(elecL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of population', data: data.electricityAccess, color: 'var(--primary)', icon: Zap })} />
            <TrendCard icon={Leaf} label="Renewable energy" value={renewL ? `${(renewL.value ?? 0).toFixed(1)}%` : 'N/A'} unit="% of total energy" data={data.renewableEnergy} color="#16a34a" wide onExpand={() => openModal({ label: 'Renewable energy', value: renewL ? `${(renewL.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of total energy', data: data.renewableEnergy, color: '#16a34a', icon: Leaf })} />
            <TrendCard icon={Leaf} label="Forest area" value={data.forestArea.length ? `${(latest(data.forestArea)?.value ?? 0).toFixed(1)}%` : 'N/A'} unit={data.forestArea.length ? `% of land area · ${latest(data.forestArea)?.year}` : undefined} data={data.forestArea} color="#16a34a" wide onExpand={() => openModal({ label: 'Forest area', value: data.forestArea.length ? `${(latest(data.forestArea)?.value ?? 0).toFixed(1)}%` : 'N/A', unit: '% of land area', data: data.forestArea, color: '#16a34a', icon: Leaf })} />
            <TrendCard icon={Zap} label="Energy use per capita" value={data.energyUse.length ? `${(latest(data.energyUse)?.value ?? 0).toFixed(0)}` : 'N/A'} unit={data.energyUse.length ? `kg oil equiv. · ${latest(data.energyUse)?.year}` : undefined} data={data.energyUse} color="#e0a351" wide onExpand={() => openModal({ label: 'Energy use per capita', value: data.energyUse.length ? `${(latest(data.energyUse)?.value ?? 0).toFixed(0)}` : 'N/A', unit: 'kg of oil equivalent per person', data: data.energyUse, color: '#e0a351', icon: Zap })} />
          </div>
        </article>
      </section>

      {/* ─── POPULATION ─── */}
      <section style={{ marginBottom: '1rem' }}>
        <article className="panel">
          <p className="eyebrow">POPULATION</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1.1rem', margin: '.15rem 0 0' }}>Demographic overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'start', marginTop: '.6rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.5rem', marginBottom: '.5rem' }}>
                <strong style={{ fontSize: '1.6rem', letterSpacing: '-.04em' }}>{formatNum(popL?.value ?? 0)}</strong>
                <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>{popL?.year}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.35rem' }}>
                {[
                  { label: 'Per capita GDP', val: `$${(gdpPcL?.value ?? 0).toLocaleString()}` },
                  { label: 'Per capita PPP', val: `$${(gdpPppL?.value ?? 0).toLocaleString()}` },
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
        </article>
      </section>

      {/* ─── MONETARY & FISCAL ─── */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '.75rem', marginBottom: '1rem' }}>
        <article className="panel">
          <p className="eyebrow">MONETARY</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1rem', margin: '.15rem 0 0' }}>NPR per US dollar</h3>
          {data.exchangeRate.length ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', marginTop: '.5rem' }}>
                <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>रू{(latest(data.exchangeRate)?.value ?? 0).toFixed(2)}</strong>
                <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>$1 · {latest(data.exchangeRate)?.year}</span>
              </div>
              <div style={{ marginTop: '.4rem' }}>
                <LineChart data={data.exchangeRate} color="#e0a351" height={90} formatValue={v => `रू${v.toFixed(2)}`} title="Exchange rate trend" />
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: '.5rem' }}>Exchange rate data unavailable.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">FISCAL CAPACITY</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1rem', margin: '.15rem 0 0' }}>Govt revenue (% of GDP)</h3>
          {data.govtRevenue.length ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', marginTop: '.5rem' }}>
                <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>{(latest(data.govtRevenue)?.value ?? 0).toFixed(1)}%</strong>
                <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>excl. grants · {latest(data.govtRevenue)?.year}</span>
              </div>
              <div style={{ marginTop: '.4rem' }}>
                <LineChart data={data.govtRevenue} color="#16a34a" height={90} formatValue={v => `${v.toFixed(1)}%`} title="Revenue trend" />
              </div>
              <div style={{ marginTop: '.35rem', fontSize: '.58rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Low tax-to-GDP ratio limits Nepal&apos;s ability to fund services without borrowing or remittance-backed spending.
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginTop: '.5rem' }}>Revenue data unavailable.</p>
          )}
        </article>

        <article className="panel">
          <p className="eyebrow">OPENNESS</p>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: '1rem', margin: '.15rem 0 0' }}>Trade (% of GDP)</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.4rem', marginTop: '.5rem' }}>
            <strong style={{ fontSize: '1.3rem', letterSpacing: '-.03em' }}>{(latest(data.tradeOpenness)?.value ?? 0).toFixed(1)}%</strong>
            <span style={{ fontSize: '.6rem', color: 'var(--text-tertiary)' }}>exports + imports · {latest(data.tradeOpenness)?.year}</span>
          </div>
          <div style={{ marginTop: '.4rem' }}>
            <LineChart data={data.tradeOpenness} color="#8b5cf6" height={90} formatValue={v => `${v.toFixed(1)}%`} title="Trade openness trend" />
          </div>
          <div style={{ marginTop: '.35rem', fontSize: '.58rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            Measures how connected Nepal is to global markets relative to its economic size.
          </div>
        </article>
      </section>

      {/* ─── SOURCE ─── */}
      <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)' }}>
        <Info size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <strong style={{ fontSize: '.74rem' }}>Data sources: World Bank Open Data API · IMF World Economic Outlook</strong>
          <p style={{ margin: '.1rem 0 0', fontSize: '.62rem', color: 'var(--text-secondary)' }}>
            Historical data from api.worldbank.org, projections from imf.org DataMapper · NPR conversions use ~133.5 NPR/USD · Hover any chart for exact values
            <a href="https://data.worldbank.org/country/nepal" target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 600, marginLeft: '.3rem' }}>View on World Bank <ArrowUpRight size={10} style={{ display: 'inline' }} /></a>
          </p>
        </div>
      </div>

      {/* ─── MODAL ─── */}
      {modal && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,.25)' }}>
            {/* Modal header */}
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
                {/* Chart type toggle */}
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

            {/* Modal chart */}
            <div style={{ padding: '1.5rem' }}>
              {chartType === 'bar' ? (
                <BarChart data={modal.data} height={320} color={modal.color} formatValue={v => modal.unit?.includes('%') ? `${v.toFixed(1)}%` : v >= 1000000000 ? formatUsd(v) : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(1)} />
              ) : (
                <LineChart data={modal.data} color={modal.color} height={320} showArea={chartType === 'area'} formatValue={v => modal.unit?.includes('%') ? `${v.toFixed(1)}%` : v >= 1000000000 ? formatUsd(v) : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(1)} />
              )}

              {/* High / Low summary */}
              {(() => {
                const sorted = [...modal.data].filter(d => d.value != null).sort((a, b) => (a.value ?? 0) - (b.value ?? 0))
                const low = sorted[0]
                const high = sorted[sorted.length - 1]
                const fmt = (v: number) => modal.unit?.includes('%') ? `${v.toFixed(1)}%` : v >= 1000000000 ? formatUsd(v) : v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(1)
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
