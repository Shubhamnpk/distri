import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal disaster incidents, relief and risk data',
  description: 'Explore official Nepal disaster incident records, reported damage, relief distributions and disaster risk data from BIPAD.',
}

export default function DisastersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
