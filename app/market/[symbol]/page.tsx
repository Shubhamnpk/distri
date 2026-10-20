import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StockDetail } from '@/components/stock-detail'
import {
  fetchLtpRecent,
  fetchNepseCompanyFinancials,
  fetchNepseCompanyProfiles,
  fetchNepseDisclosures,
  fetchNepseDividendHistory,
  fetchNepseFloorSheetSummary,
  fetchNepseSectorMap,
  fetchNepseStocks,
} from '@/lib/nepse'
import { formatNpr, formatNprOrNA } from '@/lib/currency'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ symbol: string }> }): Promise<Metadata> {
  const symbol = (await params).symbol.toUpperCase()
  const stocks = await fetchNepseStocks()
  const stock = stocks.find(item => item.symbol.toUpperCase() === symbol)
  if (!stock) return { title: 'Stock not found - Drishti' }
  return {
    title: `${stock.symbol} · ${stock.companyName} - Drishti`,
    description: `${stock.companyName} (${stock.symbol}) on NEPSE: ${formatNprOrNA(formatNpr(stock.ltp))}, ${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange.toFixed(2)}% today. Price history, 52-week range, volume and sector peers.`,
  }
}

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const symbol = (await params).symbol.toUpperCase()
  const [stocks, sectorMap, history, profiles, companyFinancials, allDividends, allDisclosures, floorSheet] = await Promise.all([
    fetchNepseStocks(),
    fetchNepseSectorMap(),
    fetchLtpRecent(symbol, 240),
    fetchNepseCompanyProfiles(),
    fetchNepseCompanyFinancials(),
    fetchNepseDividendHistory(),
    fetchNepseDisclosures(),
    fetchNepseFloorSheetSummary(symbol),
  ])

  const stock = stocks.find(item => item.symbol.toUpperCase() === symbol)
  if (!stock) notFound()

  const sector = sectorMap[symbol] ?? stock.sector ?? 'Others'
  const peers = stocks
    .filter(item => item.symbol !== stock.symbol && (sectorMap[item.symbol.toUpperCase()] ?? item.sector) === sector && (item.turnover ?? 0) > 0)
    .sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0))
    .slice(0, 6)

  const byTurnover = [...stocks].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0))
  const rankIndex = byTurnover.findIndex(item => item.symbol === stock.symbol)
  const rank = rankIndex >= 0 ? { byTurnover: rankIndex + 1, of: byTurnover.length } : null
  const profile = profiles.find(item => item.symbol.toUpperCase() === symbol) ?? null
  const financials = companyFinancials.find(item => item.symbol.toUpperCase() === symbol) ?? null
  const dividends = allDividends.filter(item => item.symbol.toUpperCase() === symbol).slice(0, 6)
  const disclosures = allDisclosures.filter(item => item.symbol?.toUpperCase() === symbol).slice(0, 5)

  return (
    <StockDetail
      stock={stock}
      sector={sector}
      history={history}
      peers={peers}
      profile={profile}
      rank={rank}
      financials={financials}
      dividends={dividends}
      disclosures={disclosures}
      floorSheet={floorSheet}
    />
  )
}
