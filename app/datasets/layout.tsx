import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal open data catalog',
  description: 'Search public datasets about Nepal from Open Data Nepal and other documented sources.',
}

export default function DatasetsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
