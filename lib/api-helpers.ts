import { NPR_SYMBOL } from '@/lib/currency'

const NPR_RATE = 133.5

export function formatUsd(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(0)}M`
  return `$${v.toLocaleString()}`
}

export function formatNpr(v: number): string {
  const npr = v * NPR_RATE
  if (npr >= 1e12) return `${NPR_SYMBOL} ${(npr / 1e12).toFixed(1)} Kharab`
  if (npr >= 1e9) return `${NPR_SYMBOL} ${(npr / 1e9).toFixed(0)} Arba`
  if (npr >= 1e7) return `${NPR_SYMBOL} ${(npr / 1e7).toFixed(0)} Crore`
  return `${NPR_SYMBOL} ${Math.round(npr).toLocaleString()}`
}

export function formatNum(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`
  return v.toLocaleString()
}

export function pctChange(curr: number, prev: number): number {
  return prev ? ((curr - prev) / prev) * 100 : 0
}
