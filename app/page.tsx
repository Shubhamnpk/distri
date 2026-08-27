'use client'

import Link from 'next/link'
import { ArrowUpRight, CircleAlert, Database, FileText, FolderKanban, Globe2, TrendingUp, TrendingDown, Download } from 'lucide-react'
import { LineChart } from '@/components/charts'
import { StatusBadge } from '@/components/shared'
import { sources } from '@/lib/data'

const profitData = [
  { year: '2018/19', value: 12.1 },
  { year: '2019/20', value: 14.5 },
  { year: '2020/21', value: 13.2 },
  { year: '2021/22', value: 17.8 },
  { year: '2022/23', value: 19.3 },
  { year: '2023/24', value: 22.8 },
]

export default function HomePage() {
  return (
    <div className="content-wrap">
      {/* Hero landing */}
      <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', padding: 'clamp(1.5rem, 3vw, 2.5rem)', marginBottom: '.75rem', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p className="eyebrow">NEPAL · PUBLIC DATA, MADE CLEAR</p>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 500, letterSpacing: '-.03em', margin: '.25rem 0' }}>See where the country stands.</h1>
            <p style={{ fontSize: '.8rem', color: 'var(--text-secondary)', maxWidth: '520px', lineHeight: 1.5, margin: 0 }}>A deeper, evidence-first view of government-owned companies and public projects, built from published records.</p>
          </div>
          <button className="outline-button"><Download size={15} /> Download data</button>
        </div>
        <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem' }}>
            <span className="live-dot" />
            <strong style={{ fontSize: '.68rem' }}>Last indexed 26 Aug 2026</strong>
          </div>
          <span style={{ color: 'var(--text-tertiary)', fontSize: '.68rem' }}>·</span>
          <span style={{ fontSize: '.68rem', color: 'var(--text-secondary)' }}>Official sources indexed · figures are not live unless marked</span>
        </div>
      </div>

      {/* Metric cards */}
      <section className="metric-grid">
        <article className="metric-card accent">
          <Database size={18} /><p>Entities tracked</p><strong>49</strong><span>19 enterprises · 30 projects (27 NPP + 3 strategic)</span>
        </article>
        <article className="metric-card">
          <FolderKanban size={18} /><p>Project value tracked</p><strong>NPR 1.77T</strong>
          <span className="positive"><TrendingUp size={14} /> + rail est. NPR 3.27T incl.</span>
        </article>
        <article className="metric-card">
          <Globe2 size={18} /><p>Reporting coverage</p><strong>58%</strong><span>15 of 26 have recent records</span>
        </article>
        <article className="metric-card">
          <CircleAlert size={18} /><p>Need attention</p><strong>8</strong>
          <span className="negative"><TrendingDown size={14} /> 5 projects delayed</span>
        </article>
      </section>

      {/* Trend + Signals */}
      <section className="feature-grid">
        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">COMPANY FINANCES</p><h3>Reported profit is moving upward</h3><p className="muted">Aggregate net result · selected entities · hover for values</p></div>
          </div>
          <div style={{ marginTop: '.75rem' }}>
            <strong style={{ fontSize: '1.5rem', letterSpacing: '-.04em' }}>NPR 22.8B</strong>
            <span className="positive" style={{ marginLeft: '.5rem' }}>+18.6% <small style={{ color: 'var(--text-tertiary)' }}>from FY 22/23</small></span>
          </div>
          <div style={{ marginTop: '.75rem' }}>
            <LineChart data={profitData} color="var(--primary)" height={130} formatValue={v => `NPR ${v}B`} />
          </div>
          <div style={{ marginTop: '.5rem', fontSize: '.6rem', color: 'var(--text-tertiary)' }}>Source: MoF, annual reports</div>
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">WHAT NEEDS A CLOSER LOOK</p><h3>Signals from the latest records</h3></div>
            <CircleAlert style={{ color: 'var(--danger)' }} size={20} />
          </div>
          <div className="signal"><div className="signal-number">01</div><div><strong>Mid-Hill Highway</strong><p>Schedule is behind the latest published target.</p><StatusBadge status="Delayed" /></div></div>
          <div className="signal"><div className="signal-number">02</div><div><strong>Nepal Airlines Corporation</strong><p>Latest available annual report shows a net loss.</p><StatusBadge status="Partial" /></div></div>
          <Link href="/projects" className="panel-link">See all signals <ArrowUpRight size={14} /></Link>
        </article>
      </section>

      {/* Projects + Sources */}
      <section className="lower-grid">
        <article className="panel">
          <div className="section-heading">
            <div><p className="eyebrow">PUBLIC PROJECTS</p><h2>Progress at a glance</h2></div>
            <Link href="/projects" className="text-button">View all projects <ArrowUpRight size={14} /></Link>
          </div>
          <div className="progress-overview">
            <div className="donut"><span><strong>30</strong><small>projects</small></span></div>
            <div className="progress-list">
              <div><span><i className="legend-dot navy" />Completed</span><strong>3 <small>10%</small></strong></div>
              <div><span><i className="legend-dot green" />On track</span><strong>5 <small>17%</small></strong></div>
              <div><span><i className="legend-dot amber" />At risk</span><strong>9 <small>30%</small></strong></div>
              <div><span><i className="legend-dot red" />Delayed</span><strong>13 <small>43%</small></strong></div>
            </div>
          </div>
          <div className="location-strip"><Globe2 size={16} /><span>Projects across <strong>7 provinces</strong></span><Link href="/projects">Explore tracker <ArrowUpRight size={13} /></Link></div>
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
