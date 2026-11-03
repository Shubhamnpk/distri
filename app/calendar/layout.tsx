import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nepal public calendar, holidays and market dates',
  description: 'Browse Nepal public holidays, fiscal dates and market events in the Bikram Sambat and Gregorian calendars.',
}

export default function CalendarLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
