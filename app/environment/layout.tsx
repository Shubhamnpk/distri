import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal weather, air quality and environmental alerts',
  description: 'Monitor Nepal weather forecasts, air quality, river conditions, earthquakes and disaster alerts from public feeds.',
}

export default function EnvironmentLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
