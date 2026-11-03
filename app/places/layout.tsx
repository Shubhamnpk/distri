import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal provinces, districts and local units',
  description: 'Browse profiles and public data for Nepal’s seven provinces, 77 districts and 753 local units.',
  alternates: { canonical: '/places' },
}

export default function PlacesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
