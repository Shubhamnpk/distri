import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Design icon audit',
  robots: { index: false, follow: false },
}

export default function IconsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
