import type { Metadata } from 'next'
import { MarketBoard } from '@/components/market-board'
import {
  fetchNepseStocks,
  fetchNepseMarketSummary,
  fetchNepseIndices,
  fetchNepseMarketStatus,
  fetchNepseTopStocks,
  fetchNepseMarketHistory,
  fetchNepseIndexHistory,
  fetchNepseSectorMap,
  fetchNepseDividendHistory,
  fetchNepseDisclosures,
  fetchUpcomingIpos,
  fetchNepseTopBrokers,
} from '@/lib/nepse'

export const metadata: Metadata = {
  title: 'Market - Drishti',
  description: 'NEPSE trading floor: every listed security, the turnover heatmap, sector pulse, benchmark indices and the day\u2019s biggest movers.',
}

export const revalidate = 3600

export default async function MarketPage() {
  const [stocks, summary, indices, status, topStocks, history, indexHistory, sectorMap, ipos, dividends, disclosures, brokers] = await Promise.all([
    fetchNepseStocks(),
    fetchNepseMarketSummary(),
    fetchNepseIndices(),
    fetchNepseMarketStatus(),
    fetchNepseTopStocks(),
    fetchNepseMarketHistory(30),
    fetchNepseIndexHistory(60),
    fetchNepseSectorMap(),
    fetchUpcomingIpos(),
    fetchNepseDividendHistory(),
    fetchNepseDisclosures(),
    fetchNepseTopBrokers(),
  ])

  return (
    <MarketBoard
      stocks={stocks}
      summary={summary}
      indices={indices}
      isOpen={typeof status?.is_open === 'boolean' ? status.is_open : null}
      lastChecked={typeof status?.last_checked === 'string' ? status.last_checked : undefined}
      topGainers={topStocks?.topGainers ?? []}
      topLosers={topStocks?.topLosers ?? []}
      history={history}
      indexHistory={indexHistory}
      sectorMap={sectorMap}
      ipos={ipos}
      dividends={dividends.slice(0, 6)}
      disclosures={disclosures.slice(0, 6)}
      brokers={brokers.slice(0, 6)}
    />
  )
}
