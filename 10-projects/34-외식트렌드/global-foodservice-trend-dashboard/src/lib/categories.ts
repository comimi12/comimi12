import type {
  ExpansionType,
  MenuType,
  RecommendedAction,
  Region,
  ScoreLabel,
  TechCategory,
  TrendCategory,
} from './types'

/** §4 — 카테고리 한글 표시명 */
export const CATEGORY_LABEL: Record<TrendCategory, string> = {
  MENU_FOOD: '메뉴/푸드',
  BEVERAGE: '음료',
  CONSUMER: '소비자',
  PRICE_COST: '가격/원가',
  RESTAURANT_TECH: 'Restaurant Tech',
  OPERATIONS: '운영',
  SERVICE: '서비스',
  FRANCHISE: '프랜차이즈',
  EXPANSION: '출점/확장',
  M_AND_A: 'M&A',
  DESIGN_CONCEPT: '디자인/콘셉트',
  SUSTAINABILITY: '지속가능성',
  LABOR: '인력',
  DELIVERY: '배달',
  MARKETING: '마케팅',
  DATA_INSIGHT: '데이터/시장지표',
}

export const CATEGORY_ORDER: TrendCategory[] = Object.keys(
  CATEGORY_LABEL,
) as TrendCategory[]

export const REGION_LABEL: Record<Region, string> = {
  GLOBAL: 'GLOBAL',
  ASIA: 'ASIA',
  EUROPE: 'EUROPE',
  AMERICAS: 'AMERICAS',
}

export const REGION_LABEL_KO: Record<Region, string> = {
  GLOBAL: '글로벌',
  ASIA: '아시아',
  EUROPE: '유럽',
  AMERICAS: '미주',
}

export const REGION_ORDER: Region[] = ['GLOBAL', 'ASIA', 'EUROPE', 'AMERICAS']

/** §5 — 한국 외식기업 적용 가능성 */
export const ACTION_LABEL: Record<RecommendedAction, string> = {
  IMMEDIATE_REVIEW: '즉시 적용 검토',
  BENCHMARK: '단기 벤치마킹',
  MID_LONG_TERM: '중장기 검토',
  REFERENCE: '참고 수준',
}

export const TECH_LABEL: Record<TechCategory, string> = {
  AI_ORDERING: 'AI Ordering',
  AI_FORECASTING: 'AI Forecasting',
  ROBOTICS: 'Robotics',
  POS: 'POS',
  CRM: 'CRM',
  LOYALTY: 'Loyalty',
  RESERVATION: 'Reservation',
  DELIVERY: 'Delivery',
  KITCHEN_AUTOMATION: 'Kitchen Automation',
  INVENTORY: 'Inventory',
  WORKFORCE: 'Workforce Management',
}

export const TECH_ORDER: TechCategory[] = Object.keys(TECH_LABEL) as TechCategory[]

export const MENU_TYPE_LABEL: Record<MenuType, string> = {
  FOOD: 'Food',
  BEVERAGE: 'Beverage',
  DESSERT: 'Dessert',
  ALCOHOL: 'Alcohol',
  INGREDIENT: 'Ingredient',
  COOKING_METHOD: 'Cooking Method',
  CUISINE: 'Cuisine',
}

export const MENU_TYPE_ORDER: MenuType[] = Object.keys(MENU_TYPE_LABEL) as MenuType[]

export const EXPANSION_TYPE_LABEL: Record<ExpansionType, string> = {
  NEW_MARKET_ENTRY: '신규 국가 진출',
  STORE_OPENING: '출점',
  MASTER_FRANCHISE: '마스터 프랜차이즈',
  ACQUISITION: '인수',
  REFRANCHISING: '리프랜차이징',
  FORMAT_LAUNCH: '신규 포맷',
}

/** §6 — Score label (색상 배지 대신 명확한 Label) */
export function scoreLabel(total: number): ScoreLabel {
  if (total >= 90) return 'MUST KNOW'
  if (total >= 80) return 'HIGH'
  if (total >= 70) return 'WATCH'
  if (total >= 60) return 'REFERENCE'
  return 'LOW'
}

export const SCORE_LABEL_ORDER: ScoreLabel[] = [
  'MUST KNOW',
  'HIGH',
  'WATCH',
  'REFERENCE',
  'LOW',
]

/** Minimal, non-decorative label styling (§8 — 최소한의 색상) */
export const SCORE_LABEL_CLASS: Record<ScoreLabel, string> = {
  'MUST KNOW': 'bg-navy-800 text-white border-navy-800',
  HIGH: 'bg-blue-soft text-navy-800 border-blue-accent/40',
  WATCH: 'bg-white text-navy-700 border-navy-700/40',
  REFERENCE: 'bg-white text-muted border-line',
  LOW: 'bg-white text-muted/70 border-line',
}
