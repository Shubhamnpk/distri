import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { MarketSectorDetail } from '@/components/market-sector-detail'
import { fetchNepseSectorMap, fetchNepseSectorPerformance, fetchNepseStocks } from '@/lib/nepse'

type Props = { params: Promise<{ sector: string }> }

function routeSector(value: string): string {
  try { return decodeURIComponent(value).trim() } catch { return value.trim() }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sector } = await params
  const name = routeSector(sector)
  return { title: `${name} - NEPSE Market - Drishti`, description: `${name} constituents, breadth, session movers and turnover on the Nepal Stock Exchange.` }
}

export default async function SectorPage({ params }: Props) {
  const { sector: rawSector } = await params
  const sector = routeSector(rawSector)
  const [stocks, sectorMap] = await Promise.all([fetchNepseStocks(), fetchNepseSectorMap()])
  const rows = stocks.filter(stock =>
    (sectorMap[stock.symbol.toUpperCase()] ?? stock.sector ?? 'Others').trim().toLocaleLowerCase() === sector.toLocaleLowerCase(),
  )
  if (!rows.length) notFound()

  const performance = await fetchNepseSectorPerformance(rows.map(stock => stock.symbol), 12)
  const marketTurnover = stocks.reduce((sum, stock) => sum + stock.turnover, 0)
  return <MarketSectorDetail sector={sector} rows={rows} marketTurnover={marketTurnover} performance={performance} />
}
