import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Nepal public data',
  description: 'Search Nepal provinces, districts, palikas, NEPSE stocks, public companies, infrastructure projects, open datasets and sources.',
  alternates: { canonical: '/search' },
}

export default function SearchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
