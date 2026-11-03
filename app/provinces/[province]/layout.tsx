import type { Metadata } from 'next'
import { PROVINCES } from '@/lib/geo-constants'

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }): Promise<Metadata> {
  const { province: slug } = await params
  const province = PROVINCES.find((item) => item.slug === slug)
  if (!province) return { title: 'Province not found', robots: { index: false, follow: true } }
  return {
    title: `${province.name} Province profile and public data`,
    description: `Explore ${province.name} Province, Nepal: district profiles, local units, population and census data, weather, maps and nearby places.`,
    alternates: { canonical: `/provinces/${province.slug}` },
  }
}

export default function ProvinceLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
