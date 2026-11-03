import type { Metadata } from 'next'
import { DISTRICTS, LOCAL_UNITS } from '@/lib/geo-constants'

export async function generateMetadata({ params }: { params: Promise<{ district: string; palika: string }> }): Promise<Metadata> {
  const { district: districtSlug, palika: palikaSlug } = await params
  const district = DISTRICTS.find((item) => item.slug === districtSlug)
  const palika = district && LOCAL_UNITS.find((item) => item.district === district.name && item.slug === palikaSlug)
  if (!district || !palika) return { title: 'Local unit not found', robots: { index: false, follow: true } }
  return {
    title: `${palika.name}, ${district.name} District`,
    description: `View the ${palika.name} local government profile in ${district.name}, ${district.province}, Nepal, with census, area, weather, map and nearby-place information.`,
    alternates: { canonical: `/districts/${district.slug}/${palika.slug}` },
  }
}

export default function PalikaLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
