// Exact NEPSE symbol per tracked company — hand-verified, no fuzzy guessing.
// Verified live 2026-10-14 against yonepse nepse_data.json (368 rows) +
// ShareSansar 523-symbol universe + ShareSansar/merolagani company pages.
//
// Exact symbols connected to the company's market section (5): NTC, CIT, STC, ADBL, NBL.
// Deliberately unmapped:
// - RBB trades as RBBL (ShareSansar/merolagani confirm) but is SUSPENDED —
//   merolagani shows LTP 0.00 / never traded, and it is absent from BOTH daily
//   mirrors. Mapping it would render an empty card, so it stays unmapped until
//   trading resumes. Re-check with: symbols list + yonepse snapshot.
// - NEA, NOC, NAC, NTV, NWSC, DDC, CAAN, DCGF: unlisted (no symbol anywhere).
// - Udayapur/Hetauda cement, Nepal Metals, Butwal Spinning, Orind/Magnesite:
//   closed and unlisted. Dhaubadi Iron: pre-operational.
// - These mappings are exact company-name matches; no fuzzy matching is used.

export const COMPANY_SYMBOLS: Record<string, string> = {
  'Nepal Telecom': 'NTC',
  'Citizen Investment Trust': 'CIT',
  'Salt Trading Corporation': 'STC',
  'Agricultural Development Bank': 'ADBL',
  'Nepal Bank Limited': 'NBL',
}

/** Exact symbol for a tracked company name, or null when it has none. */
export function symbolForCompany(companyName: string): string | null {
  return COMPANY_SYMBOLS[companyName] ?? null
}
