/** §13 Trend Radar — 추적 키워드 사전 (match 는 소문자 부분일치 패턴) */
export interface RadarKeyword {
  keyword: string
  labelKo: string
  match: string[]
}

export const RADAR_KEYWORDS: RadarKeyword[] = [
  { keyword: 'Matcha', labelKo: '말차', match: ['matcha', '말차', 'green tea'] },
  { keyword: 'Protein', labelKo: '단백질', match: ['protein', '단백질', 'high protein'] },
  {
    keyword: 'Functional Beverage',
    labelKo: '기능성 음료',
    match: ['functional beverage', 'non-alcoholic', 'low-abv', '무알콜', 'adaptogen', 'electrolyte'],
  },
  { keyword: 'Korean Food', labelKo: '한식', match: ['korean food', 'k-food', '한식', 'gochujang', 'korean fried chicken'] },
  { keyword: 'Japanese Dining', labelKo: '일식', match: ['japanese dining', 'japan foodservice', 'izakaya', 'udon', 'sushi', '일식'] },
  { keyword: 'Value Menu', labelKo: '밸류 메뉴', match: ['value menu', 'value platform', 'value bundle', 'value construct', 'affordability', 'trade down', '밸류'] },
  { keyword: 'Premiumization', labelKo: '프리미엄화', match: ['premiumization', 'premiumisation', 'premium', '프리미엄'] },
  { keyword: 'AI Ordering', labelKo: 'AI 주문', match: ['ai ordering', 'voice ai', 'ai-driven ordering', 'ai 주문'] },
  { keyword: 'Restaurant Robotics', labelKo: '레스토랑 로보틱스', match: ['robot', 'robotics', '로봇', 'automation', 'automated'] },
  { keyword: 'Loyalty App', labelKo: '로열티 앱', match: ['loyalty', '로열티', '멤버십', 'crm'] },
  { keyword: 'Delivery', labelKo: '배달', match: ['delivery', 'off-premise', 'aggregator', '배달'] },
  { keyword: 'Small Format', labelKo: '소형 포맷', match: ['small format', 'compact format', 'smaller footprint', 'small-format', '소형 포맷'] },
  { keyword: 'Drive Thru', labelKo: '드라이브스루', match: ['drive-thru', 'drive thru', '드라이브스루'] },
  { keyword: 'Franchise Expansion', labelKo: '프랜차이즈 확장', match: ['franchise expansion', 'master franchise', 'refranchis', 'franchise', '프랜차이즈'] },
  { keyword: 'Kitchen Automation', labelKo: '주방 자동화', match: ['kitchen automation', 'automated prep', '주방 자동화'] },
  { keyword: 'Labour Cost', labelKo: '인건비', match: ['labour cost', 'labor cost', 'minimum wage', 'staffing', '인건비'] },
]

/** §15 Brand Watch — 추적 브랜드 */
export const WATCHLIST_BRANDS: string[] = [
  "McDonald's",
  'Starbucks',
  'Chipotle',
  'Sweetgreen',
  'CAVA',
  'Yum Brands',
  'Restaurant Brands International',
  'Jollibee',
  'Mixue',
  'Haidilao',
  'Tim Ho Wan',
  'Din Tai Fung',
  'Marugame Udon',
  'Toridoll',
  'Kura Sushi',
  'Genki Sushi',
]
