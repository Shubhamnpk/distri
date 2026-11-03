import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal economy: GDP, inflation and public finance',
  description: 'Explore Nepal economic indicators from the World Bank and IMF, including GDP growth, inflation, trade, debt and forecasts.',
}

export default function EconomyLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
