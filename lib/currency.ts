/** Canonical Nepalese rupee display conventions for the whole app. */
export const NPR_CODE = 'NPR'
export const NPR_SYMBOL = '\u0930\u0941'

/** Format a numeric NPR amount with the app's standard compact units. */
export function formatNpr(amount: unknown): string {
  const value = Number(amount)
  if (amount == null || !Number.isFinite(value)) return '-'

  const absolute = Math.abs(value)
  const sign = value < 0 ? '-' : ''
  const prefix = `${sign}${NPR_SYMBOL} `
  if (absolute >= 1e12) return `${prefix}${(absolute / 1e12).toFixed(2)}T`
  if (absolute >= 1e9) return `${prefix}${(absolute / 1e9).toFixed(1)}B`
  if (absolute >= 1e7) return `${prefix}${(absolute / 1e7).toFixed(0)}Cr`
  if (absolute >= 1e5) return `${prefix}${(absolute / 1e5).toFixed(1)}L`
  return `${prefix}${absolute.toLocaleString()}`
}

/** Normalize legacy NPR/Rs labels at display boundaries; positive plus signs are redundant. */
export function formatNprText(value: string): string {
  const normalized = value
    .replace(/\+\s*(?:NPR|Rs\.?|\u0930\u0941)\s*/gi, `${NPR_SYMBOL} `)
    .replace(/-\s*(?:NPR|Rs\.?|\u0930\u0941)\s*/gi, `-${NPR_SYMBOL} `)
    .replace(/\b(?:NPR|Rs\.?)\s*/gi, `${NPR_SYMBOL} `)
  if (/(?:NPR|Rs\.?|\u0930\u0941)/i.test(value)) return normalized

  // Monetary fields store the amount and unit; currency is added only when displayed.
  const amount = normalized.match(/^(\s*)([+-]?\s*)([\d,]+(?:\.\d+)?\s*(?:trillion|tn|billion|bn|crore|cr|million|mn|lakh|lac|thousand|k|b|m|t))(.*)$/i)
  if (amount) return `${amount[1]}${amount[2].trim() === '-' ? '-' : ''}${NPR_SYMBOL} ${amount[3].trim()}${amount[4]}`
  const dividend = normalized.match(/^(\s*Dividend\s+)([+-]?\s*)([\d,]+(?:\.\d+)?\s*(?:trillion|tn|billion|bn|crore|cr|million|mn|lakh|lac|thousand|k|b|m|t))(.*)$/i)
  if (dividend) return `${dividend[1]}${dividend[2].trim() === '-' ? '-' : ''}${NPR_SYMBOL} ${dividend[3].trim()}${dividend[4]}`
  return normalized
}

/** Render unavailable financial fields consistently in tables and statements. */
export function formatNprOrNA(value: string): string {
  if (/^(?:-|—|–|n\/a|not reported|not published|unavailable|not applicable|not comparable|not disclosed|pending)$/i.test(value.trim())) return 'N/A'
  return formatNprText(value)
}
