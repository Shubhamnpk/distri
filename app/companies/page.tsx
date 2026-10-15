import { CompaniesList, type LatestCompanyFinancial } from '@/components/companies-list'
import { companies } from '@/lib/data'
import { symbolForCompany } from '@/lib/company-symbols'
import { fetchNepseCompanyFinancials, fetchNepseStocks, latestAnnualCompanyResult } from '@/lib/nepse'

export default async function CompaniesPage() {
  const latestFinancials: Record<string, LatestCompanyFinancial> = {}
  const [financials, stocks] = await Promise.all([fetchNepseCompanyFinancials(), fetchNepseStocks()])
  const bySymbol = new Map(financials.map(entry => [entry.symbol.toUpperCase(), entry]))
  const trackedListings = companies.flatMap(company => {
    const symbol = symbolForCompany(company.name)
    const stock = symbol ? stocks.find(entry => entry.symbol.toUpperCase() === symbol) : undefined
    return stock ? [{ company: company.name, symbol: stock.symbol, turnover: stock.turnover ?? 0 }] : []
  }).sort((a, b) => b.turnover - a.turnover || a.company.localeCompare(b.company))
  const nepseRanks: Record<string, { rank: number; symbol: string }> = {}
  trackedListings.forEach((listing, index) => {
    nepseRanks[listing.company] = { rank: index + 1, symbol: listing.symbol }
  })

  for (const company of companies) {
    const symbol = symbolForCompany(company.name)
    const reports = symbol ? bySymbol.get(symbol)?.reports ?? [] : []
    const latest = latestAnnualCompanyResult(reports)
    if (!latest) continue

    latestFinancials[company.name] = {
      profit: latest.profit,
      quarter: latest.basis === 'annual' ? 'annual report' : 'Q total',
      fy: latest.fy || 'Unknown',
      fyNepali: latest.fyNepali,
      annual: true,
    }
  }

  return <CompaniesList latestFinancials={latestFinancials} nepseRanks={nepseRanks} />
}
