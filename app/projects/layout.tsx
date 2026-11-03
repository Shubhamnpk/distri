import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal public infrastructure projects',
  description: 'Track budgets, reported progress, targets, contractors and evidence for Nepal’s national priority infrastructure projects.',
}

export default function ProjectsLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
