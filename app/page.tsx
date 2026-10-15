'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, ArrowUpRight, CircleAlert, Database, FileText, FolderKanban, Globe2, TrendingUp, TrendingDown, CloudSun, Landmark } from 'lucide-react'
import { StatusBadge } from '@/components/shared'
import { companies, projects, parseBudgetCr, sources } from '@/lib/data'
import { getNrbUsdRate } from '@/lib/nrb'
import { fetchNepseIndex, fetchNepseStocks } from '@/lib/nepse'
import { fetchWbProjectCount } from '@/lib/api'
import { fetchCurrentWeather, fetchCurrentPm25, type CurrentWeather } from '@/lib/meteo'

// ── Everything below is computed from tracked records + live feeds. ──
// No hardcoded totals: if the dataset grows, the homepage follows.
const trackedTotal = companies.length + projects.length
const totalBudgetCr = projects.reduce((s, p) => s + (parseBudgetCr(p.budget) ?? 0), 0)

function fmtBudgetCr(cr: number): string {
  if (cr >= 100000) return `NPR ${(cr / 100000).toFixed(2)}T`
  if (cr >= 100) return `NPR ${(cr / 100).toFixed(1)}B`
  return `NPR ${Math.round(cr).toLocaleString()} Cr`
}

const statusCount = (s: string) => projects.filter(p => p.status === s).length
const statusPct = (s: string) => Math.round((statusCount(s) / projects.length) * 100)
const provinceCount = new Set(projects.map(p => p.province).filter(p => p !== 'National')).size

const operating = companies.filter(c => c.operatingStatus === 'Operating')
const profitCount = operating.filter(c => c.resultType === 'up').length
const lossCount = operating.filter(c => c.resultType === 'down').length

const signalProject = projects.find(p => p.status === 'Delayed')
const signalCompany = companies.find(c => c.operatingStatus === 'Operating' && c.resultType === 'down')

// Donut segments (degrees) from live status shares: completed+on-track, at-risk, delayed
const donutA = ((statusCount('Completed') + statusCount('On track')) / projects.length) * 360
const donutB = donutA + (statusCount('At risk') / projects.length) * 360
const donutStyle = {
  background: `conic-gradient(var(--accent) 0deg ${donutA}deg, var(--warning) ${donutA}deg ${donutB}deg, var(--danger) ${donutB}deg 360deg)`,
}

type Live = {
  rate: number | null
  nepse: { v: number; chg: number } | null
  breadth: { adv: number; dec: number } | null
  wbCount: number | null
  temp: number | null
  pm25: number | null
}

export default function HomePage() {
  const [live, setLive] = useState<Live>({ rate: null, nepse: null, breadth: null, wbCount: null, temp: null, pm25: null })

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [rate, ix, stocks, wb, wx, pm] = await Promise.all([
        getNrbUsdRate().catch(() => null),
        fetchNepseIndex().catch(() => null),
        fetchNepseStocks().catch(() => []),
        fetchWbProjectCount().catch(() => 0),
        fetchCurrentWeather().catch(() => null),
        fetchCurrentPm25().catch(() => null),
      ])
      if (cancelled) return
      const v = ix?.close ?? 0
      const chg = ix?.change ?? 0
      const adv = stocks.filter(s => (s.percentChange ?? 0) > 0).length
      const dec = stocks.filter(s => (s.percentChange ?? 0) < 0).length
      setLive({
        rate,
        nepse: v > 0 ? { v, chg } : null,
        breadth: stocks.length ? { adv, dec } : null,
        wbCount: wb > 0 ? wb : null,
        temp: (wx as CurrentWeather | null)?.temperature_2m ?? null,
        pm25: pm,
      })
    }
    load()
    return () => { cancelled = true }
  }, [])

  const tape: { label: string; value: string; up?: boolean }[] = []
  if (live.nepse) tape.push({ label: 'NEPSE', value: `${live.nepse.v.toFixed(2)} (${live.nepse.chg >= 0 ? '+' : ''}${live.nepse.chg.toFixed(2)})`, up: live.nepse.chg >= 0 })
  if (live.rate) tape.push({ label: 'USD/NPR', value: `रू${live.rate.toFixed(2)}` })
  if (live.breadth) {
    tape.push({ label: 'Advances', value: String(live.breadth.adv), up: true })
    tape.push({ label: 'Declines', value: String(live.breadth.dec), up: false })
  }
  if (live.temp != null) tape.push({ label: 'Kathmandu', value: `${live.temp.toFixed(1)}°C` })
  if (live.pm25 != null) tape.push({ label: 'PM2.5', value: `${live.pm25.toFixed(1)}`, up: live.pm25 < 35.5 })
  tape.push({ label: 'Entities tracked', value: String(trackedTotal) })
  tape.push({ label: 'Project value', value: fmtBudgetCr(totalBudgetCr) })
  // short tapes leave a blank gap on wide screens - repeat until the track overflows
  const loop = tape.length < 6 ? [...tape, ...tape, ...tape, ...tape] : [...tape, ...tape]

  return (
    <div className="content-wrap">
      {/* ── Live ticker tape ── */}
      {tape.length > 0 && (
        <div className="ticker" aria-hidden={false}>
          <div className="ticker-track">
            {loop.map((t, i) => (
              <span key={i} className="ticker-item">
                <span className="ticker-label">{t.label}</span>
                <strong className={t.up === undefined ? '' : t.up ? 'ticker-up' : 'ticker-down'}>{t.value}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="hero">
        <div>
          <p className="eyebrow">NEPAL · PUBLIC DATA, MADE CLEAR</p>
          <h1>Where does the nation&apos;s money go?</h1>
          <p className="lede">
            Drishti follows every rupee through Nepal&apos;s government-owned companies and public
            infrastructure - from annual reports to live markets, weather to tremors.
          </p>
          <div className="hero-cta">
            <Link href="/companies" className="cta-primary">Explore companies <ArrowRight size={15} /></Link>
            <Link href="/projects" className="cta-ghost">Track projects <ArrowUpRight size={15} /></Link>
          </div>
          <div className="hero-meta">
            <span className="live-dot" />
            <strong>{trackedTotal} entities tracked from published records</strong>
            <span>·</span>
            <span>Official sources indexed · tape figures are live where marked</span>
          </div>
        </div>
        <aside className="hero-visual" aria-label="Live Nepal snapshot">
          <div className="sun" />
          <svg className="ridge" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,90 L50,55 L95,78 L150,35 L210,70 L265,30 L320,66 L370,45 L400,60 L400,120 L0,120 Z" fill="rgba(6,40,32,.55)" />
            <path d="M0,100 L70,72 L140,92 L220,60 L300,88 L400,74 L400,120 L0,120 Z" fill="rgba(4,26,21,.7)" />
          </svg>
          <div className="chip chip-1">
            <TrendingUp size={16} style={{ color: 'var(--accent)' }} />
            <div><small>NEPSE</small><strong>{live.nepse ? live.nepse.v.toFixed(2) : '-'}</strong></div>
          </div>
          <div className="chip chip-2">
            <Globe2 size={16} style={{ color: 'var(--accent)' }} />
            <div><small>USD / NPR · NRB</small><strong>{live.rate ? `रू${live.rate.toFixed(2)}` : '-'}</strong></div>
          </div>
          <div className="chip chip-3">
            <CloudSun size={16} style={{ color: 'var(--accent)' }} />
            <div><small>Kathmandu · PM2.5</small><strong>{live.temp != null ? `${live.temp.toFixed(1)}°C` : '-'}{live.pm25 != null ? ` · ${live.pm25.toFixed(0)}` : ''}</strong></div>
          </div>
        </aside>
      </section>

      {/* ── KPI cards ── */}
      <section className="metric-grid">
        <article className="metric-card accent">
          <Database size={18} /><p>Entities tracked</p><strong>{trackedTotal}</strong><span>{companies.length} enterprises · {projects.length} projects</span>
        </article>
        <article className="metric-card">
          <FolderKanban size={18} /><p>Project value tracked</p><strong>{fmtBudgetCr(totalBudgetCr)}</strong>
          <span className="positive"><TrendingUp size={14} /> {live.wbCount ? `${live.wbCount} World Bank projects co-financed` : 'Sum of published budgets'}</span>
        </article>
        <article className="metric-card">
          <Landmark size={18} /><p>NEPSE index</p><strong>{live.nepse ? live.nepse.v.toFixed(2) : '-'}</strong>
          {live.nepse
            ? <span className={live.nepse.chg >= 0 ? 'positive' : 'negative'}>{live.nepse.chg >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />} {live.nepse.chg >= 0 ? '+' : ''}{live.nepse.chg.toFixed(2)} today</span>
            : <span>Live when market feeds answer</span>}
        </article>
        <article className="metric-card">
          <Globe2 size={18} /><p>Dollar rate today</p><strong>{live.rate ? `रू${live.rate.toFixed(2)}` : '-'}</strong>
          <span>{live.rate ? 'NRB official fixing' : 'Fetching NRB feed…'}</span>
        </article>
      </section>

      {/* ── Trend + Signals ── */}
      <section className="feature-grid">
        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">COMPANY FINANCES</p><h3>Who reported a profit?</h3><p className="muted">{operating.length} operating enterprises · latest published results</p></div>
          </div>
          <div style={{ marginTop: '.75rem' }}>
            <strong style={{ fontSize: '1.5rem', letterSpacing: '-.04em' }}>{profitCount} profitable</strong>
            <span style={{ marginLeft: '.5rem', fontSize: '.72rem', color: 'var(--text-secondary)' }}>of {operating.length} operating</span>
          </div>
          <div style={{ marginTop: '.75rem', display: 'flex', flexDirection: 'column', gap: '.45rem' }}>
            {[
              { label: 'Profit', n: profitCount, color: 'var(--primary)', bg: 'var(--primary-50)' },
              { label: 'Loss', n: lossCount, color: 'var(--danger)', bg: 'var(--danger-light)' },
            ].map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.68rem', marginBottom: '.2rem' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{r.label}</span>
                  <strong>{r.n}</strong>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: r.bg, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${operating.length ? (r.n / operating.length) * 100 : 0}%`, background: r.color, borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '.6rem', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
            Closed and pre-operation enterprises excluded - see Companies. Source: MoF PE reviews, annual reports.
          </div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">WHAT NEEDS A CLOSER LOOK</p><h3>Signals from the latest records</h3></div>
            <CircleAlert style={{ color: 'var(--danger)' }} size={20} />
          </div>
          {signalProject && (
            <div className="signal"><div className="signal-number">01</div><div><strong>{signalProject.name}</strong><p>Physical progress {signalProject.progress}% · target {signalProject.target}.</p><StatusBadge status={signalProject.status} /></div></div>
          )}
          {signalCompany && (
            <div className="signal"><div className="signal-number">02</div><div><strong>{signalCompany.name}</strong><p>{signalCompany.result} · {signalCompany.year}.</p><StatusBadge status={signalCompany.coverage} /></div></div>
          )}
          <Link href="/projects" className="panel-link">See all signals <ArrowUpRight size={14} /></Link>
        </article>
      </section>

      {/* ── Projects + Environment + Sources ── */}
      <section className="lower-grid-3">
        <article className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">PUBLIC PROJECTS</p><h2>Progress at a glance</h2></div>
            <Link href="/projects" className="text-button">All projects <ArrowUpRight size={14} /></Link>
          </div>
          <div className="progress-overview">
            <div className="donut" style={donutStyle}><span><strong>{projects.length}</strong><small>projects</small></span></div>
            <div className="progress-list">
              <div><span><i className="legend-dot navy" />Completed</span><strong>{statusCount('Completed')} <small>{statusPct('Completed')}%</small></strong></div>
              <div><span><i className="legend-dot green" />On track</span><strong>{statusCount('On track')} <small>{statusPct('On track')}%</small></strong></div>
              <div><span><i className="legend-dot amber" />At risk</span><strong>{statusCount('At risk')} <small>{statusPct('At risk')}%</small></strong></div>
              <div><span><i className="legend-dot red" />Delayed</span><strong>{statusCount('Delayed')} <small>{statusPct('Delayed')}%</small></strong></div>
            </div>
          </div>
          <div className="location-strip"><Globe2 size={16} /><span>Projects across <strong>{provinceCount} provinces</strong></span><Link href="/projects">Explore tracker <ArrowUpRight size={13} /></Link></div>
        </article>

        <article className="panel sky-panel">
          <div className="section-heading">
            <div><p className="eyebrow">LIVE ENVIRONMENT</p><h2>Sky over Kathmandu</h2></div>
            <Link href="/environment" className="text-button">Full picture <ArrowUpRight size={14} /></Link>
          </div>
          <div className="sky-now">
            <CloudSun size={30} />
            <strong>{live.temp != null ? `${live.temp.toFixed(1)}°C` : '-'}</strong>
            <span>{live.pm25 != null ? `PM2.5 ${live.pm25.toFixed(1)} µg/m³` : 'Reading sensors…'}</span>
          </div>
          <p className="muted">Monsoon floods and winter smog move budgets. Weather, air and tremors sit beside every project.</p>
        </article>

        <article className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">RECENTLY PUBLISHED</p><h2>Latest source updates</h2></div>
            <Link href="/sources" className="text-button">All sources <ArrowUpRight size={14} /></Link>
          </div>
          {sources.slice(0, 3).map(s => (
            <a className="source-row" key={s.title} href={s.url} target="_blank" rel="noreferrer">
              <div className="file-icon"><FileText size={16} /></div>
              <div><strong>{s.title}</strong><p>{s.publisher} · {s.date}</p></div>
              <ArrowUpRight size={14} />
            </a>
          ))}
        </article>
      </section>
    </div>
  )
}
