'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarDays,
  ExternalLink,
  FileText,
  Landmark,
  Layers,
  Mail,
  MapPin,
  Phone,
  TrendingUp,
} from 'lucide-react'
import { LineChart } from '@/components/charts'
import { DataTable, useTableSort, type DataTableColumn } from '@/components/data-table'
import { sortRows, type SortKind } from '@/lib/table-sort'
import { formatNpr, formatNum } from '@/lib/currency'
import { formatFiscalYearLabel } from '@/lib/fiscal-year'
import { groupReportsByFy } from '@/lib/nepse'
import type {
  NepseCompanyFinancial,
  NepseCompanyProfile,
  NepseDisclosure,
  NepseDividendRecord,
  NepseFloorSheetSummary,
  NepseReport,
  NepseStock,
} from '@/lib/types'
import type { NepsePricePoint } from '@/lib/nepse'

type Props = {
  stock: NepseStock
  sector: string
  history: NepsePricePoint[]
  peers: NepseStock[]
  profile: NepseCompanyProfile | null
  rank: { byTurnover: number; of: number } | null
  financials: NepseCompanyFinancial | null
  dividends: NepseDividendRecord[]
  disclosures: NepseDisclosure[]
  floorSheet: NepseFloorSheetSummary | null
}

const RANGES = [
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
  { key: 'Max', days: null },
] as const

const PERIODS = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
  { label: '6 months', days: 182 },
  { label: '1 year', days: 365 },
  { label: 'Since listing', days: null },
] as const

type RangeKey = (typeof RANGES)[number]['key']
type DataTab = 'financials' | 'dividends' | 'floor' | 'news'
type PeerSortKey = 'symbol' | 'company' | 'ltp' | 'change' | 'turnover'

const PEER_SORT_KINDS: Record<PeerSortKey, SortKind> = {
  symbol: 'text',
  company: 'text',
  ltp: 'number',
  change: 'number',
  turnover: 'number',
}

const PEER_SORT_ACCESSORS: Record<PeerSortKey, (stock: NepseStock) => string | number | null | undefined> = {
  symbol: stock => stock.symbol,
  company: stock => stock.companyName,
  ltp: stock => stock.ltp,
  change: stock => stock.percentChange,
  turnover: stock => stock.turnover,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const SECTOR_LABELS: Record<string, string> = {
  open_ended_mutual_fund: 'Open-end mutual funds',
  'Corporate Debenture': 'Corporate debentures',
  'Development Bank Limited': 'Development banks',
  'Hotels And Tourism': 'Hotels & tourism',
  'Life Insurance': 'Life insurance',
  'Non-Life Insurance': 'Non-life insurance',
  'Manufacturing And Processing': 'Manufacturing',
  'Mutual Fund': 'Mutual funds',
  'Promotor Share': 'Promoter shares',
  'Government Bond': 'Government bonds',
  'Commercial Banks': 'Commercial banks',
  'Hydro Power': 'Hydropower',
  Tradings: 'Trading',
  Investment: 'Investment',
  Finance: 'Finance',
  Others: 'Others',
}

function sectorLabel(name: string): string {
  return SECTOR_LABELS[name] ?? name
}

function signed(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function fmtDate(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : (iso ?? '')
}

function shortDate(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}` : (iso ?? '')
}

function cutoffDate(latest: string, days: number): string {
  const date = new Date(`${latest}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function pointsFor(points: NepsePricePoint[], days: number | null): NepsePricePoint[] {
  if (days == null) return points
  const latest = points[points.length - 1]?.date
  if (!latest) return []
  const cutoff = cutoffDate(latest, days)
  const slice = cutoff ? points.filter(point => point.date >= cutoff) : points
  return slice.length > 1 ? slice : points.slice(-2)
}

function rangeReturn(points: NepsePricePoint[], days: number | null): number | null {
  const slice = pointsFor(points, days)
  if (slice.length < 2) return null
  const first = slice[0].close
  const last = slice[slice.length - 1].close
  return first > 0 ? ((last - first) / first) * 100 : null
}

/** Keep Max charts responsive without losing the first/last session. */
function samplePoints(points: NepsePricePoint[], limit = 720): NepsePricePoint[] {
  if (points.length <= limit) return points
  const step = (points.length - 1) / (limit - 1)
  return Array.from({ length: limit }, (_, index) => points[Math.round(index * step)])
}

function rangeLabel(date: string, range: RangeKey): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
  if (!match) return date
  if (range === 'Max') return `${MONTHS[Number(match[2]) - 1]} '${match[1].slice(2)}`
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}`
}

function reportOrder(report: NepseReport): number {
  const fy = Number((report.fy.match(/\d{4}/) ?? ['0'])[0])
  if (report.type === 'Annual Report') return fy * 10 + 5
  const quarter = report.quarter.toLowerCase()
  const q = quarter.includes('first') ? 1 : quarter.includes('second') ? 2 : quarter.includes('third') ? 3 : quarter.includes('fourth') ? 4 : 0
  return fy * 10 + q
}

function reportPeriod(report: NepseReport): string {
  if (report.type === 'Annual Report') return `Annual ${report.fy}`
  return `${report.quarter || 'Quarterly'} ${report.fy}`
}

function pctText(value: number | null | undefined): string {
  return value == null ? '—' : `${value.toFixed(2)}%`
}

function PositionBar({ label, low, high, value, tone }: {
  label: string
  low: number
  high: number
  value: number
  tone?: 'up' | 'down'
}) {
  const [hover, setHover] = useState<number | null>(null)
  const span = high - low
  const position = span > 0 ? Math.min(100, Math.max(0, ((value - low) / span) * 100)) : 50
  const active = hover ?? position
  const hoverPrice = hover == null ? null : low + (hover / 100) * span
  const outside = value > high ? 'above range' : value < low ? 'below range' : null

  return (
    <div className={`stock-position${tone === 'down' ? ' down' : ''}`}>
      <div className="stock-position-head">
        <span className="stock-card-label">{label}</span>
        <span className={hover == null ? undefined : 'positive'}>
          {hoverPrice == null
            ? `${formatNpr(value)} · ${outside ?? `${position.toFixed(0)}%`}`
            : `${formatNpr(hoverPrice)} · ${active.toFixed(0)}%`}
        </span>
      </div>
      <div
        className="stock-position-track"
        onMouseMove={event => {
          const rect = event.currentTarget.getBoundingClientRect()
          if (rect.width <= 0) return
          setHover(Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100)))
        }}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={`${label}: ${position.toFixed(0)}% of the ${formatNpr(low)} to ${formatNpr(high)} range`}
      >
        <span className="stock-position-fill" style={{ width: `${position}%` }} />
        {hover != null && <i className="stock-position-guide" style={{ left: `${hover}%` }} />}
        <b className="stock-position-marker" style={{ left: `calc(${position}% - 7px)` }} />
      </div>
      <div className="stock-position-labels">
        <span>{formatNpr(low)}</span>
        <span>{formatNpr(high)}</span>
      </div>
    </div>
  )
}

export function StockDetail({ stock, sector, history, peers, profile, rank, financials, dividends, disclosures, floorSheet }: Props) {
  const [range, setRange] = useState<RangeKey>('3M')
  const [dataTab, setDataTab] = useState<DataTab>('financials')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [focusPrice, setFocusPrice] = useState<number | null>(null)
  const [openFys, setOpenFys] = useState<Set<string>>(() => new Set())
  const { sort: peerSort, toggleSort: togglePeerSort } = useTableSort<PeerSortKey>({ key: 'turnover', dir: -1 }, PEER_SORT_KINDS)
  const latest = history[history.length - 1] ?? null
  const price = stock.ltp > 0 ? stock.ltp : (latest?.close ?? 0)
  const previousClose = stock.open > 0 ? stock.open : (history.length > 1 ? history[history.length - 2].close : price)
  const dayChange = price - previousClose
  const dayPct = stock.percentChange ?? (previousClose > 0 ? (dayChange / previousClose) * 100 : 0)
  const dayUp = dayPct >= 0
  const activePrice = focusPrice ?? price

  const selected = useMemo(() => {
    const days = RANGES.find(item => item.key === range)?.days ?? null
    return pointsFor(history, days)
  }, [history, range])

  const chartPoints = useMemo(() => samplePoints(selected), [selected])
  const selectedFirst = selected[0]?.close ?? 0
  const selectedLast = selected[selected.length - 1]?.close ?? 0
  const selectedPct = selectedFirst > 0 ? ((selectedLast - selectedFirst) / selectedFirst) * 100 : 0
  const selectedUp = selectedPct >= 0
  const selectedHigh = selected.length ? Math.max(...selected.map(point => point.close)) : 0
  const selectedLow = selected.length ? Math.min(...selected.map(point => point.close)) : 0

  const yearPoints = pointsFor(history, 365)
  const yearHigh = yearPoints.length ? Math.max(...yearPoints.map(point => point.close)) : (stock.high || price)
  const yearLow = yearPoints.length ? Math.min(...yearPoints.map(point => point.close)) : (stock.low || price)
  const yearPct = rangeReturn(history, 365)

  const dayLow = Math.min(stock.low || price, price)
  const dayHigh = Math.max(stock.high || price, price)
  const maxVolume = Math.max(1, ...chartPoints.map(point => point.volume))
  const asOf = latest?.date ?? ''
  const turnover = stock.turnover ?? 0
  const volume = stock.volume ?? 0
  const trades = stock.trades ?? 0
  const marketCap = stock.marketCap ?? 0

  const reports = financials ? [...financials.reports].sort((a, b) => reportOrder(b) - reportOrder(a)) : []
  const latestReport = reports[0] ?? null
  const aboutSummary = profile?.profile?.trim()
    || `${stock.companyName} is listed in the ${sectorLabel(sector)} group on NEPSE.${profile?.address ? ` Its corporate office is at ${profile.address}.` : ''}${profile?.contact_person ? ` The exchange profile names ${profile.contact_person} as the contact person.` : ''}`
  const latestDividend = dividends[0] ?? null
  const fyGroups = [...groupReportsByFy(reports)].reverse()
  const sortedPeers = sortRows(peers, peerSort, PEER_SORT_ACCESSORS)
  const peerColumns: DataTableColumn<NepseStock, PeerSortKey>[] = [
    {
      key: 'symbol', label: 'Symbol', align: 'left',
      render: peer => <Link href={`/market/${peer.symbol}`} className="market-symbol-link" style={{ fontWeight: 700 }}>{peer.symbol}</Link>,
    },
    {
      key: 'company', label: 'Company', align: 'left', className: 'data-table-company',
      render: peer => peer.companyName,
    },
    { key: 'ltp', label: 'LTP', render: peer => formatNpr(peer.ltp) },
    {
      key: 'change', label: 'Change',
      render: peer => <strong className={(peer.percentChange ?? 0) >= 0 ? 'positive' : 'negative'}>{signed(peer.percentChange ?? 0)}%</strong>,
    },
    { key: 'turnover', label: 'Turnover', render: peer => formatNpr(peer.turnover) },
  ]

  useEffect(() => {
    const latestFy = fyGroups[0]?.fy
    if (!latestFy) return
    setOpenFys(current => current.size ? current : new Set([latestFy]))
  }, [financials?.symbol])

  const pillStyle = (active: boolean): CSSProperties => ({
    padding: '.3rem .62rem',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-light)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '.64rem',
    fontWeight: 700,
    whiteSpace: 'nowrap',
  })

  return (
    <div className="content-wrap">
      <Link
        href="/market"
        className="text-secondary"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.4rem', fontSize: '.76rem', fontWeight: 600, marginBottom: '1rem' }}
      >
        <ArrowLeft size={15} /> Back to market
      </Link>

      <div className="stock-hero panel">
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.45rem', flexWrap: 'wrap' }}>
            <span className="stock-sector-pill">{sectorLabel(sector)}</span>
            <span className="stock-meta-chip">NEPSE listed</span>
            {rank && <span className="stock-meta-chip">#{rank.byTurnover} by turnover</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.7rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
            <h1 style={{ fontSize: 'clamp(1.9rem, 3.8vw, 2.7rem)', letterSpacing: '-.05em', lineHeight: 1 }}>{stock.symbol}</h1>
            <span style={{ fontSize: '.86rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>NEPSE</span>
          </div>
          <p style={{ margin: '.16rem 0 0', color: 'var(--text-secondary)', fontSize: '.8rem' }}>{stock.companyName}</p>
          <p className="muted" style={{ marginTop: '.32rem' }}>
            Latest session {asOf ? fmtDate(asOf) : '—'} &middot; previous close {formatNpr(previousClose)}
          </p>

          <div className="stock-day-grid">
            {[
              { label: 'Open', value: formatNpr(stock.open || previousClose) },
              { label: 'Day high', value: formatNpr(stock.high || price) },
              { label: 'Day low', value: formatNpr(stock.low || price) },
              { label: 'Prev. close', value: formatNpr(previousClose) },
            ].map(item => (
              <div key={item.label}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="stock-hero-price">
          <span className="stock-card-label">Last traded price</span>
          <strong>{formatNpr(activePrice)}</strong>
          <span className={dayUp ? 'positive' : 'negative'}>
            {dayUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
            {signed(dayChange)} ({signed(dayPct)}%)
          </span>
          <small>
            1Y return <b className={yearPct != null && yearPct >= 0 ? 'positive' : yearPct != null ? 'negative' : undefined}>{yearPct == null ? '—' : `${signed(yearPct)}%`}</b>
          </small>
        </div>
      </div>

      <div className="stock-chart-grid">
        <div className="panel stock-price-panel">
          <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.6rem' }}>
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Price history</p>
              <h3>{range} performance</h3>
            </div>
            <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap' }}>
              {RANGES.map(item => (
                <button key={item.key} type="button" onClick={() => setRange(item.key)} style={pillStyle(range === item.key)}>
                  {item.key}
                </button>
              ))}
            </div>
          </div>

          {selected.length > 1 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '.55rem', marginTop: '.7rem' }}>
                <strong className={selectedUp ? 'positive' : 'negative'} style={{ fontSize: '1.2rem', letterSpacing: '-.03em' }}>{signed(selectedPct)}%</strong>
                <span style={{ fontSize: '.66rem', color: 'var(--text-tertiary)' }}>{fmtDate(selected[0].date)} – {fmtDate(selected[selected.length - 1].date)}</span>
              </div>
              <div style={{ marginTop: '.35rem' }}>
                <LineChart
                  data={chartPoints.map(point => ({ year: point.date, value: point.close, label: rangeLabel(point.date, range) }))}
                  color={selectedUp ? 'var(--accent)' : 'var(--danger)'}
                  height={225}
                  yAxis
                  showDelta
                  onHover={setFocusPrice}
                  formatValue={value => formatNpr(value)}
                />
              </div>
              <div className="stock-chart-stats">
                <div><span>Range return</span><strong className={selectedUp ? 'positive' : 'negative'}>{signed(selectedPct)}%</strong></div>
                <div><span>Range high</span><strong>{formatNpr(selectedHigh)}</strong></div>
                <div><span>Range low</span><strong>{formatNpr(selectedLow)}</strong></div>
                <div><span>Sessions</span><strong>{selected.length}</strong></div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.5rem', marginBottom: '.35rem' }}>
                  <span className="stock-card-label">Daily volume</span>
                  <span style={{ fontSize: '.58rem', color: 'var(--text-tertiary)' }}>{formatNum(Math.max(0, ...chartPoints.map(point => point.volume)))} peak shares</span>
                </div>
                <div className="stock-volume-bars">
                  {chartPoints.map(point => (
                    <span
                      key={point.date}
                      title={`${fmtDate(point.date)} · ${formatNum(point.volume)} shares · ${formatNpr(point.turnover)} traded`}
                      style={{ height: `${Math.max(3, (point.volume / maxVolume) * 100)}%` }}
                    />
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', minHeight: 260, color: 'var(--text-tertiary)', fontSize: '.74rem' }}>
              Price history is unavailable for this security.
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Session snapshot</p>
              <h3>Key numbers</h3>
            </div>
            <Activity size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div className="stock-snapshot">
            {[
              { icon: <Activity size={13} />, label: 'Volume', value: volume ? `${formatNum(volume)} shares` : '—' },
              { icon: <Landmark size={13} />, label: 'Turnover', value: turnover ? formatNpr(turnover) : '—' },
              { icon: <BarChart3 size={13} />, label: 'Trades', value: trades ? formatNum(trades) : '—' },
              { icon: <Layers size={13} />, label: 'Market cap', value: marketCap ? formatNpr(marketCap) : '—' },
              { icon: <Building2 size={13} />, label: 'Sector', value: sectorLabel(sector) },
              { icon: <TrendingUp size={13} />, label: 'Turnover rank', value: rank ? `#${rank.byTurnover} of ${rank.of}` : '—' },
            ].map(row => (
              <div key={row.label} className="stock-snapshot-row">
                <span>{row.icon}{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>

          <div className="stock-snapshot-ranges">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.5rem' }}>
              <span className="stock-card-label">Price position</span>
              <span style={{ fontSize: '.55rem', color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>
                {focusPrice == null ? 'Live close' : 'Hover preview'}
              </span>
            </div>
            <PositionBar label="52-week" low={yearLow} high={yearHigh} value={activePrice} tone={yearPct != null && yearPct < 0 ? 'down' : 'up'} />
            <PositionBar label="Today" low={dayLow} high={dayHigh} value={activePrice} tone={dayUp ? 'up' : 'down'} />
            <p style={{ margin: '.45rem 0 0', fontSize: '.54rem', color: 'var(--text-tertiary)', lineHeight: 1.45 }}>
              Hover the price chart to move both markers.
            </p>
          </div>
        </div>
      </div>

      <div className="lower-grid" style={{ marginBottom: '.75rem' }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Momentum</p>
              <h3>Returns by period</h3>
              <p className="muted">Price change over the last twelve months of sessions.</p>
            </div>
            <CalendarDays size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ marginTop: '.75rem' }}>
            {PERIODS.map(period => {
              const value = rangeReturn(history, period.days)
              const width = value == null ? 0 : Math.min(100, Math.abs(value) * 4)
              return (
                <div key={period.label} className="stock-return-row">
                  <span>{period.label}</span>
                  <span className="stock-return-track">
                    <i
                      className={value != null && value < 0 ? 'negative' : 'positive'}
                      style={{ width: `${Math.max(value == null ? 0 : 3, width)}%`, background: value != null && value < 0 ? 'var(--danger)' : 'var(--accent)' }}
                    />
                  </span>
                  <strong className={value == null ? undefined : value >= 0 ? 'positive' : 'negative'}>{value == null ? '—' : `${signed(value)}%`}</strong>
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel stock-about-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Company</p>
              <h3>About {stock.symbol}</h3>
            </div>
            <Building2 size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>

          <p className={`stock-about-text${aboutOpen ? ' expanded' : ''}`}>{aboutSummary}</p>

          <div className="stock-contact stock-about-contact">
            {profile?.address && <span><MapPin size={12} /> {profile.address}</span>}
            {(profile?.phone || profile?.email) && (
              <span><Phone size={12} /> {[profile.phone, profile.email].filter(Boolean).join(' · ')}</span>
            )}
            {aboutOpen && profile?.contact_person && <span><Building2 size={12} /> {profile.contact_person}</span>}
            {aboutOpen && profile?.fax && <span><FileText size={12} /> Fax {profile.fax}</span>}
            {aboutOpen && profile?.address_type && <span><Layers size={12} /> {profile.address_type}</span>}
          </div>

          <div className="stock-about-foot">
            <button type="button" className="text-button" style={{ paddingLeft: 0 }} onClick={() => setAboutOpen(value => !value)}>
              {aboutOpen ? 'Show less' : 'More'}
            </button>
            <a href="https://www.nepalstock.com" target="_blank" rel="noreferrer" className="text-button" style={{ paddingRight: 0 }}>
              Official NEPSE <ExternalLink size={11} />
            </a>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: '.75rem' }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.7rem' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Company data</p>
            <h3>Filings, payouts &amp; trading</h3>
            <p className="muted">Switch between reported results, dividends, the latest floor sheet and company disclosures.</p>
          </div>
          <div className="stock-data-tabs" role="tablist" aria-label="Company data">
            {([
              { key: 'financials' as const, label: 'Financials', count: reports.length },
              { key: 'dividends' as const, label: 'Dividends', count: dividends.length },
              { key: 'floor' as const, label: 'Floor sheet', count: floorSheet?.contracts ?? 0 },
              { key: 'news' as const, label: 'News', count: disclosures.length },
            ]).map(tab => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={dataTab === tab.key}
                onClick={() => setDataTab(tab.key)}
                className={`stock-data-tab${dataTab === tab.key ? ' active' : ''}`}
              >
                {tab.label}{tab.count > 0 ? ` · ${tab.count}` : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="stock-tab-panel">
          {dataTab === 'financials' && (
            latestReport ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.55rem' }}>
                  <span className="stock-card-label">Latest reported results</span>
                  <span className="muted" style={{ marginTop: 0, fontSize: '.58rem' }}>
                    {reportPeriod(latestReport)}
                  </span>
                </div>
                <div className="stock-fin-stats">
                  <div><span>Latest EPS</span><strong>{latestReport.eps == null ? '—' : formatNpr(latestReport.eps)}</strong></div>
                  <div><span>P/E ratio</span><strong>{latestReport.pe == null ? '—' : latestReport.pe.toFixed(2)}</strong></div>
                  <div><span>Net worth / share</span><strong>{latestReport.net_worth_per_share == null ? '—' : formatNpr(latestReport.net_worth_per_share)}</strong></div>
                  <div><span>Profit</span><strong>{latestReport.profit == null ? '—' : formatNpr(latestReport.profit)}</strong></div>
                </div>
                <div className="stock-fy-groups">
                  {fyGroups.map(group => {
                    const rows = [...(group.annual ? [group.annual] : []), ...group.quarters]
                    return (
                      <details
                        key={group.fy}
                        className="stock-fy-group"
                        open={openFys.has(group.fy)}
                        onToggle={event => {
                          const open = event.currentTarget.open
                          setOpenFys(current => {
                            const next = new Set(current)
                            if (open) next.add(group.fy)
                            else next.delete(group.fy)
                            return next
                          })
                        }}
                      >
                        <summary>
                          <strong>FY {formatFiscalYearLabel(group.fy, group.fyNepali)}</strong>
                          <span>
                            <small>Net result</small>
                            <b className={group.total == null ? undefined : group.total >= 0 ? 'positive' : 'negative'}>{group.total == null ? '—' : formatNpr(group.total)}</b>
                          </span>
                          <span>
                            <small>YoY</small>
                            <b className={group.yoy == null ? undefined : group.yoy >= 0 ? 'positive' : 'negative'}>{group.yoy == null ? '—' : `${signed(group.yoy)}%`}</b>
                          </span>
                          <small className="stock-fy-basis">{group.totalBasis === 'annual' ? 'Annual report' : group.totalBasis === 'quarters' ? 'Quarter total' : 'No profit data'} · {group.quarters.length} quarter filings</small>
                        </summary>
                        <div style={{ overflowX: 'auto' }}>
                          <table className="stock-data-table">
                            <thead>
                              <tr><th>Period</th><th>EPS</th><th>P/E</th><th>Profit</th><th>Net worth</th></tr>
                            </thead>
                            <tbody>
                              {rows.map((report, index) => (
                                <tr key={`${group.fy}-${report.quarter}-${report.type}-${index}`}>
                                  <td>{report.type === 'Annual Report' ? `Annual ${report.fy}` : reportPeriod(report)}</td>
                                  <td>{report.eps == null ? '—' : formatNpr(report.eps)}</td>
                                  <td>{report.pe == null ? '—' : report.pe.toFixed(2)}</td>
                                  <td className={report.profit != null && report.profit < 0 ? 'negative' : undefined}>{report.profit == null ? '—' : formatNpr(report.profit)}</td>
                                  <td>{report.net_worth_per_share == null ? '—' : formatNpr(report.net_worth_per_share)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </details>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: '.2rem' }}>Financial reports are not published in the market feed for this symbol.</p>
            )
          )}

          {dataTab === 'dividends' && (
            dividends.length > 0 ? (
              <>
                {latestDividend && (
                  <div className="stock-fin-stats" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div><span>Fiscal year</span><strong>{latestDividend.fiscalYear || '—'}</strong></div>
                    <div><span>Bonus</span><strong>{pctText(latestDividend.bonus)}</strong></div>
                    <div><span>Total</span><strong>{pctText(latestDividend.total)}</strong></div>
                  </div>
                )}
                <div style={{ overflowX: 'auto' }}>
                  <table className="stock-data-table">
                    <thead>
                      <tr><th>Fiscal year</th><th>Bonus</th><th>Cash</th><th>Total</th><th>Announced</th></tr>
                    </thead>
                    <tbody>
                      {dividends.map((row, index) => (
                        <tr key={`${row.fiscalYear}-${row.announce}-${index}`}>
                          <td>{row.fiscalYear || '—'}</td>
                          <td>{pctText(row.bonus)}</td>
                          <td>{pctText(row.cash)}</td>
                          <td><strong>{pctText(row.total)}</strong></td>
                          <td title={row.bookclose ? `Book closure ${fmtDate(row.bookclose)}` : undefined}>{fmtDate(row.announce)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: '.2rem' }}>No dividend announcements are recorded for this symbol.</p>
            )
          )}

          {dataTab === 'floor' && (
            floorSheet ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.6rem', flexWrap: 'wrap', marginBottom: '.55rem' }}>
                  <span className="stock-card-label">Latest session contracts</span>
                  <span className="muted" style={{ marginTop: 0, fontSize: '.58rem' }}>Matched trades on {fmtDate(floorSheet.date)}</span>
                </div>
                <div className="stock-fin-stats">
                  <div><span>Contracts</span><strong>{formatNum(floorSheet.contracts)}</strong></div>
                  <div><span>Shares</span><strong>{formatNum(floorSheet.totalQty)}</strong></div>
                  <div><span>Traded value</span><strong>{formatNpr(floorSheet.totalAmount)}</strong></div>
                  <div><span>Average ticket</span><strong>{formatNpr(floorSheet.contracts ? floorSheet.totalAmount / floorSheet.contracts : 0)}</strong></div>
                </div>
                <div className="stock-floor-split">
                  <div>
                    <div className="sector-subhead"><span>Top buyers</span><span>Share</span></div>
                    {floorSheet.buyers.slice(0, 3).map(buyer => (
                      <div key={buyer.name} className="market-intel-row">
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.58rem' }}>{buyer.name}</span>
                        <strong style={{ fontSize: '.6rem', whiteSpace: 'nowrap' }}>{buyer.share.toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="sector-subhead"><span>Top sellers</span><span>Share</span></div>
                    {floorSheet.sellers.slice(0, 3).map(seller => (
                      <div key={seller.name} className="market-intel-row">
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '.58rem' }}>{seller.name}</span>
                        <strong style={{ fontSize: '.6rem', whiteSpace: 'nowrap' }}>{seller.share.toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="stock-data-table">
                    <thead>
                      <tr><th>Time</th><th>Shares</th><th>Rate</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                      {floorSheet.largest.map((trade, index) => (
                        <tr key={`${trade.time}-${index}`}>
                          <td>{trade.time}</td>
                          <td>{formatNum(trade.qty)}</td>
                          <td>{formatNpr(trade.rate)}</td>
                          <td>{formatNpr(trade.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="muted" style={{ marginTop: '.2rem' }}>The latest floor sheet has no matched contract for this symbol.</p>
            )
          )}

          {dataTab === 'news' && (
            disclosures.length > 0 ? disclosures.map(item => (
              <div key={item.id} className="market-intel-row">
                <div style={{ minWidth: 0 }}>
                  <span className="market-intel-title" style={{ color: 'var(--text)', marginTop: 0 }}>{item.title}</span>
                  <span style={{ display: 'block', marginTop: '.15rem', fontSize: '.54rem', color: 'var(--text-tertiary)' }}>
                    {fmtDate(item.publishedAt)}{item.source ? ` · ${item.source}` : ''}
                  </span>
                </div>
                {item.documentUrl && (
                  <a href={item.documentUrl} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`} className="text-button" style={{ padding: 0 }}>
                    <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )) : (
              <p className="muted" style={{ marginTop: '.2rem' }}>No company disclosures are recorded for this symbol.</p>
            )
          )}
        </div>
      </div>

      {peers.length > 0 && (
        <div className="panel" style={{ marginBottom: '.75rem' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Sector peers</p>
              <h3>More in {sectorLabel(sector)}</h3>
              <p className="muted">Most-traded names in the same NEPSE group.</p>
            </div>
            <Layers size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <DataTable
            rows={sortedPeers}
            columns={peerColumns}
            sort={peerSort}
            onSort={togglePeerSort}
            rowKey={peer => peer.symbol}
            minWidth={520}
            className="stock-peer-table"
            empty="No listed peers in this sector."
          />
        </div>
      )}

      <p style={{ margin: '1rem 0 0', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Source: YONepse mirror of the Nepal Stock Exchange, refreshed hourly. Prices in NPR. Session figures cover the latest trading day and may lag the official close by minutes. Informational only, not investment advice.
      </p>
    </div>
  )
}
