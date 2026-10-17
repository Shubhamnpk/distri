/** Canonical currency display conventions for the whole app. No page hardcodes a symbol or unit.
 *  NPR uses the Nepali scale: Lakh 1e5 · Crore 1e7 · Arba 1e9 · Kharab 1e11 (press style, e.g. budget रु 19 Kharab).
 *  USD uses the international scale: T · B · M. */
export const NPR_CODE = 'NPR'
export const NPR_SYMBOL = '\u0930\u0941'
export const USD_CODE = 'USD'
export const USD_SYMBOL = '$'

type Ladder = Array<[divisor: number, unit: string, digits: number]>

/** Shared compact-suffix engine: returns "57.43 Kharab" style text for a magnitude. */
function compact(absolute: number, ladder: Ladder): string {
  for (const [divisor, unit, digits] of ladder) {
    if (absolute >= divisor) {
      const qty = (absolute / divisor).toFixed(digits).replace(/\.0+$/, '')
      return `${qty} ${unit}`
    }
  }
  return absolute.toLocaleString(undefined, { maximumFractionDigits: 2 })
}

const NPR_LADDER: Ladder = [
  [1e11, 'Kharab', 2],
  [1e9, 'Arba', 1],
  [1e7, 'Crore', 0],
  [1e5, 'Lakh', 1],
]

const USD_LADDER: Ladder = [
  [1e12, 'T', 2],
  [1e9, 'B', 1],
  [1e6, 'M', 0],
]

/** Format a numeric NPR amount: रु 57.4 Kharab · रु 12.5 Arba · रु 391 Crore · रु 3.2 Lakh. */
export function formatNpr(amount: unknown): string {
  const value = Number(amount)
  if (amount == null || !Number.isFinite(value)) return '-'
  return `${value < 0 ? '-' : ''}${NPR_SYMBOL} ${compact(Math.abs(value), NPR_LADDER)}`
}

/** Format a numeric USD amount: $5.74T · $12.5B · $950M · $1,423. */
export function formatUsd(amount: unknown): string {
  const value = Number(amount)
  if (amount == null || !Number.isFinite(value)) return '-'
  return `${value < 0 ? '-' : ''}${USD_SYMBOL}${compact(Math.abs(value), USD_LADDER)}`
}

/** Plain compact number, no currency: 30.2M · 851K · 42.6 (counts, population). */
export function formatNum(num: unknown): string {
  const value = Number(num)
  if (num == null || !Number.isFinite(value)) return '-'
  return compact(Math.abs(value), [[1e9, 'B', 2], [1e6, 'M', 1], [1e3, 'K', 1]])
}

/** Exchange-rate figure: रु 152.44 (NPR per USD). Pair labels keep the ISO code (USD/NPR). */
export function formatNprRate(rate: number): string {
  return `${NPR_SYMBOL} ${rate.toFixed(2)}`
}

/** Full pair chip text: रु 152.44 / $ */
export function formatFxPair(rate: number): string {
  return `${formatNprRate(rate)} / ${USD_SYMBOL}`
}

/** Normalize legacy NPR/Rs labels at display boundaries; positive plus signs are redundant. */
export function formatNprText(value: string): string {
  const normalized = value
    .replace(/\+\s*(?:NPR|Rs\.?|\u0930\u0941|\u0930\u0942)\s*/gi, `${NPR_SYMBOL} `)
    .replace(/-\s*(?:NPR|Rs\.?|\u0930\u0941|\u0930\u0942)\s*/gi, `-${NPR_SYMBOL} `)
    .replace(/\b(?:NPR|Rs\.?)\s*/gi, `${NPR_SYMBOL} `)
  if (/(?:NPR|Rs\.?|\u0930\u0941|\u0930\u0942)/i.test(value)) return normalized

  // Monetary fields store the amount and unit; currency is added only when displayed.
  const amount = normalized.match(/^(\s*)([+-]?\s*)([\d,]+(?:\.\d+)?\s*(?:trillion|tn|billion|bn|crore|cr|arba|kharab|million|mn|lakh|lac|thousand|k|b|m|t))(.*)$/i)
  if (amount) return `${amount[1]}${amount[2].trim() === '-' ? '-' : ''}${NPR_SYMBOL} ${amount[3].trim()}${amount[4]}`
  const dividend = normalized.match(/^(\s*Dividend\s+)([+-]?\s*)([\d,]+(?:\.\d+)?\s*(?:trillion|tn|billion|bn|crore|cr|arba|kharab|million|mn|lakh|lac|thousand|k|b|m|t))(.*)$/i)
  if (dividend) return `${dividend[1]}${dividend[2].trim() === '-' ? '-' : ''}${NPR_SYMBOL} ${dividend[3].trim()}${dividend[4]}`
  return normalized
}

/** Render unavailable financial fields consistently in tables and statements. */
export function formatNprOrNA(value: string): string {
  if (/^(?:-|—|–|n\/a|not reported|not published|unavailable|not applicable|not comparable|not disclosed|pending)$/i.test(value.trim())) return 'N/A'
  return formatNprText(value)
}
