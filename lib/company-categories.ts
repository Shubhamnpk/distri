import type { Company } from '@/lib/types'

/** A short, consistent top-level taxonomy for the mixed sectors in the source records. */
export const COMPANY_CATEGORIES = [
  'Finance & Investment',
  'Energy & Utilities',
  'Industry & Manufacturing',
  'Trade & Agriculture',
  'Transport & Infrastructure',
  'Communications & Media',
  'Public Services & Other',
] as const

export type CompanyCategory = (typeof COMPANY_CATEGORIES)[number]

const categoryBySourceSector: Record<string, CompanyCategory> = {
  'Banking & finance': 'Finance & Investment',
  'Financial services': 'Finance & Investment',
  'Statutory funds': 'Finance & Investment',
  'Energy & utilities': 'Energy & Utilities',
  'Water & sanitation': 'Energy & Utilities',
  'Manufacturing': 'Industry & Manufacturing',
  'Manufacturing & health': 'Industry & Manufacturing',
  'Textiles': 'Industry & Manufacturing',
  'Mining & minerals': 'Industry & Manufacturing',
  'Pharmaceuticals': 'Industry & Manufacturing',
  'Trade & supply': 'Trade & Agriculture',
  'Food & agriculture': 'Trade & Agriculture',
  'Food security & trade': 'Trade & Agriculture',
  'Forestry & trade': 'Trade & Agriculture',
  'Aviation': 'Transport & Infrastructure',
  'Transport': 'Transport & Infrastructure',
  'Transport & logistics': 'Transport & Infrastructure',
  'Industry & infrastructure': 'Transport & Infrastructure',
  'Infrastructure & construction': 'Transport & Infrastructure',
  'Telecommunications': 'Communications & Media',
  'Media & broadcasting': 'Communications & Media',
  'Media & publishing': 'Communications & Media',
  'Education & publishing': 'Communications & Media',
  'Culture & performing arts': 'Public Services & Other',
  'Housing & real estate': 'Public Services & Other',
}

export function getCompanyCategory(company: Pick<Company, 'sector'>): CompanyCategory {
  return categoryBySourceSector[company.sector] ?? 'Public Services & Other'
}
