/** Format a Nepal BS fiscal year first, followed by the Gregorian equivalent. */
export function formatFiscalYearLabel(value: string, nepaliValue?: string): string {
  const nepaliRange = nepaliValue?.match(/(20\d{2})\s*[/-]\s*(\d{2,4})/)
  const currentRange = value.match(/(20\d{2})\s*[/-]\s*(\d{2,4})/)
  const range = nepaliRange ?? currentRange
  if (!range) return value.replace(/^FY\s*/i, '').trim()

  const first = Number(range[1])
  const isNepali = !!nepaliRange || first >= 2070
  const startAd = isNepali ? first - 57 : first
  const bsStart = isNepali ? first : startAd + 57
  const bsEnd = bsStart + 1
  const adEnd = startAd + 1
  return `${bsStart}/${String(bsEnd).slice(-2)} (${startAd}/${String(adEnd).slice(-2)})`
}
