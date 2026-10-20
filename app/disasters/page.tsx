'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Banknote, Flame, HandCoins, ShieldCheck, Wind, Waves } from 'lucide-react'
import { BarChart, LineChart, ProgressRing } from '@/components/charts'
import { formatNpr, formatNum } from '@/lib/currency'
import {
  fetchBipadBudgetActivities, fetchBipadFiscalYears, fetchBipadGeo, fetchBipadHazards,
  fetchBipadIncidentProfile, fetchBipadIncidentRelief, fetchBipadIncidents, fetchBipadLossesByIds,
  type BipadBudgetActivity, type BipadFiscalYear, type BipadGeo, type BipadHazard,
  type BipadIncident, type BipadIncidentProfile, type BipadLoss, type BipadRelief,
} from '@/lib/bipad'

const TH = {
  textAlign: 'left' as const, padding: '.45rem .55rem', borderBottom: '1px solid var(--border)',
  fontSize: '.56rem', letterSpacing: '.09em', textTransform: 'uppercase' as const, fontWeight: 700, whiteSpace: 'nowrap' as const,
}
const TD = { padding: '.5rem .55rem', borderBottom: '1px solid var(--border-light)', verticalAlign: 'top' as const }
const NUM = { ...TD, textAlign: 'right' as const, fontVariantNumeric: 'tabular-nums' as const }

/** How many recent incidents get their own loss record pulled in - one request each. */
const INCIDENT_WINDOW = 50

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDate(iso?: string | null): string {
  if (!iso) return '-'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return m && d ? `${Number(d)} ${MONTHS[Number(m) - 1] ?? m} ${y}` : y
}

function Ledger({ head, children, minWidth = 720 }: { head: string[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="overflow-x-auto" style={{ marginTop: '.9rem' }}>
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontSize: '.7rem' }}>
        <thead>
          <tr>{head.map(h => <th key={h} className="text-tertiary" style={TH}>{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

function HazardTag({ hazard }: { hazard?: BipadHazard }) {
  const color = hazard?.color ?? '#64748b'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '.3rem', whiteSpace: 'nowrap',
      padding: '.12rem .42rem', borderRadius: 6, fontSize: '.6rem', fontWeight: 700,
      color, background: `${color}1f`, border: `1px solid ${color}44`,
    }}>
      {hazard?.titleEn ?? hazard?.title ?? 'Unclassified'}
    </span>
  )
}

const n = (v: number | null | undefined): string => (v == null ? '-' : formatNum(v))

export default function DisastersPage() {
  const [profile, setProfile] = useState<BipadIncidentProfile[]>([])
  const [hazards, setHazards] = useState<BipadHazard[]>([])
  const [incidents, setIncidents] = useState<BipadIncident[]>([])
  const [losses, setLosses] = useState<BipadLoss[]>([])
  const [lossesPending, setLossesPending] = useState(true)
  const [relief, setRelief] = useState<BipadRelief[]>([])
  const [reliefCount, setReliefCount] = useState(0)
  const [districts, setDistricts] = useState<BipadGeo[]>([])
  const [municipalities, setMunicipalities] = useState<BipadGeo[]>([])
  const [fiscalYears, setFiscalYears] = useState<BipadFiscalYear[]>([])
  const [budget, setBudget] = useState<BipadBudgetActivity[]>([])
  const [budgetCount, setBudgetCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const [hazardFilter, setHazardFilter] = useState('all')
  const [verifiedOnly, setVerifiedOnly] = useState(false)
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [showAllBudget, setShowAllBudget] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [p, hz, inc, rel, dist, muni, fy, bud] = await Promise.all([
        fetchBipadIncidentProfile(),
        fetchBipadHazards(),
        fetchBipadIncidents(INCIDENT_WINDOW, 'id,title,incident_on,hazard,loss,verified,data_source'),
        fetchBipadIncidentRelief(100),
        fetchBipadGeo('district', 100),
        fetchBipadGeo('municipality', 1000, 'id,title,district'),
        fetchBipadFiscalYears(60),
        fetchBipadBudgetActivities(200),
      ])
      if (cancelled) return
      setProfile(p)
      setHazards(hz.results)
      setIncidents(inc.results)
      setRelief(rel.results)
      setReliefCount(rel.count)
      setDistricts(dist.results)
      setMunicipalities(muni.results)
      setFiscalYears(fy.results)
      setBudget(bud.results)
      setBudgetCount(bud.count)
      setLoading(false)
      const losses = await fetchBipadLossesByIds(inc.results.map(i => Number(i.loss)).filter(Boolean))
      if (cancelled) return
      setLosses(losses)
      setLossesPending(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const hazardById = useMemo(() => new Map(hazards.map(h => [h.id, h])), [hazards])
  const lossById = useMemo(() => new Map(losses.map(l => [l.id, l])), [losses])
  const districtById = useMemo(() => new Map(districts.map(d => [d.id, d])), [districts])
  const muniById = useMemo(() => new Map(municipalities.map(m => [m.id, m])), [municipalities])
  const fyById = useMemo(() => new Map(fiscalYears.map(f => [f.id, f])), [fiscalYears])

  const rows = useMemo(() => incidents.map(i => ({ ...i, lost: lossById.get(Number(i.loss)) })), [incidents, lossById])

  const hazardCounts = useMemo(() => {
    const m = new Map<number, number>()
    for (const r of rows) { const id = Number(r.hazard); m.set(id, (m.get(id) ?? 0) + 1) }
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const orderedRows = useMemo(() => [...rows].sort((a, b) => (b.incidentOn ?? '').localeCompare(a.incidentOn ?? '')), [rows])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orderedRows.filter(r =>
      (hazardFilter === 'all' || Number(r.hazard) === Number(hazardFilter)) &&
      (!verifiedOnly || r.verified) &&
      (!q || String(r.title ?? '').toLowerCase().includes(q)),
    )
  }, [orderedRows, hazardFilter, verifiedOnly, query])

  const profileOrdered = useMemo(() => [...profile].sort((a, b) => a.year - b.year), [profile])
  const series = useMemo(() => ({
    incidents: profileOrdered.map(p => ({ year: String(p.year), value: p.values.incidentCount })),
    deaths: profileOrdered.map(p => ({ year: String(p.year), value: p.values.peopleDeathCount })),
    loss: profileOrdered.map(p => ({ year: String(p.year), value: p.values.estimatedTotalLoss || null })),
    houses: profileOrdered.map(p => ({ year: String(p.year), value: p.values.totalInfrastructureDestroyedCount || null })),
  }), [profileOrdered])

  const ytd = profileOrdered[profileOrdered.length - 1] ?? null
  const lastFull = useMemo(() => [...profileOrdered].reverse().find(p => p.year < new Date().getFullYear()) ?? null, [profileOrdered])

  const reliefRows = useMemo(() => relief.map(r => ({
    ...r,
    districtName: r.district != null ? districtById.get(r.district)?.title : undefined,
    muniName: r.municipality != null ? muniById.get(r.municipality)?.title : undefined,
    fyLabel: r.fiscalYear != null ? fyById.get(r.fiscalYear)?.titleEn : undefined,
  })), [relief, districtById, muniById, fyById])

  const reliefTotal = useMemo(() => {
    const dates = reliefRows.map(r => r.dateOfReliefDistribution).filter((d): d is string => !!d).sort()
    return {
      amount: reliefRows.reduce((s, r) => s + (Number(r.reliefAmountNpr) || 0), 0),
      families: reliefRows.reduce((s, r) => s + (Number(r.numberOfBeneficiaryFamily) || 0), 0),
      male: reliefRows.reduce((s, r) => s + (Number(r.totalMaleBenefited) || 0), 0),
      female: reliefRows.reduce((s, r) => s + (Number(r.totalFemaleBenefited) || 0), 0),
      from: dates[0] ?? null,
      to: dates[dates.length - 1] ?? null,
    }
  }, [reliefRows])

  const budgetStats = useMemo(() => {
    const total = budget.reduce((s, b) => s + (Number(b.amount) || 0), 0)
    const spent = budget.reduce((s, b) => s + (Number(b.expenditure) || 0), 0)
    const fundTypes = new Map<string, { amount: number; count: number }>()
    const statuses = new Map<string, number>()
    const donors = new Map<string, number>()
    for (const b of budget) {
      const key = b.fundType?.trim() || b.otherFundType?.trim() || 'Unspecified'
      const f = fundTypes.get(key) ?? { amount: 0, count: 0 }
      f.amount += Number(b.amount) || 0
      f.count += 1
      fundTypes.set(key, f)
      const st = b.status?.trim() || 'No status recorded'
      statuses.set(st, (statuses.get(st) ?? 0) + 1)
      if (b.donerOrganization) donors.set(b.donerOrganization, (donors.get(b.donerOrganization) ?? 0) + 1)
    }
    return {
      total, spent,
      pct: total > 0 ? (spent / total) * 100 : 0,
      unpriced: budget.filter(b => b.amount == null).length,
      noSpend: budget.filter(b => b.expenditure == null).length,
      fundTypes: [...fundTypes.entries()].sort((a, b) => b[1].amount - a[1].amount),
      statuses: [...statuses.entries()].sort((a, b) => b[1] - a[1]),
      donors: [...donors.entries()].sort((a, b) => b[1] - a[1]),
    }
  }, [budget])

  const budgetSorted = useMemo(() => [...budget].sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)), [budget])
  const incidentRows = showAll ? filtered : filtered.slice(0, 25)
  const budgetRows = showAllBudget ? budgetSorted : budgetSorted.slice(0, 25)

  return (
    <div className="content-wrap">
      <section className="disaster-hero">
        <div className="disaster-hero-copy">
          <p className="eyebrow">NATIONAL DISASTER MONITOR</p>
          <h1>Disaster impact, relief and recovery</h1>
          <p className="muted">Explore Nepal&apos;s official incident records, reported damage, relief distributions and local disaster-risk budgets in one place.</p>
          <nav className="disaster-hero-links" aria-label="Disaster page sections">
            <a href="#incidents">Recent incidents <ArrowUpRight size={13} /></a>
            <a href="#relief">Relief records <ArrowUpRight size={13} /></a>
            <a href="#recovery">Recovery outlook <ArrowUpRight size={13} /></a>
          </nav>
        </div>
        <aside className="disaster-hero-source">
          <span className="disaster-live-dot" />
          <span className="eyebrow">OFFICIAL DATA</span>
          <strong>BIPAD · NDRRMA</strong>
          <p>Records are read from the government portal and refreshed hourly. Dates and missing fields follow the source.</p>
          <a href="https://bipadportal.gov.np" target="_blank" rel="noreferrer">Open BIPAD portal <ArrowUpRight size={13} /></a>
        </aside>
      </section>
      {/* ── What NDRRMA recorded ── */}
      <section className="panel">
        <p className="eyebrow">BIPAD · NDRRMA DISASTER LEDGER</p>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.9rem', letterSpacing: '-.03em', margin: 0, fontWeight: 500 }}>
          What Nepal recorded, reported and budgeted
        </h2>
        <p className="muted" style={{ maxWidth: 720 }}>
          NDRRMA&apos;s BIPAD portal is the official record of disaster incidents, losses, relief and DRR budgets.
          Annual totals and incident details come from NDRRMA&apos;s records. Tables show recent incident, relief and budget entries available through BIPAD.
        </p>
        <div className="metric-grid">
          {[
            { label: `Incidents recorded · ${ytd?.year ?? '-'}`, val: ytd ? formatNum(ytd.values.incidentCount) : '-', sub: ytd?.year === new Date().getFullYear() ? 'year to date, still accruing' : 'latest year available in the source' },
            { label: `Deaths recorded · ${ytd?.year ?? '-'}`, val: ytd ? formatNum(ytd.values.peopleDeathCount) : '-', sub: `${ytd ? formatNum(ytd.values.peopleInjuredCount) : '-'} injured · ${ytd ? formatNum(ytd.values.peopleMissingCount) : '-'} missing` },
            { label: `Estimated loss · ${lastFull?.year ?? '-'}`, val: lastFull ? formatNpr(lastFull.values.estimatedTotalLoss) : '-', sub: 'as reported in incident loss records' },
            { label: `Houses destroyed · ${lastFull?.year ?? '-'}`, val: lastFull ? formatNum(lastFull.values.totalInfrastructureDestroyedCount) : '-', sub: 'infrastructure detail in incident records' },
          ].map(c => (
            <div key={c.label} className="metric-card">
              <p>{c.label}</p>
              <strong>{c.val}</strong>
              <span>{c.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── 16 years ── */}
      <section id="recovery" className="disaster-recovery panel">
        <div className="disaster-recovery-icon"><Waves size={20} /></div>
        <div className="disaster-recovery-body">
          <p className="eyebrow">RECOVERY IN FOCUS · RASUWA–BHOTEKOSHI FLOOD</p>
          <h2>Rebuilding needs extend well beyond emergency relief</h2>
          <p className="muted">NDRRMA&apos;s rapid damage and needs assessment, published 11 September 2026, estimated damage and losses above {formatNpr(408_280_000_000)}. It estimated {formatNpr(723_315_200_000)} for recovery and reconstruction, including {formatNpr(8_735_000_000)} for immediate relief and short-term recovery over six months.</p>
          <p className="disaster-recovery-note">These are assessment estimates for planning. They do not mean the money has been allocated, spent or delivered to affected households.</p>
          <a href="https://ndrrma.gov.np/en/news/239" target="_blank" rel="noreferrer">Read NDRRMA&apos;s assessment summary <ArrowUpRight size={13} /></a>
          <a href="https://ndrrma.gov.np/en/situation-report" target="_blank" rel="noreferrer">Browse official response situation reports <ArrowUpRight size={13} /></a>
        </div>
        <div className="disaster-recovery-figure">
          <span>ESTIMATED RECOVERY NEED</span>
          <strong>{formatNpr(723_315_200_000)}</strong>
          <small>Rasuwa–Bhotekoshi flood · 2026 assessment</small>
        </div>
      </section>

      <section className="feature-grid">
        <article className="panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{profile.length || 16} YEARS · {series.incidents[0]?.year ?? '2011'}–{ytd?.year ?? '2026'}</p>
              <h2>Incidents recorded per year</h2>
            </div>
            <Flame style={{ color: 'var(--danger)' }} size={20} />
          </div>
          {loading && !profile.length ? <p className="muted">Loading…</p> : series.incidents.length ? (
            <div style={{ marginTop: '.9rem' }}>
              <BarChart data={series.incidents} color="var(--danger)" height={190} yAxis formatValue={formatNum} />
              {series.incidents.some(d => d.year === '2015') && <p className="muted" style={{ marginTop: '.6rem' }}>
                The 2015 series includes {series.incidents.find(d => d.year === '2015')?.value.toLocaleString()} recorded incidents and {series.deaths.find(d => d.year === '2015')?.value.toLocaleString()} deaths. The latest year may be incomplete.
              </p>}
            </div>
          ) : <p className="muted">Series unavailable.</p>}
        </article>

        <article className="panel">
          <div className="panel-head">
            <div><p className="eyebrow">SAME YEARS · SAME SOURCE</p><h3>Deaths and reported loss</h3></div>
            <ShieldCheck style={{ color: 'var(--accent)' }} size={20} />
          </div>
          <div style={{ display: 'grid', gap: '.9rem', marginTop: '.9rem' }}>
            <LineChart data={series.deaths} color="var(--danger)" height={100} title="Deaths per year" formatValue={formatNum} />
            <LineChart data={series.loss} color="var(--accent)" height={100} title="Estimated loss per year" formatValue={formatNpr} />
          </div>
          <p className="muted" style={{ marginTop: '.6rem' }}>
            Loss is the summed damage estimate NDRRMA attached to that year&apos;s incidents - not a budget or a payout.
          </p>
        </article>
      </section>

      {/* ── Per-incident accountability ── */}
      <section id="incidents" className="panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">INCIDENT-BY-INCIDENT · LATEST {incidents.length} SOURCE RECORDS</p>
            <h2>What was recorded for each incident</h2>
            <p className="muted">
              Casualties and damage are read from the loss record NDRRMA attached to the incident{lossesPending ? ' - still loading' : ''}.
              A dash means no figure was recorded for that incident.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.9rem' }}>
          <select value={hazardFilter} onChange={e => setHazardFilter(e.target.value)}>
            <option value="all">All hazards ({rows.length})</option>
            {hazardCounts.map(([id, count]) => (
              <option key={id} value={id}>{hazardById.get(id)?.titleEn ?? hazardById.get(id)?.title ?? `Hazard ${id}`} ({count})</option>
            ))}
          </select>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search incident title"
            style={{ background: 'var(--bg-sunken)', border: 0, borderRadius: 6, padding: '.4rem .6rem', fontSize: '.7rem', minWidth: 190, color: 'var(--text)' }}
          />
          <label className="status-badge" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '.35rem' }}>
            <input type="checkbox" checked={verifiedOnly} onChange={e => setVerifiedOnly(e.target.checked)} />
            Verified only
          </label>
        </div>
        {loading && !rows.length ? <p className="muted" style={{ marginTop: '.75rem' }}>Loading…</p> : (
          <>
            <Ledger minWidth={880} head={['Date', 'Hazard', 'Incident', 'Deaths', 'Missing', 'Injured', 'Families affected', 'Houses destroyed', 'Estimated loss']}>
              {incidentRows.map(r => (
                <tr key={r.id}>
                  <td style={TD}>{fmtDate(r.incidentOn)}</td>
                  <td style={TD}><HazardTag hazard={hazardById.get(Number(r.hazard))} /></td>
                  <td style={TD}>
                    <strong style={{ display: 'block', fontWeight: 600 }}>{String(r.title ?? '-')}</strong>
                    <small className="text-tertiary" style={{ fontSize: '.6rem' }}>
                      {r.verified ? 'verified' : 'unverified'}{r.dataSource ? ` · ${r.dataSource}` : ''}
                    </small>
                  </td>
                  <td style={{ ...NUM, color: (r.lost?.peopleDeathCount ?? 0) > 0 ? 'var(--danger)' : undefined }}>{n(r.lost?.peopleDeathCount)}</td>
                  <td style={NUM}>{n(r.lost?.peopleMissingCount)}</td>
                  <td style={NUM}>{n(r.lost?.peopleInjuredCount)}</td>
                  <td style={NUM}>{n(r.lost?.familyAffectedCount)}</td>
                  <td style={NUM}>{n(r.lost?.infrastructureDestroyedHouseCount)}</td>
                  <td style={NUM}>{r.lost?.estimatedLoss ? formatNpr(r.lost.estimatedLoss) : '-'}</td>
                </tr>
              ))}
              {!incidentRows.length && <tr><td colSpan={9} style={TD}><span className="muted">No incidents match this filter.</span></td></tr>}
            </Ledger>
            {filtered.length > 25 && (
              <button className="panel-link" onClick={() => setShowAll(v => !v)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, marginTop: '.6rem' }}>
                {showAll ? 'Show fewer' : `Show all ${filtered.length}`}
              </button>
            )}
          </>
        )}
      </section>

      {/* ── Relief ── */}
      <section id="relief" className="panel" style={{ marginTop: '.75rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">RELIEF DISTRIBUTED · {relief.length} OF {reliefCount} SOURCE RECORDS</p>
            <h3>Relief money, recorded</h3>
            <p className="muted">Every relief distribution BIPAD carries: who received it, when, how much, and the gender split recorded.</p>
          </div>
          <HandCoins style={{ color: 'var(--accent)' }} size={20} />
        </div>
        {loading && !relief.length ? <p className="muted" style={{ marginTop: '.75rem' }}>Loading…</p> : reliefRows.length ? (
          <>
            <div className="metric-grid" style={{ paddingBottom: 0 }}>
              {[
                { label: 'Relief in loaded records', val: formatNpr(reliefTotal.amount), sub: `${reliefRows.length} of ${reliefCount} BIPAD records` },
                { label: 'Beneficiary families', val: formatNum(reliefTotal.families), sub: `${formatNum(reliefTotal.male)} male · ${formatNum(reliefTotal.female)} female recorded` },
                { label: 'Window covered', val: fmtDate(reliefTotal.from), sub: `latest record ${fmtDate(reliefTotal.to)}` },
                { label: `Loss reported · ${lastFull?.year ?? '-'}`, val: lastFull ? formatNpr(lastFull.values.estimatedTotalLoss) : '-', sub: 'incident loss records, all hazards, nationally' },
              ].map(c => (
                <div key={c.label} className="metric-card">
                  <p>{c.label}</p>
                  <strong>{c.val}</strong>
                  <span>{c.sub}</span>
                </div>
              ))}
            </div>
            <Ledger minWidth={780} head={['Distributed', 'Fiscal year (BS)', 'District', 'Municipality', 'Beneficiary', 'Families', 'Amount', 'M / F recorded']}>
              {reliefRows.map(r => (
                <tr key={r.id}>
                  <td style={TD}>{fmtDate(r.dateOfReliefDistribution)}</td>
                  <td style={TD}>{r.fyLabel ?? r.fiscalYear ?? '-'}</td>
                  <td style={TD}>{r.districtName ?? (r.district ?? '-')}</td>
                  <td style={TD}>{r.muniName ?? (r.municipality ?? '-')}</td>
                  <td style={TD}>{r.nameOfBeneficiary?.trim() || '-'}</td>
                  <td style={NUM}>{n(r.numberOfBeneficiaryFamily)}</td>
                  <td style={{ ...NUM, fontWeight: 600 }}>{r.reliefAmountNpr ? formatNpr(r.reliefAmountNpr) : '-'}</td>
                  <td style={NUM}>{n(r.totalMaleBenefited)} / {n(r.totalFemaleBenefited)}</td>
                </tr>
              ))}
            </Ledger>
            <p className="muted" style={{ marginTop: '.7rem' }}>
              These {reliefRows.length} records total {formatNpr(reliefTotal.amount)}, while the incident-loss figures NDRRMA published for{' '}
              {lastFull?.year} alone total {lastFull ? formatNpr(lastFull.values.estimatedTotalLoss) : '-'}. The two are different things - one counts damage
              NDRRMA recorded, the other counts distributions NDRRMA published to this portal - and relief is entered per distribution event, not per incident.
            </p>
          </>
        ) : <p className="muted" style={{ marginTop: '.75rem' }}>No relief records published.</p>}
      </section>

      {/* ── DRR budget ── */}
      <section className="panel" style={{ marginTop: '.75rem' }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">DRR BUDGET LINES · {budget.length} OF {budgetCount} ACTIVITIES</p>
            <h3>Disaster-risk-reduction budget vs spend</h3>
            <p className="muted">Municipal DRR activities with the amount budgeted and the expenditure recorded against it.</p>
          </div>
          <Banknote style={{ color: 'var(--warning)' }} size={20} />
        </div>
        {loading && !budget.length ? <p className="muted" style={{ marginTop: '.75rem' }}>Loading…</p> : budget.length ? (
          <>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '1rem' }}>
              <ProgressRing value={budgetStats.pct} size={92} color="var(--accent)" label={`${budgetStats.pct.toFixed(0)}% spent`} />
              <div style={{ display: 'grid', gap: '.45rem', minWidth: 220 }}>
                <div><span className="text-tertiary" style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em' }}>BUDGETED</span><strong style={{ display: 'block', fontSize: '1.15rem' }}>{formatNpr(budgetStats.total)}</strong></div>
                <div><span className="text-tertiary" style={{ fontSize: '.6rem', fontWeight: 700, letterSpacing: '.08em' }}>RECORDED SPEND</span><strong style={{ display: 'block', fontSize: '1.15rem' }}>{formatNpr(budgetStats.spent)}</strong></div>
                <small className="text-tertiary" style={{ fontSize: '.6rem' }}>
                  {budgetStats.unpriced} line{budgetStats.unpriced === 1 ? '' : 's'} without an amount · {budgetStats.noSpend} with no expenditure recorded
                </small>
              </div>
              <div style={{ display: 'grid', gap: '.4rem', minWidth: 240, flex: 1 }}>
                {budgetStats.fundTypes.map(([name, f]) => (
                  <div key={name}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.64rem', marginBottom: '.2rem' }}>
                      <span>{name} <span className="text-tertiary">· {f.count}</span></span>
                      <strong>{formatNpr(f.amount)}</strong>
                    </div>
                    <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-sunken)' }}>
                      <div style={{ height: '100%', width: `${budgetStats.total > 0 ? (f.amount / budgetStats.total) * 100 : 0}%`, background: 'var(--accent)', borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.9rem' }}>
              {budgetStats.statuses.map(([name, count]) => (
                <span key={name} className="status-badge" style={{ padding: '.25rem .5rem' }}>{name} · {count}</span>
              ))}
              {budgetStats.donors.map(([name, count]) => (
                <span key={name} className="status-badge status-good" style={{ padding: '.25rem .5rem' }}>{name} · {count}</span>
              ))}
            </div>

            <Ledger minWidth={840} head={['Activity', 'Funder', 'Fund type', 'Budgeted', 'Spend', 'Used', 'Status', 'Period']}>
              {budgetRows.map(b => {
                const amount = Number(b.amount) || 0
                const spent = Number(b.expenditure) || 0
                const pct = amount > 0 ? (spent / amount) * 100 : null
                return (
                  <tr key={b.id}>
                    <td style={{ ...TD, maxWidth: 380 }}>{b.activityName?.trim() || '-'}</td>
                    <td style={TD}>{b.donerOrganization ?? '-'}</td>
                    <td style={TD}>{b.fundType?.trim() || b.otherFundType?.trim() || '-'}</td>
                    <td style={NUM}>{b.amount != null ? formatNpr(b.amount) : '-'}</td>
                    <td style={NUM}>{b.expenditure != null ? formatNpr(b.expenditure) : '-'}</td>
                    <td style={NUM}>{pct != null ? `${pct.toFixed(0)}%` : '-'}</td>
                    <td style={TD}>{b.status?.trim() || '-'}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{fmtDate(b.projectStartDate)} → {fmtDate(b.projectEndDate)}</td>
                  </tr>
                )
              })}
            </Ledger>
            {budgetSorted.length > 25 && (
              <button className="panel-link" onClick={() => setShowAllBudget(v => !v)} style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0, marginTop: '.6rem' }}>
                {showAllBudget ? 'Show fewer' : `Show all ${budgetSorted.length}`}
              </button>
            )}
            <p className="muted" style={{ marginTop: '.7rem' }}>
              Largest lines first. {budgetStats.donors.length} distinct funders appear in the funder field - municipalities, NGOs and
              mistyped or junk entries alike - so read the names as they were entered, not as a clean list.
              {budgetStats.unpriced > 0 && ` ${budgetStats.unpriced} line${budgetStats.unpriced === 1 ? '' : 's'} carry no amount and`} {budgetStats.noSpend} have no expenditure recorded.
              BIPAD&apos;s DRR budget module is a pilot, and the portal&apos;s separate budget-header resource still holds demo records, so only
              activity rows are shown. Spend is what the reporting body entered against the line - not an audited figure.
            </p>
          </>
        ) : <p className="muted" style={{ marginTop: '.75rem' }}>No budget lines published.</p>}
      </section>

      {/* ── Sources ── */}
      <div style={{ padding: '.9rem 1.1rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', gap: '.6rem', boxShadow: 'var(--shadow-sm)', marginTop: '.75rem' }}>
        <Wind size={15} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: '.62rem', color: 'var(--text-secondary)' }}>
          <strong style={{ fontSize: '.74rem', color: 'var(--text)' }}>Source: BIPAD / NDRRMA (bipadportal.gov.np), read live.</strong><br />
          Incident records, loss detail, relief distributions and DRR budget lines are the government&apos;s published figures, reproduced unaltered - gaps and blanks included.
        </p>
      </div>
      <p className="muted" style={{ marginTop: '.5rem', fontSize: '.62rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
        <ArrowUpRight size={12} /> District climate projections to 2100 are on the <Link href="/environment" className="panel-link" style={{ display: 'inline' }}>environment page</Link>.
      </p>
    </div>
  )
}
