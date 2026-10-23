import { NextResponse } from 'next/server'
import {
  fetchNepseData,
  fetchNepseIndices,
  fetchNepseMarketHistory,
  fetchNepseMarketStatus,
  fetchNepseSectorMap,
} from '@/lib/nepse'
import type { NepseMarketPulse } from '@/lib/types'

export const revalidate = 3600

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

export async function GET() {
  const [data, indices, history, status, sectorMap] = await Promise.all([
    fetchNepseData(),
    fetchNepseIndices(),
    fetchNepseMarketHistory(1),
    fetchNepseMarketStatus(),
    fetchNepseSectorMap(),
  ])

  const headline = indices.find(index => /nepse index/i.test(index.name)) ?? indices[0] ?? null

  if (!headline && data.stocks.length === 0) {
    return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
  }

  const sectorStats = new Map<string, { count: number; turnover: number; sum: number; movers: number }>()
  let advances = 0
  let declines = 0
  let flat = 0

  for (const stock of data.stocks) {
    const pct = stock.percentChange ?? 0
    if (pct > 0) advances += 1
    else if (pct < 0) declines += 1
    else flat += 1

    const sector = sectorMap[stock.symbol.toUpperCase()] ?? stock.sector ?? 'Others'
    const entry = sectorStats.get(sector) ?? { count: 0, turnover: 0, sum: 0, movers: 0 }
    entry.count += 1
    entry.turnover += stock.turnover ?? 0
    if (pct !== 0) {
      entry.sum += pct
      entry.movers += 1
    }
    sectorStats.set(sector, entry)
  }

  const sectors = [...sectorStats.entries()]
    .map(([name, entry]) => ({
      name: SECTOR_LABELS[name] ?? name,
      avg: entry.movers ? entry.sum / entry.movers : 0,
      count: entry.count,
      turnover: entry.turnover,
    }))
    .sort((a, b) => b.avg - a.avg)

  const payload: NepseMarketPulse = {
    headline,
    summary: data.market.totalTurnover > 0 ? data.market : null,
    breadth: { advances, declines, flat, total: data.stocks.length },
    topSectors: sectors.slice(0, 3),
    bottomSectors: [...sectors].reverse().slice(0, 3),
    gainers: data.topGainers.slice(0, 3),
    losers: data.topLosers.slice(0, 3),
    session: history[history.length - 1]?.date ?? '',
    isOpen: typeof status?.is_open === 'boolean' ? status.is_open : null,
    lastChecked: typeof status?.last_checked === 'string' ? status.last_checked : undefined,
  }

  return NextResponse.json(payload, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  })
}
