/* ============================================================
   Domain types — Global Foodservice Trend Intelligence
   (Master prompt §3, §4, §5, §6)
   ============================================================ */

export type Region = 'GLOBAL' | 'ASIA' | 'EUROPE' | 'AMERICAS'

export type TrendCategory =
  | 'MENU_FOOD'
  | 'BEVERAGE'
  | 'CONSUMER'
  | 'PRICE_COST'
  | 'RESTAURANT_TECH'
  | 'OPERATIONS'
  | 'SERVICE'
  | 'FRANCHISE'
  | 'EXPANSION'
  | 'M_AND_A'
  | 'DESIGN_CONCEPT'
  | 'SUSTAINABILITY'
  | 'LABOR'
  | 'DELIVERY'
  | 'MARKETING'
  | 'DATA_INSIGHT'

export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'

/** §5 — 한국 외식기업 적용 가능성 */
export type RecommendedAction =
  | 'IMMEDIATE_REVIEW'
  | 'BENCHMARK'
  | 'MID_LONG_TERM'
  | 'REFERENCE'

/** §6 — Score label */
export type ScoreLabel = 'MUST KNOW' | 'HIGH' | 'WATCH' | 'REFERENCE' | 'LOW'

export type ReliabilityTier = 1 | 2 | 3 | 4

/** §16 — Restaurant Tech taxonomy */
export type TechCategory =
  | 'AI_ORDERING'
  | 'AI_FORECASTING'
  | 'ROBOTICS'
  | 'POS'
  | 'CRM'
  | 'LOYALTY'
  | 'RESERVATION'
  | 'DELIVERY'
  | 'KITCHEN_AUTOMATION'
  | 'INVENTORY'
  | 'WORKFORCE'

/** §14 — Menu & product trend taxonomy */
export type MenuType =
  | 'FOOD'
  | 'BEVERAGE'
  | 'DESSERT'
  | 'ALCOHOL'
  | 'INGREDIENT'
  | 'COOKING_METHOD'
  | 'CUISINE'

export type ExpansionType =
  | 'NEW_MARKET_ENTRY'
  | 'STORE_OPENING'
  | 'MASTER_FRANCHISE'
  | 'ACQUISITION'
  | 'REFRANCHISING'
  | 'FORMAT_LAUNCH'

/** §17 — Expansion / Franchise row attached to an article */
export interface ExpansionDetail {
  brand: string
  hqCountry: string
  expansionCountry: string
  city: string
  storeCount: number | null
  expansionType: ExpansionType
  ownership: 'FRANCHISE' | 'DIRECT' | 'JV'
  announcementDate: string
}

/** §16 — Restaurant Tech row attached to an article */
export interface TechDetail {
  techCategory: TechCategory
  vendor: string
  adopterBrand: string
  purpose: string
  expectedEffect: string
}

/** §14 — Menu trend row attached to an article */
export interface MenuDetail {
  trendName: string
  menuType: MenuType
  koreaOpportunity: string
}

/** §3 — Core article record */
export interface NewsArticle {
  id: string
  title: string
  titleKo: string
  source: string
  sourceUrl: string
  articleUrl: string
  publishedAt: string
  collectedAt: string
  region: Region
  country?: string
  category: TrendCategory
  /** secondary categories — an article may qualify for more than one (§4) */
  secondaryCategories?: TrendCategory[]
  brands: string[]
  keywords: string[]
  originalSummary: string
  /** §5 — 3줄 요약 */
  koreanSummary: string[]
  /** §5 — 핵심 트렌드 */
  trend: string
  whyItMatters: string
  koreaImplication: string
  recommendedAction: RecommendedAction
  trendScore: number
  businessImpactScore: number
  noveltyScore: number
  marketScaleScore: number
  reliabilityScore: number
  koreaRelevanceScore: number
  totalScore: number
  sentiment: Sentiment
  isDuplicate: boolean
  duplicateGroupId?: string
  imageUrl?: string
  expansion?: ExpansionDetail
  tech?: TechDetail
  menu?: MenuDetail
}

/** §29 — Source registry entry */
export interface SourceRecord {
  id: string
  name: string
  region: Region
  country: string
  url: string
  rssUrl: string | null
  reliabilityTier: ReliabilityTier
  active: boolean
  lastCrawledAt: string | null
  lastSuccessAt: string | null
  articleCount: number
  note?: string
}

/** §18 — Executive Daily Brief */
export interface DailyBrief {
  date: string
  keyMessage: string[]
  asiaTop3: NewsArticle[]
  europeTop3: NewsArticle[]
  americasTop3: NewsArticle[]
  globalInsight: NewsArticle[]
  menuTrend: NewsArticle[]
  restaurantTech: NewsArticle[]
  expansion: NewsArticle[]
  koreaImplication: string[]
  todayThree: string[]
}

/** §9 — KPI card */
export interface Kpi {
  key: string
  label: string
  value: number
  unit: string
  delta: number | null
  hint: string
  href: string
}

/** §13 — Trend Radar row */
export interface KeywordTrend {
  keyword: string
  labelKo: string
  mentions30d: number
  mentions7d: number
  growth7d: number
  growth30d: number
  regionDistribution: Record<Region, number>
  topBrands: string[]
  articleIds: string[]
}

/** §14 — Menu trend aggregate row */
export interface MenuTrendRow {
  trendName: string
  menuType: MenuType
  mentions: number
  growthRate: number
  topCountries: string[]
  topBrands: string[]
  articleIds: string[]
  koreaOpportunity: string
}

/** §15 — Brand Watch aggregate row */
export interface BrandWatchRow {
  brand: string
  newsCount: number
  newMarkets: number
  newStores: number
  newMenu: number
  franchise: number
  investment: number
  mAndA: number
  technology: number
  topScore: number
  articleIds: string[]
}

export interface ArticleFilters {
  q?: string
  region?: Region | 'ALL'
  country?: string
  category?: TrendCategory | 'ALL'
  brand?: string
  source?: string
  minScore?: number
  range?: DateRangeKey
  from?: string
  to?: string
  includeDuplicates?: boolean
  tier?: ReliabilityTier | 'ALL'
}

export type DateRangeKey = 'TODAY' | '7D' | '30D' | '90D' | 'ALL' | 'CUSTOM'
