import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Nepal public data',
  description: 'Find Nepal provinces, districts, local units, public companies, infrastructure projects and datasets.',
  alternates: { canonical: '/search' },
}

export default function SearchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
