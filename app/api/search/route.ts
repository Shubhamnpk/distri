import { NextResponse } from 'next/server'
import { searchDatasets } from '@/lib/opendatanepal'
import { fetchNepseStocks } from '@/lib/nepse'
import { formatNpr } from '@/lib/currency'

export const dynamic = 'force-dynamic'

type SearchHit = {
  id: string
  kind: 'stock' | 'dataset'
  label: string
  sub: string
  href: string
  external?: boolean
  stock?: { price: string; change: string; turnover: string; positive: boolean }
}

function normalize(value: string): string {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function stockScore(query: string, stock: { symbol: string; companyName: string; sector?: string; asset_type?: string }): number {
  const symbol = normalize(stock.symbol)
  const name = normalize(stock.companyName)
  const details = normalize(`${stock.sector ?? ''} ${stock.asset_type ?? ''}`)
  if (symbol === query) return 130
  if (symbol.startsWith(query)) return 120
  if (name === query) return 115
  if (name.startsWith(query)) return 105
  if (symbol.includes(query)) return 95
  if (name.includes(query)) return 85
  if (details.includes(query)) return 35
  const words = query.split(' ').filter(Boolean)
  return words.length > 1 && words.every(word => `${symbol} ${name} ${details}`.includes(word)) ? 65 : 0
}

export async function GET(request: Request) {
  const query = normalize(new URL(request.url).searchParams.get('q') ?? '')
  if (query.length < 2) return NextResponse.json({ hits: [] })

  const [stocks, datasets] = await Promise.all([
    fetchNepseStocks().catch(() => []),
    searchDatasets(query, 8).catch(() => []),
  ])

  const stockHits: SearchHit[] = stocks
    .map(stock => ({ stock, score: stockScore(query, stock) }))
    .filter(row => row.score > 0)
    .sort((a, b) => b.score - a.score || a.stock.symbol.localeCompare(b.stock.symbol))
    .slice(0, 15)
    .map(({ stock }) => ({
      id: `stock:${stock.symbol}`,
      kind: 'stock',
      label: `${stock.symbol} · ${stock.companyName}`,
      sub: `${stock.sector || stock.asset_type || 'NEPSE listed security'} · ${stock.asset_type || 'Listed security'}`,
      href: `/market/${encodeURIComponent(stock.symbol)}`,
      stock: {
        price: formatNpr(stock.ltp),
        change: `${stock.percentChange >= 0 ? '+' : ''}${stock.percentChange.toFixed(2)}%`,
        turnover: formatNpr(stock.turnover),
        positive: stock.percentChange >= 0,
      },
    }))

  const datasetHits: SearchHit[] = datasets.slice(0, 8).map(dataset => ({
    id: `dataset:${dataset.id}`,
    kind: 'dataset',
    label: dataset.title,
    sub: `${dataset.organization?.title || 'Open Data Nepal'} · ${dataset.resources?.length ?? 0} resources`,
    href: `https://opendatanepal.com/dataset/${encodeURIComponent(dataset.name)}`,
    external: true,
  }))

  return NextResponse.json({ hits: [...stockHits, ...datasetHits] }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}
