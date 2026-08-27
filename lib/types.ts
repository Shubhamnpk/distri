export type CheckState = 'Done' | 'Active' | 'Blocked' | 'Unknown'

export type Company = {
  name: string
  sector: string
  year: string
  revenue: string
  result: string
  resultType: 'up' | 'down'
  coverage: 'Verified' | 'Partial' | 'Pending'
  operatingStatus: 'Operating' | 'Closed' | 'Not yet operational'
  source: string
  sourceUrl: string
  note: string
  logo?: string
  quarters: { label: string; revenue: string; result: string; state: CheckState }[]
}

export type ProjectUpdateType = 'Milestone' | 'Update' | 'Alert' | 'News'

export type ProjectUpdate = {
  date: string // e.g. "26 Jul 2026"
  title: string
  text: string
  type: ProjectUpdateType
}

export type Project = {
  name: string
  ministry: string
  location: string
  province?: 'Koshi' | 'Madhesh' | 'Bagmati' | 'Gandaki' | 'Lumbini' | 'Karnali' | 'Sudurpashchim' | 'National'
  budget: string
  progress: number
  status: 'On track' | 'At risk' | 'Delayed' | 'Completed'
  category: 'Hydropower' | 'Highway' | 'Airport' | 'Irrigation' | 'Water' | 'Heritage' | 'Sports' | 'Rail' | 'Conservation'
  description?: string
  updated: string
  spent: string
  target: string
  source: string
  sourceUrl: string
  image: string
  gallery?: string[]
  completionNote?: string
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
  // raw API aliases (tolerated at runtime)
  percent_change?: number
  name?: string
}

export type NepseCompanyProfile = {
  symbol: string
  companyName: string
  companyFullName: string
  sector: string
  listedDate: string
  instrumentType: string
  marketCap: number
  eps: number
  peRatio: number
  bookValue: number
  dividendYield: number
}

export type NepseCompanyFinancial = {
  symbol: string
  fiscalYear: string
  revenue: number
  netIncome: number
  totalAssets: number
  totalLiabilities: number
  equity: number
  eps: number
  roe: number
}

export type NepseMarketSummary = {
  totalVolume: number
  totalTurnover: number
  totalTrades: number
  marketIndex: number
  indexChange: number
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
