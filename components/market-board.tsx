'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Clock,
  ExternalLink,
  Flame,
  Landmark,
  Layers,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { LineChart } from '@/components/charts'
import { DataTable, useTableSort, type DataTableColumn } from '@/components/data-table'
import { formatNpr, formatNum } from '@/lib/currency'
import { sortRows, type SortKind } from '@/lib/table-sort'
import type { NepseIndex, NepseMarketSummary, NepseStock, NepseDividendRecord, NepseDisclosure } from '@/lib/types'
import type { NepseBroker, NepseIndexPoint, NepseMarketDay, NepseUpcomingIpo } from '@/lib/nepse'

type Props = {
  stocks: NepseStock[]
  summary: NepseMarketSummary | null
  indices: NepseIndex[]
  isOpen: boolean | null
  lastChecked?: string
  topGainers: NepseStock[]
  topLosers: NepseStock[]
  history: NepseMarketDay[]
  indexHistory: NepseIndexPoint[]
  sectorMap: Record<string, string>
  ipos: NepseUpcomingIpo[]
  dividends: NepseDividendRecord[]
  disclosures: NepseDisclosure[]
  brokers: NepseBroker[]
}

type Row = NepseStock & { sector: string }
type SortKey = 'symbol' | 'company' | 'sector' | 'ltp' | 'change' | 'volume' | 'turnover' | 'cap' | 'trades'
type SizeKey = 'turnover' | 'marketCap'
type HeatMode = 'sector' | 'mixed'
type IndexRangeKey = '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y'

const SORT_KINDS: Record<SortKey, SortKind> = {
  symbol: 'text',
  company: 'text',
  sector: 'text',
  ltp: 'number',
  change: 'number',
  volume: 'number',
  turnover: 'number',
  cap: 'number',
  trades: 'number',
}

const SORT_ACCESSORS: Record<SortKey, (row: Row) => string | number | null | undefined> = {
  symbol: row => row.symbol,
  company: row => row.companyName,
  sector: row => row.sector,
  ltp: row => row.ltp,
  change: row => row.percentChange,
  volume: row => row.volume,
  turnover: row => row.turnover,
  cap: row => row.marketCap,
  trades: row => row.trades,
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const INDEX_RANGES: { key: IndexRangeKey; days: number }[] = [
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
  { key: '3Y', days: 1095 },
  { key: '5Y', days: 1825 },
]

const SECTOR_LABELS: Record<string, string> = {
  'open_ended_mutual_fund': 'Open-end mutual funds',
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
  'Tradings': 'Trading',
  'Investment': 'Investment',
  'Finance': 'Finance',
  'Others': 'Others',
}

function sectorLabel(name: string): string {
  return SECTOR_LABELS[name] ?? name
}

function fmtDate(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}` : (iso ?? '')
}

function fmtStamp(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso ?? '')
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}, ${match[4]}:${match[5]}` : ''
}

function shortDay(iso?: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '')
  return match ? `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]}` : (iso ?? '')
}

function cutoffDate(latest: string, days: number): string {
  const date = new Date(`${latest}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

function signed(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function grouped(value: number, digits = 2): string {
  const [whole, fraction] = Math.abs(value).toFixed(digits).split('.')
  const commas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${value < 0 ? '-' : ''}${commas}${fraction ? `.${fraction}` : ''}`
}

function indexMove(index: NepseIndex): { change: number; pct: number } {
  const change = index.close - index.previousClose
  return { change, pct: index.previousClose > 0 ? (change / index.previousClose) * 100 : 0 }
}

function heatTint(pct: number): CSSProperties {
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.005) {
    return { background: 'var(--bg-sunken)', color: 'var(--text)' }
  }
  const t = Math.min(Math.sqrt(Math.abs(pct) / 6), 1)
  const mix = Math.round(8 + t * 52)
  const tone = pct > 0 ? 'var(--accent)' : 'var(--danger)'
  return {
    background: `color-mix(in oklab, ${tone} ${mix}%, var(--bg-elevated))`,
    color: 'var(--text)',
    boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} ${18 + t * 55}%, transparent)`,
  }
}

type HeatItem = Row & { weight: number }
type Tile = HeatItem & { x: number; y: number; w: number; h: number }

function HeatTile({ tile, area, rectStyle, onHover, onLeave }: {
  tile: Tile
  area: number
  rectStyle: CSSProperties
  onHover: (tile: Tile) => void
  onLeave: (symbol: string) => void
}) {
  const pct = tile.percentChange ?? 0
  return (
    <Link
      href={`/market/${tile.symbol}`}
      className="market-tile"
      onMouseEnter={() => onHover(tile)}
      onMouseLeave={() => onLeave(tile.symbol)}
      onFocus={() => onHover(tile)}
      onBlur={() => onLeave(tile.symbol)}
      title={`${tile.symbol} · ${tile.companyName} · ${signed(pct)}% · ${formatNpr(tile.turnover)}`}
      aria-label={`${tile.symbol} ${tile.companyName}, ${signed(pct)}%, turnover ${formatNpr(tile.turnover)}`}
      style={{ position: 'absolute', padding: 1.5, background: 'transparent', textAlign: 'left', textDecoration: 'none', ...rectStyle }}
    >
      <span style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: area > 0.006 ? '.35rem .42rem' : '.15rem .25rem',
        borderRadius: 4,
        overflow: 'hidden',
        ...heatTint(pct),
      }}>
        {area > 0.0016 && (
          <span style={{ fontSize: area > 0.012 ? '.7rem' : '.58rem', fontWeight: 800, letterSpacing: '-.01em', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{tile.symbol}</span>
        )}
        {area > 0.004 && (
          <span style={{ fontSize: area > 0.014 ? '.62rem' : '.52rem', fontWeight: 700, opacity: .78, lineHeight: 1.1 }}>{signed(pct)}%</span>
        )}
      </span>
    </Link>
  )
}

function MoodGauge({ score }: { score: number }) {
  const value = Math.max(-100, Math.min(100, score))
  const cx = 100
  const cy = 100
  const r = 74
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180
    return { x: cx + r * Math.cos(radians), y: cy - r * Math.sin(radians) }
  }
  const theta = (input: number) => ((100 - input) / 200) * 180
  const arc = (from: number, to: number) => {
    const start = point(from)
    const end = point(to)
    return `M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`
  }
  const tip = point(theta(value))

  return (
    <svg viewBox="0 0 200 162" role="img" aria-label={`Market mood score ${value} out of 100`} style={{ width: '100%', maxWidth: 226, display: 'block' }}>
      <path d={arc(180, 126)} fill="none" stroke="var(--danger)" strokeWidth={10} strokeLinecap="round" opacity={0.82} />
      <path d={arc(126, 54)} fill="none" stroke="var(--border)" strokeWidth={10} strokeLinecap="round" />
      <path d={arc(54, 0)} fill="none" stroke="var(--accent)" strokeWidth={10} strokeLinecap="round" opacity={0.86} />
      <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={5} fill="var(--text)" />
      <circle cx={cx} cy={cy} r={2.2} fill="var(--bg-elevated)" />
      <text x={cx} y={139} textAnchor="middle" fill="var(--text)" fontSize={17} fontWeight={800}>{value > 0 ? '+' : ''}{value}</text>
      <text x={20} y={157} fill="var(--text-tertiary)" fontSize={7.5} fontWeight={700}>BEARISH</text>
      <text x={100} y={157} textAnchor="middle" fill="var(--text-tertiary)" fontSize={7.5} fontWeight={700}>NEUTRAL</text>
      <text x={180} y={157} textAnchor="end" fill="var(--text-tertiary)" fontSize={7.5} fontWeight={700}>BULLISH</text>
    </svg>
  )
}

function worstRatio(areas: number[], side: number): number {
  const sum = areas.reduce((total, area) => total + area, 0)
  const max = Math.max(...areas)
  const min = Math.min(...areas)
  return Math.max((side * side * max) / (sum * sum), (sum * sum) / (side * side * min))
}

function squarify(items: HeatItem[], width: number, height: number): Tile[] {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  if (!total || width <= 0 || height <= 0) return []
  const queue = items.map(item => ({ ...item, area: (item.weight / total) * width * height }))
  const placed: Tile[] = []
  let x = 0
  let y = 0
  let w = width
  let h = height
  let start = 0
  while (start < queue.length && w > 0 && h > 0) {
    const side = Math.min(w, h)
    const row = [queue[start]]
    let rowArea = queue[start].area
    let best = worstRatio([rowArea], side)
    let end = start + 1
    while (end < queue.length) {
      const areas = [...row.map(item => item.area), queue[end].area]
      const ratio = worstRatio(areas, side)
      if (ratio > best) break
      row.push(queue[end])
      rowArea += queue[end].area
      best = ratio
      end += 1
    }
    if (w >= h) {
      const rowWidth = rowArea / h
      let cursor = y
      for (const item of row) {
        const tileHeight = h * (item.area / rowArea)
        placed.push({ ...item, x, y: cursor, w: rowWidth, h: tileHeight })
        cursor += tileHeight
      }
      x += rowWidth
      w -= rowWidth
    } else {
      const rowHeight = rowArea / w
      let cursor = x
      for (const item of row) {
        const tileWidth = w * (item.area / rowArea)
        placed.push({ ...item, x: cursor, y, w: tileWidth, h: rowHeight })
        cursor += tileWidth
      }
      y += rowHeight
      h -= rowHeight
    }
    start = end
  }
  return placed
}

export function MarketBoard({
  stocks,
  summary,
  indices,
  isOpen,
  lastChecked,
  topGainers,
  topLosers,
  history,
  indexHistory,
  sectorMap,
  ipos,
  dividends,
  disclosures,
  brokers,
}: Props) {
  const [heatSector, setHeatSector] = useState('All')
  const [heatMode, setHeatMode] = useState<HeatMode>('sector')
  const [sizeBy, setSizeBy] = useState<SizeKey>('turnover')
  const [indexRange, setIndexRange] = useState<IndexRangeKey>('1Y')
  const [hover, setHover] = useState<Row | null>(null)
  const [query, setQuery] = useState('')
  const [tableSector, setTableSector] = useState('All')
  const { sort, toggleSort } = useTableSort<SortKey>({ key: 'turnover', dir: -1 }, SORT_KINDS)
  const [showAll, setShowAll] = useState(false)
  const heatRef = useRef<HTMLDivElement | null>(null)
  const [heatBox, setHeatBox] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (heatMode !== 'mixed') return
    const element = heatRef.current
    if (!element) return
    const update = () => {
      const rect = element.getBoundingClientRect()
      setHeatBox(previous => (Math.abs(previous.width - rect.width) < 1 && Math.abs(previous.height - rect.height) < 1
        ? previous
        : { width: rect.width, height: rect.height }))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [heatMode])

  const rows = useMemo<Row[]>(
    () => stocks.map(stock => ({
      ...stock,
      sector: sectorMap[stock.symbol.toUpperCase()] ?? stock.sector ?? 'Others',
    })),
    [stocks, sectorMap],
  )

  const headline = useMemo(
    () => indices.find(index => /nepse index/i.test(index.name)) ?? indices[0] ?? null,
    [indices],
  )

  const move = headline ? indexMove(headline) : { change: 0, pct: 0 }
  const dayUp = move.change >= 0

  const advance = rows.filter(stock => (stock.percentChange ?? 0) > 0).length
  const decline = rows.filter(stock => (stock.percentChange ?? 0) < 0).length
  const flat = rows.length - advance - decline
  const traded = rows.filter(stock => (stock.turnover ?? 0) > 0)

  const sectors = useMemo(() => {
    const map = new Map<string, { name: string; count: number; advance: number; decline: number; turnover: number; cap: number; sum: number; movers: number }>()
    for (const stock of rows) {
      const entry = map.get(stock.sector) ?? { name: stock.sector, count: 0, advance: 0, decline: 0, turnover: 0, cap: 0, sum: 0, movers: 0 }
      entry.count += 1
      entry.turnover += stock.turnover ?? 0
      entry.cap += stock.marketCap ?? 0
      const pct = stock.percentChange ?? 0
      if (pct > 0) entry.advance += 1
      if (pct < 0) entry.decline += 1
      if (pct !== 0) {
        entry.sum += pct
        entry.movers += 1
      }
      map.set(stock.sector, entry)
    }
    return [...map.values()]
      .map(entry => ({ ...entry, avg: entry.movers ? entry.sum / entry.movers : 0 }))
      .sort((a, b) => b.avg - a.avg)
  }, [rows])

  const sectorNames = useMemo(
    () => [...sectors].sort((a, b) => b.count - a.count).map(sector => sector.name),
    [sectors],
  )

  const heatItems = useMemo(() => {
    return rows
      .filter(stock => heatSector === 'All' || stock.sector === heatSector)
      .map(stock => ({ ...stock, weight: (sizeBy === 'turnover' ? stock.turnover : stock.marketCap) ?? 0 }))
      .filter(stock => stock.weight > 0)
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 80)
  }, [rows, heatSector, sizeBy])

  const heatLimit = heatBox.width > 0 && heatBox.width < 620 ? 36 : 80
  const tiles = useMemo(() => {
    if (!heatBox.width || !heatBox.height) return []
    return squarify(heatItems.slice(0, heatLimit), heatBox.width, heatBox.height)
  }, [heatItems, heatBox, heatLimit])
  const tileCount = Math.min(heatItems.length, heatLimit)

  const sectorGroups = useMemo(() => {
    const map = new Map<string, HeatItem[]>()
    for (const stock of rows) {
      if (heatSector !== 'All' && stock.sector !== heatSector) continue
      const weight = (sizeBy === 'turnover' ? stock.turnover : stock.marketCap) ?? 0
      if (weight <= 0) continue
      const list = map.get(stock.sector) ?? []
      list.push({ ...stock, weight })
      map.set(stock.sector, list)
    }
    return [...map.entries()]
      .map(([sector, entries]) => {
        const stat = sectors.find(item => item.name === sector)
        return {
          sector,
          count: stat?.count ?? entries.length,
          advance: stat?.advance ?? 0,
          decline: stat?.decline ?? 0,
          avg: stat?.avg ?? 0,
          turnover: stat?.turnover ?? 0,
          weight: entries.reduce((sum, item) => sum + item.weight, 0),
          items: [...entries].sort((a, b) => b.weight - a.weight).slice(0, 12),
        }
      })
      .sort((a, b) => b.weight - a.weight)
  }, [rows, heatSector, sizeBy, sectors])

  const groupLayouts = useMemo(
    () => sectorGroups.map(group => ({ ...group, tiles: squarify(group.items, 100, 40) })),
    [sectorGroups],
  )
  const groupedTileCount = groupLayouts.reduce((sum, group) => sum + group.tiles.length, 0)
  const groupedSecurityCount = sectorGroups.reduce((sum, group) => sum + group.count, 0)

  const ranked = useMemo(() => {
    const filtered = filteredRows(rows, tableSector, query)
    return sortRows(filtered, sort, SORT_ACCESSORS)
  }, [rows, tableSector, query, sort])

  const visible = showAll ? ranked : ranked.slice(0, 60)

  const tableColumns: DataTableColumn<Row, SortKey>[] = [
    {
      key: 'symbol', label: 'Symbol', align: 'left',
      render: stock => <Link href={`/market/${stock.symbol}`} className="market-symbol-link" style={{ fontWeight: 700 }}>{stock.symbol}</Link>,
    },
    {
      key: 'company', label: 'Company', align: 'left', className: 'data-table-company',
      render: stock => <Link href={`/market/${stock.symbol}`} className="market-company-link">{stock.companyName}</Link>,
    },
    {
      key: 'sector', label: 'Sector', align: 'left',
      render: stock => <Link href={`/market/sector/${encodeURIComponent(stock.sector)}`} className="market-sector-link">{sectorLabel(stock.sector)}</Link>,
    },
    { key: 'ltp', label: 'LTP', render: stock => <span style={{ fontWeight: 600 }}>{formatNpr(stock.ltp)}</span> },
    {
      key: 'change', label: 'Change',
      render: stock => {
        const pct = stock.percentChange ?? 0
        const point = stock.open > 0 ? stock.ltp - stock.open : 0
        return (
          <>
            <strong className={pct >= 0 ? 'positive' : 'negative'}>{signed(pct)}%</strong>
            <span className="data-table-sub">{signed(point)}</span>
          </>
        )
      },
    },
    { key: 'volume', label: 'Volume', render: stock => stock.volume ? formatNum(stock.volume) : '—' },
    { key: 'turnover', label: 'Turnover', render: stock => stock.turnover ? formatNpr(stock.turnover) : '—' },
    { key: 'cap', label: 'Market cap', render: stock => stock.marketCap ? formatNpr(stock.marketCap) : '—' },
    { key: 'trades', label: 'Trades', render: stock => stock.trades ? formatNum(stock.trades) : '—' },
  ]

  const maxMove = Math.max(1, ...topGainers.slice(0, 6).map(stock => Math.abs(stock.percentChange ?? 0)), ...topLosers.slice(0, 6).map(stock => Math.abs(stock.percentChange ?? 0)))
  const historyMax = Math.max(1, ...history.map(day => day.turnover))
  const historyAverage = history.length ? history.reduce((sum, day) => sum + day.turnover, 0) / history.length : 0
  const asOf = history.length ? history[history.length - 1].date : ''

  const chartHistory = useMemo<NepseIndexPoint[]>(() => {
    if (!headline || !indexHistory.length) return indexHistory
    const latest = indexHistory[indexHistory.length - 1]
    if (asOf && asOf > latest.date) return [...indexHistory, { date: asOf, close: headline.close }]
    return indexHistory
  }, [indexHistory, headline, asOf])

  const visibleIndex = useMemo(() => {
    if (!chartHistory.length) return []
    const latest = chartHistory[chartHistory.length - 1].date
    const days = INDEX_RANGES.find(item => item.key === indexRange)?.days ?? 365
    const cutoff = cutoffDate(latest, days)
    const slice = cutoff ? chartHistory.filter(point => point.date >= cutoff) : chartHistory
    return slice.length > 1 ? slice : chartHistory.slice(-2)
  }, [chartHistory, indexRange])

  const rangeFirst = visibleIndex[0]?.close ?? 0
  const rangeLast = visibleIndex[visibleIndex.length - 1]?.close ?? 0
  const rangePct = rangeFirst > 0 ? ((rangeLast - rangeFirst) / rangeFirst) * 100 : 0
  const rangeUp = rangeLast >= rangeFirst

  const momentumBase = chartHistory.length >= 6 ? chartHistory[chartHistory.length - 6] : chartHistory[0]
  const momentumLast = chartHistory[chartHistory.length - 1]
  const momentumPct = momentumBase?.close > 0 && momentumLast ? ((momentumLast.close - momentumBase.close) / momentumBase.close) * 100 : 0
  const breadthScore = ((advance - decline) / Math.max(1, advance + decline)) * 100
  const dayScore = Math.max(-100, Math.min(100, (move.pct / 1.5) * 100))
  const momentumScore = Math.max(-100, Math.min(100, (momentumPct / 4) * 100))
  const moodScore = Math.round(Math.max(-100, Math.min(100, breadthScore * 0.5 + dayScore * 0.3 + momentumScore * 0.2)))
  const moodLabel = moodScore >= 45 ? 'Bullish' : moodScore >= 15 ? 'Leaning bullish' : moodScore > -15 ? 'Neutral' : moodScore > -45 ? 'Leaning bearish' : 'Bearish'
  const moodTone = moodScore >= 15 ? 'positive' : moodScore <= -15 ? 'negative' : ''
  const moodBlurb = advance > decline
    ? `Breadth is doing the work: ${advance} advancers against ${decline} decliners.`
    : decline > advance
      ? `Sellers are broader: ${decline} decliners against ${advance} advancers.`
      : 'Advancers and decliners are evenly split.'

  const rangePos = headline && headline.high52 > headline.low52
    ? Math.min(100, Math.max(0, ((headline.close - headline.low52) / (headline.high52 - headline.low52)) * 100))
    : null

  const clearHover = (symbol: string) => {
    setHover(current => (current?.symbol === symbol ? null : current))
  }

  const totalSectorTurnover = sectors.reduce((sum, sector) => sum + sector.turnover, 0)
  const turnoverSectors = [...sectors].sort((a, b) => b.turnover - a.turnover)
  const maxSectorMove = Math.max(0.01, ...sectors.map(sector => Math.abs(sector.avg)))
  const strongestSector = sectors[0] ?? null
  const weakestSector = sectors[sectors.length - 1] ?? null
  const upSectorCount = sectors.filter(sector => sector.avg > 0).length
  const downSectorCount = sectors.filter(sector => sector.avg < 0).length

  const pillStyle = (active: boolean): CSSProperties => ({
    padding: '.28rem .62rem',
    borderRadius: 999,
    border: `1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
    background: active ? 'var(--accent-light)' : 'transparent',
    color: active ? 'var(--accent)' : 'var(--text-secondary)',
    fontSize: '.66rem',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  })

  return (
    <div className="content-wrap">
      <div className="welcome-row">
        <div>
          <p className="eyebrow">NEPSE &middot; Nepal Stock Exchange</p>
          <h1>Market pulse</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap' }}>
          <span className={`status-badge ${isOpen === false ? 'status-warn' : isOpen ? 'status-good' : 'status-warn'}`}>
            <span className="status-dot" />
            {isOpen === null ? 'Feed status unknown' : isOpen ? 'Market open' : 'Market closed'}
          </span>
          <a className="outline-button" href="https://www.nepalstock.com" target="_blank" rel="noreferrer">
            Official NEPSE <ExternalLink size={13} />
          </a>
        </div>
      </div>

      <div className="panel market-hero" style={{ marginBottom: '.75rem', padding: '1.1rem 1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', color: 'var(--text-tertiary)', fontSize: '.66rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
              <BarChart3 size={13} /> NEPSE Index
            </span>
            <span>&middot;</span>
            <span>{asOf ? `Session ${fmtDate(asOf)}` : 'Latest session'}</span>
            {lastChecked && (
              <>
                <span>&middot;</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem' }}>
                  <Clock size={11} /> feed {fmtStamp(lastChecked)}
                </span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '.65rem', flexWrap: 'wrap', marginTop: '.55rem' }}>
            <strong style={{ fontSize: 'clamp(2rem, 4vw, 2.9rem)', lineHeight: 1.02, letterSpacing: '-.045em', fontVariantNumeric: 'tabular-nums' }}>
              {headline ? grouped(headline.close) : '—'}
            </strong>
            {headline && (
              <span className={dayUp ? 'positive' : 'negative'} style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem', fontSize: '.82rem', fontWeight: 700 }}>
                {dayUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
                {signed(move.change)} ({signed(move.pct)}%)
              </span>
            )}
          </div>
          <p className="muted" style={{ marginTop: '.15rem' }}>
            {headline ? `Previous close ${headline.previousClose.toFixed(2)} · day ${headline.low.toFixed(2)}–${headline.high.toFixed(2)}` : 'Index data unavailable'}
          </p>

          {rangePos != null && headline && (
            <div style={{ marginTop: '.85rem', maxWidth: 430 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.58rem', color: 'var(--text-tertiary)', marginBottom: '.28rem' }}>
                <span>52W low {headline.low52.toFixed(0)}</span>
                <span>52W high {headline.high52.toFixed(0)}</span>
              </div>
              <div style={{ position: 'relative', height: 8, borderRadius: 99, background: 'var(--border-light)' }}>
                <span style={{ position: 'absolute', inset: 0, width: `${rangePos}%`, borderRadius: 99, background: 'linear-gradient(90deg, var(--accent-light), var(--accent))' }} />
                <span style={{ position: 'absolute', left: `calc(${rangePos}% - 6px)`, top: -2, width: 12, height: 12, borderRadius: '50%', background: 'var(--bg-elevated)', border: '3px solid var(--accent)', boxShadow: 'var(--shadow-sm)' }} />
              </div>
            </div>
          )}

          {indices.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '.4rem', marginTop: '.9rem' }}>
              {indices.filter(index => index.name !== headline?.name).slice(0, 3).map(index => {
                const info = indexMove(index)
                const up = info.change >= 0
                return (
                  <div key={index.name} style={{ padding: '.45rem .55rem', borderRadius: 8, background: 'var(--bg-sunken)' }}>
                    <span style={{ display: 'block', fontSize: '.56rem', letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{index.name.replace(' Index', '')}</span>
                    <strong style={{ display: 'block', fontSize: '.78rem', fontVariantNumeric: 'tabular-nums' }}>{index.close.toFixed(2)}</strong>
                    <span className={up ? 'positive' : 'negative'} style={{ fontSize: '.62rem', fontWeight: 700 }}>{signed(info.pct)}%</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div style={{ minWidth: 0 }}>
          {visibleIndex.length > 1 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', marginBottom: '.3rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '.58rem', fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>{indexRange} index</span>
                <div style={{ display: 'flex', gap: '.2rem', flexWrap: 'wrap' }}>
                  {INDEX_RANGES.map(item => (
                    <button key={item.key} type="button" onClick={() => setIndexRange(item.key)} style={pillStyle(indexRange === item.key)}>
                      {item.key}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '.5rem', marginBottom: '.1rem' }}>
                <strong className={rangeUp ? 'positive' : 'negative'} style={{ fontSize: '.7rem' }}>{signed(rangePct)}% over {indexRange}</strong>
                <span style={{ fontSize: '.56rem', color: 'var(--text-tertiary)' }}>{visibleIndex.length} sessions</span>
              </div>
              <LineChart
                data={visibleIndex.map(point => ({ year: point.date, value: point.close, label: shortDay(point.date) }))}
                color={rangeUp ? 'var(--accent)' : 'var(--danger)'}
                height={185}
                yAxis
                formatValue={value => value.toFixed(0)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.56rem', color: 'var(--text-tertiary)', marginTop: '.15rem' }}>
                <span>{fmtDate(visibleIndex[0]?.date)}</span>
                <span>{fmtDate(visibleIndex[visibleIndex.length - 1]?.date)}</span>
              </div>
            </>
          ) : (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-tertiary)', fontSize: '.72rem' }}>
              Index history is unavailable right now.
            </div>
          )}
        </div>
      </div>

      <div className="metric-grid" style={{ padding: '0 0 1rem' }}>
        <div className="metric-card accent">
          <Landmark size={16} />
          <p>Total turnover</p>
          <strong>{summary?.totalTurnover ? formatNpr(summary.totalTurnover) : '—'}</strong>
          <span>{summary?.scripsTraded ? `${formatNum(summary.scripsTraded)} scrips traded` : "Today's traded value"}</span>
        </div>
        <div className="metric-card">
          <Activity size={16} />
          <p>Shares traded</p>
          <strong>{summary?.totalVolume ? formatNum(summary.totalVolume) : '—'}</strong>
          <span>{traded.length} securities with volume</span>
        </div>
        <div className="metric-card">
          <Layers size={16} />
          <p>Transactions</p>
          <strong>{summary?.totalTrades ? formatNum(summary.totalTrades) : '—'}</strong>
          <span>{summary?.totalTrades && summary.totalTurnover ? `${formatNpr(summary.totalTurnover / summary.totalTrades)} avg ticket` : 'Contracts matched'}</span>
        </div>
        <div className="metric-card">
          <Flame size={16} />
          <p>Market capitalisation</p>
          <strong>{summary?.marketCap ? formatNpr(summary.marketCap) : '—'}</strong>
          <span>{advance} up / {decline} down</span>
        </div>
      </div>

      <div className="market-heat-layout">
        <div className="panel">
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.65rem' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Turnover heatmap</p>
            <h3>Where the money moved</h3>
            <p className="muted">Tile area is {sizeBy === 'turnover' ? 'traded value' : 'market capitalisation'}; colour is the session move.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.4rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '.25rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setHeatMode('sector')} style={pillStyle(heatMode === 'sector')}>By sector</button>
              <button type="button" onClick={() => setHeatMode('mixed')} style={pillStyle(heatMode === 'mixed')}>Mixed map</button>
              <span style={{ width: 1, background: 'var(--border)', margin: '0 .1rem' }} />
              {(['turnover', 'marketCap'] as SizeKey[]).map(key => (
                <button key={key} type="button" onClick={() => setSizeBy(key)} style={pillStyle(sizeBy === key)}>
                  {key === 'turnover' ? 'By turnover' : 'By market cap'}
                </button>
              ))}
            </div>
            <span style={{ fontSize: '.62rem', color: 'var(--text-tertiary)', minHeight: '1em', textAlign: 'right' }}>
              {hover
                ? `${hover.symbol} · ${sectorLabel(hover.sector)} · ${formatNpr(hover.ltp)} · ${signed(hover.percentChange ?? 0)}% · ${formatNpr(hover.turnover)}`
                : heatMode === 'sector'
                  ? 'Each sector gets its own map · click a tile for full detail'
                  : 'Hover a tile for detail · click for full stock detail'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', margin: '.8rem 0 .6rem' }}>
          <button type="button" onClick={() => setHeatSector('All')} style={pillStyle(heatSector === 'All')}>All sectors</button>
          {sectorNames.map(name => (
            <button key={name} type="button" onClick={() => setHeatSector(name)} style={pillStyle(heatSector === name)}>{sectorLabel(name)}</button>
          ))}
        </div>

        {heatMode === 'mixed' ? (
          <div ref={heatRef} style={{ position: 'relative', width: '100%', height: 'clamp(330px, 46vw, 510px)', background: 'var(--bg-sunken)', borderRadius: 10, overflow: 'hidden' }}>
            {heatItems.length === 0 && (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--text-tertiary)', fontSize: '.72rem' }}>No traded securities in this slice.</div>
            )}
            {tiles.map(tile => {
              const area = (tile.w * tile.h) / Math.max(1, heatBox.width * heatBox.height)
              return (
                <HeatTile
                  key={tile.symbol}
                  tile={tile}
                  area={area}
                  rectStyle={{ left: `${tile.x}px`, top: `${tile.y}px`, width: `${tile.w}px`, height: `${tile.h}px` }}
                  onHover={setHover}
                  onLeave={clearHover}
                />
              )
            })}
          </div>
        ) : (
          <div className="sector-heat-grid" style={{ maxWidth: heatSector === 'All' ? undefined : 680 }}>
            {groupLayouts.length === 0 && (
              <div style={{ display: 'grid', placeItems: 'center', minHeight: 160, color: 'var(--text-tertiary)', fontSize: '.72rem' }}>No traded securities in this slice.</div>
            )}
            {groupLayouts.map(group => (
              <div key={group.sector} className="sector-heat-card">
                <Link href={`/market/sector/${encodeURIComponent(group.sector)}`} className="sector-heat-head" aria-label={`Open ${sectorLabel(group.sector)} sector detail`}>
                  <div style={{ minWidth: 0 }}>
                    <strong>{sectorLabel(group.sector)}</strong>
                    <span>{group.count} listed{group.items.length < group.count ? ` · top ${group.items.length} shown` : ''}</span>
                  </div>
                  <span className={`sector-heat-move ${group.avg >= 0 ? 'positive' : 'negative'}`}>{signed(group.avg)}%</span>
                  <ArrowUpRight size={11} className="sector-heat-open" aria-hidden />
                </Link>
                <div className="sector-heat-map">
                  {group.tiles.map(tile => (
                    <HeatTile
                      key={tile.symbol}
                      tile={tile}
                      area={(tile.w * tile.h) / 4000}
                      rectStyle={{
                        left: `${tile.x}%`,
                        top: `${(tile.y / 40) * 100}%`,
                        width: `${tile.w}%`,
                        height: `${(tile.h / 40) * 100}%`,
                      }}
                      onHover={setHover}
                      onLeave={clearHover}
                    />
                  ))}
                </div>
                <div className="sector-heat-foot">
                  <span>{formatNpr(group.turnover)} traded</span>
                  <span><span className="positive">{group.advance}▲</span> <span className="negative">{group.decline}▼</span></span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginTop: '.55rem', fontSize: '.58rem', color: 'var(--text-tertiary)' }}>
          <span>
            {heatMode === 'mixed'
              ? tileCount < traded.length ? `Top ${tileCount} of ${traded.length} traded securities by ${sizeBy === 'turnover' ? 'turnover' : 'market cap'}` : `${tileCount} traded securities`
              : `${groupedSecurityCount} securities across ${groupLayouts.length} sectors · ${groupedTileCount} tiles`}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'color-mix(in oklab, var(--danger) 42%, var(--bg-elevated))' }} /> −5%
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--bg-sunken)', border: '1px solid var(--border)' }} /> 0
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'color-mix(in oklab, var(--accent) 42%, var(--bg-elevated))' }} /> +5%
          </span>
        </div>
        </div>
        <div className="market-heat-rail">
          <BrokerPanel brokers={brokers} />
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: '.75rem' }}>
        <MoverPanel title="Top gainers" eyebrow="Session leaders" tone="up" stocks={topGainers.slice(0, 6)} max={maxMove} />
        <MoverPanel title="Top losers" eyebrow="Session laggards" tone="down" stocks={topLosers.slice(0, 6)} max={maxMove} />
      </div>

      <div className="lower-grid-3" style={{ marginBottom: '.75rem' }}>
        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Last {history.length || 30} sessions</p>
              <h3>Market activity</h3>
              <p className="muted">Daily turnover, {fmtDate(history[0]?.date)} &ndash; {fmtDate(asOf)}.</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '.56rem', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-tertiary)' }}>Average</span>
              <strong style={{ fontSize: '.82rem', fontVariantNumeric: 'tabular-nums' }}>{historyAverage ? formatNpr(historyAverage) : '—'}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 150, marginTop: '1rem', borderBottom: '1px solid var(--border-light)', paddingBottom: 1 }}>
            {history.map(day => (
              <div
                key={day.date}
                title={`${fmtDate(day.date)} · ${formatNpr(day.turnover)} · ${formatNum(day.volume)} shares · ${formatNum(day.trades)} trades`}
                style={{
                  flex: 1,
                  minWidth: 2,
                  height: `${Math.max(4, (day.turnover / historyMax) * 100)}%`,
                  borderRadius: '3px 3px 0 0',
                  background: day.date === asOf ? 'var(--accent)' : 'color-mix(in oklab, var(--accent) 42%, var(--bg-sunken))',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '.35rem', fontSize: '.56rem', color: 'var(--text-tertiary)' }}>
            <span>{fmtDate(history[0]?.date)}</span>
            <span>{asOf ? `Latest ${fmtDate(asOf)}` : ''}</span>
          </div>
        </div>

        <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Sentiment</p>
              <h3>Market mood</h3>
            </div>
            <Activity size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '.3rem', flex: 1 }}>
            <MoodGauge score={moodScore} />
            <strong className={moodTone} style={{ fontSize: '1.05rem', letterSpacing: '-.02em', marginTop: '-.2rem' }}>{moodLabel}</strong>
            <p style={{ margin: '.25rem 0 0', fontSize: '.62rem', lineHeight: 1.55, color: 'var(--text-secondary)', textAlign: 'center' }}>{moodBlurb}</p>
          </div>
          <div className="mood-factors">
            <div>
              <span>Advances / declines</span>
              <strong><span className="positive">{advance}</span> / <span className="negative">{decline}</span></strong>
            </div>
            <div>
              <span>5-session move</span>
              <strong className={momentumPct >= 0 ? 'positive' : 'negative'}>{signed(momentumPct)}%</strong>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Breadth</p>
              <h3>Advance / decline</h3>
              <p className="muted">{rows.length} listed securities tracked.</p>
            </div>
            <TrendingUp size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '.4rem', marginTop: '.85rem' }}>
            {[
              { label: 'Advances', value: advance, tone: 'positive' as const },
              { label: 'Declines', value: decline, tone: 'negative' as const },
              { label: 'Unchanged', value: flat, tone: '' },
            ].map(item => (
              <div key={item.label} style={{ padding: '.5rem .55rem', borderRadius: 8, background: 'var(--bg-sunken)' }}>
                <span style={{ display: 'block', fontSize: '.56rem', textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text-tertiary)' }}>{item.label}</span>
                <strong className={item.tone} style={{ fontSize: '1.05rem', letterSpacing: '-.03em' }}>{item.value}</strong>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', background: 'var(--bg-sunken)', marginTop: '.7rem' }}>
            <span style={{ width: `${(advance / Math.max(1, rows.length)) * 100}%`, background: 'var(--accent)' }} />
            <span style={{ width: `${(flat / Math.max(1, rows.length)) * 100}%`, background: 'var(--border)' }} />
            <span style={{ width: `${(decline / Math.max(1, rows.length)) * 100}%`, background: 'var(--danger)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem', marginTop: '.8rem', fontSize: '.64rem' }}>
            <div>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '.56rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>A/D ratio</span>
              <strong>{decline ? (advance / decline).toFixed(2) : '—'}</strong>
            </div>
            <div>
              <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '.56rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>Scrips traded</span>
              <strong>{summary?.scripsTraded ? formatNum(summary.scripsTraded) : formatNum(traded.length)}</strong>
            </div>
          </div>
        </div>
      </div>
      <div className="panel" id="market-table" style={{ scrollMarginTop: 90 }}>
        <div className="panel-head" style={{ flexWrap: 'wrap', gap: '.6rem' }}>
          <div>
            <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Full board</p>
            <h3>All listed securities</h3>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', border: '1px solid var(--border)', borderRadius: 8, padding: '.4rem .55rem', background: 'var(--bg)' }}>
              <Search size={13} style={{ color: 'var(--text-tertiary)' }} />
              <input
                value={query}
                onChange={event => { setQuery(event.target.value); setShowAll(false) }}
                placeholder="Symbol or company"
                aria-label="Search securities"
                style={{ border: 0, outline: 0, background: 'transparent', width: 150, fontSize: '.72rem' }}
              />
            </div>
            <select
              value={tableSector}
              onChange={event => { setTableSector(event.target.value); setShowAll(false) }}
              aria-label="Filter by sector"
              style={{ fontSize: '.7rem' }}
            >
              <option value="All">All sectors</option>
              {sectorNames.map(name => <option key={name} value={name}>{sectorLabel(name)}</option>)}
            </select>
          </div>
        </div>

        <DataTable
          rows={visible}
          columns={tableColumns}
          sort={sort}
          onSort={toggleSort}
          rowKey={stock => stock.symbol}
          rowClassName={() => 'market-row'}
          minWidth={860}
          showIndex
          empty="No securities match this filter."
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem', flexWrap: 'wrap', marginTop: '.7rem', fontSize: '.62rem', color: 'var(--text-tertiary)' }}>
          <span>
            {ranked.length ? `Showing ${Math.min(visible.length, ranked.length)} of ${ranked.length} securities` : 'No securities match this filter.'}
            {query ? ` · “${query}”` : ''}
          </span>
          {ranked.length > 60 && (
            <button type="button" className="text-button" onClick={() => setShowAll(value => !value)}>
              {showAll ? 'Show first 60' : `Show all ${ranked.length}`}
            </button>
          )}
        </div>
      </div>

      {ipos.length > 0 && (
        <div className="panel" style={{ marginTop: '.75rem' }}>
          <div className="panel-head">
            <div>
              <p className="eyebrow" style={{ marginBottom: '.2rem' }}>Primary market</p>
              <h3>IPO pipeline</h3>
              <p className="muted">Upcoming issues tracked by the mirror &mdash; dates are as announced.</p>
            </div>
            <TrendingUp size={16} style={{ color: 'var(--text-tertiary)' }} />
          </div>
          <div className="grid-auto" style={{ marginTop: '.75rem' }}>
            {ipos.slice(0, 6).map((ipo, index) => (
              <div key={`${ipo.company}-${index}`} style={{ padding: '.65rem .75rem', borderRadius: 10, background: 'var(--bg-sunken)' }}>
                <strong style={{ display: 'block', fontSize: '.7rem' }}>{ipo.company}</strong>
                <span style={{ display: 'block', fontSize: '.6rem', color: 'var(--text-secondary)', marginTop: '.15rem' }}>{ipo.units}</span>
                <span style={{ display: 'block', fontSize: '.58rem', color: 'var(--text-tertiary)', marginTop: '.3rem' }}>{ipo.date_range}</span>
                {ipo.url && (
                  <a href={ipo.url} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '.2rem', marginTop: '.35rem', fontSize: '.6rem', fontWeight: 700, color: 'var(--accent)' }}>
                    Details <ExternalLink size={10} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ margin: '1rem 0 0', fontSize: '.62rem', color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
        Source: YONepse mirror of the Nepal Stock Exchange, refreshed hourly. Session figures cover the latest trading day and may lag the official close by minutes.
        Market cap is the exchange feed&rsquo;s own figure. Informational only, not investment advice.
      </p>
    </div>
  )
}

function filteredRows(rows: Row[], sector: string, query: string): Row[] {
  const needle = query.trim().toLowerCase()
  return rows.filter(row => {
    if (sector !== 'All' && row.sector !== sector) return false
    if (!needle) return true
    return row.symbol.toLowerCase().includes(needle) || row.companyName.toLowerCase().includes(needle)
  })
}

function BrokerPanel({ brokers }: { brokers: NepseBroker[] }) {
  return (
    <div className="panel" style={{ padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '.1rem' }}>30-day turnover</p>
          <h3 style={{ fontSize: '1rem' }}>Top brokers</h3>
        </div>
        <Landmark size={15} style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <div style={{ marginTop: '.45rem' }}>
        {brokers.length === 0 && <span style={{ fontSize: '.66rem', color: 'var(--text-tertiary)' }}>Broker rankings are unavailable.</span>}
        {brokers.slice(0, 8).map((broker, index) => (
          <div key={broker.memberCode} style={{ display: 'grid', gridTemplateColumns: '16px minmax(0, 1fr) auto', alignItems: 'center', gap: '.45rem', padding: '.42rem .3rem', borderTop: index === 0 ? 0 : '1px solid var(--border-light)' }}>
            <span style={{ fontSize: '.56rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>{index + 1}</span>
            <span style={{ minWidth: 0, fontSize: '.66rem', fontWeight: 650, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{broker.memberName}</span>
            <strong style={{ fontSize: '.66rem', whiteSpace: 'nowrap' }}>{formatNpr(broker.turnover30d)}</strong>
          </div>
        ))}
      </div>
      <p style={{ margin: '.45rem .3rem 0', fontSize: '.56rem', color: 'var(--text-tertiary)' }}>
        {brokers.length > 8 ? `Top 8 of ${brokers.length} active brokers` : 'Ranked by reported 30-day turnover.'}
      </p>
    </div>
  )
}

function MoverPanel({ title, eyebrow, tone, stocks, max }: {
  title: string
  eyebrow: string
  tone: 'up' | 'down' | 'neutral'
  stocks: NepseStock[]
  max: number
}) {
  const accent = tone === 'up' ? 'var(--accent)' : tone === 'down' ? 'var(--danger)' : 'var(--text-secondary)'
  const tint = tone === 'up' ? 'var(--accent-light)' : tone === 'down' ? 'var(--danger-light)' : 'var(--bg-sunken)'
  return (
    <div className="panel" style={{ padding: '1rem 1.1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <div>
          <p className="eyebrow" style={{ marginBottom: '.1rem', color: accent }}>{eyebrow}</p>
          <h3 style={{ fontSize: '1rem' }}>{title}</h3>
        </div>
        {tone === 'up' ? <TrendingUp size={15} style={{ color: accent }} /> : tone === 'down' ? <TrendingDown size={15} style={{ color: accent }} /> : <Flame size={15} style={{ color: accent }} />}
      </div>
      <div style={{ marginTop: '.45rem' }}>
        {stocks.length === 0 && <span style={{ fontSize: '.66rem', color: 'var(--text-tertiary)' }}>No trades yet.</span>}
        {stocks.map((stock, index) => {
          const pct = stock.percentChange ?? 0
          const width = Math.min(100, (Math.abs(pct) / Math.max(1, max)) * 100)
          return (
            <Link
              key={`${title}-${stock.symbol}`}
              href={`/market/${stock.symbol}`}
              className="mover-row"
              title={`${stock.companyName} · ${formatNpr(stock.ltp)}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '16px minmax(0, 1fr) auto',
                alignItems: 'center',
                gap: '.45rem',
                width: '100%',
                padding: '.42rem .3rem',
                borderTop: index === 0 ? 0 : '1px solid var(--border-light)',
                textAlign: 'left',
                textDecoration: 'none',
                color: 'var(--text)',
                background: tone === 'neutral'
                  ? 'transparent'
                  : `linear-gradient(90deg, ${tint} ${width}%, transparent ${width}%)`,
              }}
            >
              <span style={{ fontSize: '.56rem', fontWeight: 700, color: 'var(--text-tertiary)' }}>{index + 1}</span>
              <span style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', fontSize: '.7rem' }}>{stock.symbol}</strong>
                <span style={{ display: 'block', fontSize: '.58rem', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stock.companyName}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <strong className={tone === 'neutral' ? undefined : pct >= 0 ? 'positive' : 'negative'} style={{ display: 'block', fontSize: '.7rem' }}>
                  {tone === 'neutral' ? formatNpr(stock.turnover) : `${signed(pct)}%`}
                </strong>
                <span style={{ display: 'block', fontSize: '.58rem', color: 'var(--text-tertiary)' }}>{formatNpr(stock.ltp)}</span>
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
