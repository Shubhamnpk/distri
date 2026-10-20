export type CheckState = 'Done' | 'Active' | 'Blocked' | 'Unknown'

export type CompanyAnnualFinancial = {
  year: string
  revenue?: string
  result?: string
  source?: string
  sourceUrl?: string
  note?: string
}

export type PublicFundFinancialYear = {
  year: string
  contributions?: string
  investmentIncome?: string
  operatingIncome?: string
  claimsSubmitted?: string
  benefitsPaid?: string
  operatingExpenses?: string
  annualSurplus?: string
  totalAssets?: string
  fundReserves?: string
  source: string
  sourceUrl: string
  note?: string
}

export type Company = {
  name: string
  entityType?: 'Statutory public fund' | 'Statutory public regulator'
  sector: string
  year: string
  revenue: string
  result: string
  resultType: 'up' | 'down' | 'unknown'
  ownership?: string
  operatingStatus: 'Operating' | 'Closed'
  source: string
  sourceUrl: string
  note: string
  logo?: string
  quarters: { label: string; revenue: string; result: string; state: CheckState }[]
  annualFinancials?: CompanyAnnualFinancial[]
  publicFundFinancials?: PublicFundFinancialYear[]
}

export type OwnershipSlice = { label: string; percent: number; kind: 'government' | 'public' | 'other' }
export type CompanyProfile = {
  earnsFrom: string
  earningsCaveat?: string
  ownershipContext: string
  ownershipSlices?: OwnershipSlice[]
  ministry?: string
  ministryUrl?: string
  websiteUrl?: string
  nepseContext?: string
  nepseUrl?: string
  nepseDirectoryUrl?: string
}

export type ProjectUpdateType = 'Milestone' | 'Update' | 'Alert' | 'News'

export type ProjectUpdate = {
  date: string // e.g. "26 Jul 2026"
  title: string
  text: string
  type: ProjectUpdateType
}

export type ProjectChange = {
  date: string
  field: string
  from: string
  to: string
  source: string
  sourceUrl: string
  note?: string
}

export type ProjectContractor = {
  name: string
  packages: string
  origin: string
  website?: string
  note?: string
}

export type ProjectManagement = {
  agency: string
  person?: string
  website?: string
  note?: string
}

export type Project = {
  name: string
  ministry: string
  location: string
  province?: 'Koshi' | 'Madhesh' | 'Bagmati' | 'Gandaki' | 'Lumbini' | 'Karnali' | 'Sudurpashchim' | 'National'
  budget: string
  budgetNote?: string
  progress: number
  status: 'On track' | 'At risk' | 'Delayed' | 'Completed'
  category: 'Hydropower' | 'Power' | 'Highway' | 'Airport' | 'Irrigation' | 'Water' | 'Heritage' | 'Sports' | 'Rail' | 'Conservation'
  description?: string
  updated: string
  spent: string
  spentNote?: string
  target: string
  source: string
  sourceUrl: string
  image: string
  gallery?: string[]
  changeLog?: ProjectChange[]
  completionNote?: string
  contractors?: ProjectContractor[]
  management?: ProjectManagement
  checklist: { label: string; state: CheckState; date: string; note: string }[]
  updates?: ProjectUpdate[]
}

export type Source = {
  title: string
  publisher: string
  date: string
  type: string
  verified: boolean
  url: string
}

// ── NEPSE (Stock Exchange) Types ──

export type NepseStock = {
  symbol: string
  companyName: string
  ltp: number
  percentChange: number
  volume: number
  turnover: number
  open: number
  high: number
  low: number
  close: number
  asset_type: string
  sector: string
  /** Traded contracts for the session. */
  trades?: number
  /** Market capitalisation in NPR (absolute). */
  marketCap?: number
  // raw API aliases (tolerated at runtime)
  percent_change?: number
  name?: string
}

export type NepseCompanyProfile = {
  symbol: string
  profile: string
  id?: number
  email?: string
  phone?: string
  fax?: string
  contact_person?: string
  address?: string
  address_type?: string
  logo_path?: string
  status?: string
}

export type NepseReport = {
  type: string // 'Quarterly Report' | 'Annual Report'
  quarter: string
  fy: string
  fy_nepali?: string
  pe: number | null
  eps: number | null
  paid_up_capital: number | null
  profit: number | null
  revenue?: number | null
  net_worth_per_share: number | null
}

export type NepseCompanyFinancial = {
  symbol: string
  reports: NepseReport[]
}

export type NepseDividendRecord = {
  symbol: string
  bonus: number | null
  cash: number | null
  total: number | null
  announce: string
  bookclose: string | null
  fiscalYear: string
}

export type NepseDisclosure = {
  id: number
  symbol?: string
  title: string
  body: string
  source?: string
  publishedAt: string
  documentUrl?: string
}

export type NepseFloorSheetBroker = {
  name: string
  qty: number
  amount: number
  share: number
}

export type NepseFloorSheetTrade = {
  time: string
  qty: number
  rate: number
  amount: number
  buyer: string
  seller: string
}

export type NepseFloorSheetSummary = {
  date: string
  totalQty: number
  totalAmount: number
  contracts: number
  buyers: NepseFloorSheetBroker[]
  sellers: NepseFloorSheetBroker[]
  largest: NepseFloorSheetTrade[]
}

export type NepseMarketSummary = {
  totalVolume: number
  totalTurnover: number
  totalTrades: number
  marketIndex: number
  indexChange: number
  scripsTraded?: number
  marketCap?: number
}

export type NepseIndex = {
  name: string
  close: number
  change: number
  changePct: number
  previousClose: number
  high: number
  low: number
  high52: number
  low52: number
}

export type NepseData = {
  stocks: NepseStock[]
  market: NepseMarketSummary
  topGainers: NepseStock[]
  topLosers: NepseStock[]
}

// ── Project-Nepal Types ──

export type ProjectNepalProject = {
  name: string
  status: 'Reported' | 'In Progress' | 'Delayed' | 'Completed'
  budget_allocated_nrs: number
  contractor: string
  expected_completion: string
}

export type ProjectNepalBudget = {
  fiscal_year: string
  total_budget_nrs: number
  allocations: {
    sector: string
    amount_nrs: number
    description: string
  }[]
}

export type ProjectNepalProblem = {
  problem_id: string
  title: string
  location_ward: number
  status: 'Reported' | 'In Progress' | 'Delayed'
  official_response: string
  source: string
}

export type ProjectNepalAchievement = {
  achievement_id: string
  title: string
  original_problem_id: string
  accountable_leader: string
  start_date: string
  completion_date: string
  budget_used_nrs: number
  verified_impact: string
}

export type ProjectNepalDistrict = {
  id: number
  province_id: number
  name: string
  nepali_name: string
  projects?: ProjectNepalProject[]
  budgets?: ProjectNepalBudget[]
  problems?: ProjectNepalProblem[]
  achievements?: ProjectNepalAchievement[]
}

export type ProjectNepalProvince = {
  id: number
  name: string
  nepali_name: string
  districts: ProjectNepalDistrict[]
}

// ── Open Data Nepal CKAN Types ──

export type OpenDataNepalDataset = {
  name: string
  title: string
  notes: string
  organization: { title: string; name: string }
  resources: {
    id: string
    name: string
    format: string
    datastore_active: boolean
    url: string
  }[]
  tags: { name: string }[]
  metadata_modified: string
}

export type CkanDataset = {
  id: string
  title: string
  name: string
  notes: string
  organization: { title: string; name: string } | null
  resources: { id: string; name: string; format: string; datastore_active: boolean }[]
  tags: { name: string }[]
  metadata_modified: string
}
