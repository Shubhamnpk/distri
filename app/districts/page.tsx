import { redirect } from 'next/navigation'

export default async function DistrictsPage({
  searchParams,
}: {
  searchParams: Promise<{ province?: string | string[]; q?: string | string[] }>
}) {
  const sp = await searchParams
  const province = Array.isArray(sp.province) ? sp.province[0] : sp.province
  const q = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const params = new URLSearchParams()
  if (province) params.set('province', province)
  if (q) params.set('q', q)
  redirect(params.size ? `/places?${params.toString()}` : '/places')
}
