'use client'

import { BarChart } from '@/components/charts'

/** Client wrapper: BarChart is interactive, so its formatter must live client-side. */
export function ProcurementYearChart({ years }: { years: { year: string; value: number }[] }) {
  return <BarChart data={years} height={150} color="var(--primary)" formatValue={v => v.toLocaleString()} />
}
