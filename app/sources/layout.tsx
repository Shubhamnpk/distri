import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal public data sources and evidence registry',
  description: 'Review the government, multilateral and open data sources behind Drishti’s Nepal public accountability records.',
}

export default function SourcesLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
