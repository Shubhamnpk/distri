import { fetchEgpTender } from '@/lib/egp'
import { cdnCache } from '@/lib/cache'

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
    return Response.json({ error: 'Tender details are temporarily unavailable' }, { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }

  return Response.json(tender, {
    headers: cdnCache(1800),
  })
}
