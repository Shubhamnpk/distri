import { fetchEgpTender } from '@/lib/egp'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: 'Invalid tender ID' }, { status: 400 })
  }

  const tender = await fetchEgpTender(id)
  if (!tender) {
    return Response.json({ error: 'Tender details are temporarily unavailable' }, { status: 502 })
  }

  return Response.json(tender, {
    headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' },
  })
}
