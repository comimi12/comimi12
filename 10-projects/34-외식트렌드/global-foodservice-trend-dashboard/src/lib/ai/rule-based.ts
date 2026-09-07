import type { Analysis } from './schema'
import type { ArticleInput } from './prompt'
import { RADAR_KEYWORDS, WATCHLIST_BRANDS } from '../radar-keywords'
import { clamp } from '../scoring'
import { BRAND_PATTERNS, TOPIC_TERMS } from './brand-dictionary'

/**
 * AI 키 없이 동작하는 규칙 기반 분석기 (무료 수집 모드).
 *
 * 번역·요약을 창작하지 않는다. 기사에 실제로 있는 것만 뽑는다.
 *  - 브랜드   : 알려진 체인명 사전 매칭
 *  - 키워드   : Trend Radar 사전 매칭
 *  - 카테고리 : 어휘 규칙
 *  - 점수     : 기사에서 관측 가능한 신호(수치 포함 여부, 브랜드, 지역 등)로 산출
 *  - 요약     : 원문 문장 발췌 (번역 아님 — UI 에서 '원문 발췌'로 표기)
 */

const CATEGORY_RULES: [Analysis['category'], RegExp][] = [
  ['M_AND_A', /\b(acquisit\w*|acquires?|acquired|merger|takeover|buyout|stake in)\b/i],
  ['RESTAURANT_TECH', /\b(ai|artificial intelligence|robot\w*|automation|automated|kiosk|pos\b|app\b|software|voice order\w*|tech\w*)\b/i],
  ['FRANCHISE', /\b(franchis\w*|refranchis\w*|master franchise)\b/i],
  ['EXPANSION', /\b(opens?|opening|expand\w*|expansion|new (site|store|location|market)|store count|units?\b|rollout)\b/i],
  ['DELIVERY', /\b(delivery|off-?premise|aggregator|doordash|uber eats|deliveroo|just eat|takeaway)\b/i],
  ['LABOR', /\b(wage|wages|labour|labor|staffing|shortage|hiring|recruit\w*|workforce|strike)\b/i],
  ['PRICE_COST', /\b(price|pricing|prices|cost|costs|inflation|value menu|discount|deal|margin)\b/i],
  ['BEVERAGE', /\b(coffee|tea\b|drink\w*|beverage|cocktail|alcohol|matcha|smoothie|soda)\b/i],
  ['MENU_FOOD', /\b(menu|dish|launch\w*|flavou?r|ingredient|recipe|burger|pizza|chicken|dessert)\b/i],
  ['SUSTAINABILITY', /\b(sustainab\w*|packaging|emission\w*|recycl\w*|waste|carbon)\b/i],
  ['DESIGN_CONCEPT', /\b(design|format|concept|remodel\w*|prototype|refurbish\w*|interior)\b/i],
  ['MARKETING', /\b(loyalty|campaign|promotion|marketing|rebrand\w*|advertis\w*|partnership)\b/i],
  ['SERVICE', /\b(service|hospitality|guest experience|customer experience)\b/i],
  ['CONSUMER', /\b(consumer\w*|diner\w*|guest\w*|shopper\w*|demand|spending|habits)\b/i],
  ['DATA_INSIGHT', /\b(index|survey|data|report|research|traffic|same-?store|sales (rose|fell|up|down))\b/i],
]

/**
 * 한국어 기사(식품외식경제 등 국내 매체)용 규칙.
 * 영문 정규식은 한글 본문에 걸리지 않으므로 같은 카테고리를 한국어로 한 번 더 정의한다.
 */
const HANGUL_RE = /[가-힣]/
const CATEGORY_RULES_KO: [Analysis['category'], RegExp][] = [
  ['M_AND_A', /(인수|합병|지분 ?취득|매각|M&A)/],
  ['RESTAURANT_TECH', /(AI|인공지능|로봇|자동화|키오스크|무인|푸드테크|솔루션|스마트 ?주방)/i],
  ['FRANCHISE', /(프랜차이즈|가맹점|가맹본부|가맹 ?사업)/],
  ['EXPANSION', /(출점|개점|오픈|신규 ?매장|점포 ?확대|입점|해외 ?진출)/],
  ['DELIVERY', /(배달|배민|배달의민족|쿠팡이츠|요기요|포장 ?주문)/],
  ['LABOR', /(인건비|채용|구인|최저임금|근로|인력난)/],
  ['PRICE_COST', /(가격 ?인상|원가|물가|할인|마진|비용 ?부담)/],
  ['BEVERAGE', /(커피|음료|카페|주류|맥주|와인|차 ?음료)/],
  ['MENU_FOOD', /(메뉴|신메뉴|출시|레시피|식재료|디저트|버거|치킨|피자)/],
  ['SUSTAINABILITY', /(친환경|지속가능|포장재|탄소|재활용|음식물 ?쓰레기)/],
  ['DESIGN_CONCEPT', /(리뉴얼|콘셉트|인테리어|리모델링|매장 ?디자인)/],
  ['MARKETING', /(마케팅|캠페인|프로모션|협업|콜라보|멤버십|리브랜딩)/],
  ['SERVICE', /(서비스|접객|고객 ?경험|응대)/],
  ['CONSUMER', /(소비자|외식 ?소비|소비 ?트렌드|외식비)/],
  ['DATA_INSIGHT', /(조사|보고서|통계|지수|동향|분석|매출)/],
]
const KO_FIGURE_RE = /\d[\d,.]*\s?(%|퍼센트|억|조|만 ?원|개점|호점|개 ?점포|명)/
const KO_NOVEL_RE = /(신규|신메뉴|최초|출시|론칭|공개|도입|선보)/
const KO_SCALE_RE = /(전국|글로벌|해외|전 ?세계|수출|세계 ?시장)/

const FIGURE_RE = /\d[\d,.]*\s?(%|percent|billion|million|bn|m\b|stores?|units?|sites?|outlets?)/i
const NOVEL_RE = /\b(first|new|launch\w*|debut\w*|unveil\w*|introduc\w*|pilot|trial|test\w*)\b/i
const SCALE_RE = /\b(global|worldwide|international|nationwide|across (europe|asia|the us)|multiple markets)\b/i
const KOREA_RE = /\b(korea\w*|k-food|kimchi|gochujang|bibimbap|bulgogi|seoul)\b/i
/** 한국 외식기업이 옮겨 적용하기 쉬운 주제 */
const TRANSFERABLE: Analysis['category'][] = [
  'MENU_FOOD',
  'BEVERAGE',
  'SERVICE',
  'CONSUMER',
  'DESIGN_CONCEPT',
  'OPERATIONS',
  'RESTAURANT_TECH',
]

function extractBrands(text: string): string[] {
  const found = BRAND_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name)
  return Array.from(new Set(found)).slice(0, 6)
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase()
  const radar = RADAR_KEYWORDS.filter((rk) => rk.match.some((p) => lower.includes(p))).map(
    (rk) => rk.keyword,
  )
  // 사전에 없는 용어는 만들어내지 않는다. 관측된 주제어만 영문 그대로 붙인다.
  const topics = TOPIC_TERMS.filter(([, re]) => re.test(text)).map(([term]) => term)
  return Array.from(new Set([...radar, ...topics])).slice(0, 7)
}

/** 한글이 섞인 기사에는 한국어 규칙을 먼저 적용한다. */
function rulesFor(text: string): [Analysis['category'], RegExp][] {
  return HANGUL_RE.test(text) ? [...CATEGORY_RULES_KO, ...CATEGORY_RULES] : CATEGORY_RULES
}

function classify(text: string): Analysis['category'] {
  return rulesFor(text).find(([, re]) => re.test(text))?.[0] ?? 'DATA_INSIGHT'
}

function secondaryCategories(text: string, primary: Analysis['category']): string[] {
  const seen = new Set<string>()
  return rulesFor(text)
    .filter(([cat, re]) => cat !== primary && re.test(text))
    .map(([cat]) => cat)
    .filter((cat) => (seen.has(cat) ? false : seen.add(cat)))
    .slice(0, 2)
}

/** 원문에서 온전한 문장 2~3개를 발췌한다(번역 아님). */
function excerpt(body: string): string[] {
  const clean = body.replace(/\s+/g, ' ')
  // 한국어는 '…했다.' 처럼 마침표 뒤 공백이 없는 경우가 많다.
  const sentences = (
    HANGUL_RE.test(clean) ? clean.split(/(?<=다\.|[.!?])\s*/) : clean.split(/(?<=[.!?])\s+/)
  )
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 320)
  return sentences.slice(0, 3)
}

export function analyzeWithRules(input: ArticleInput): Analysis {
  const text = `${input.title} ${input.body}`
  const brands = extractBrands(text)
  const keywords = extractKeywords(text)
  const category = classify(text)

  const isKoreanArticle = HANGUL_RE.test(text)
  const hasFigures = FIGURE_RE.test(text) || KO_FIGURE_RE.test(text)
  const figureInTitle = FIGURE_RE.test(input.title) || KO_FIGURE_RE.test(input.title)
  const isNovel = NOVEL_RE.test(input.title) || KO_NOVEL_RE.test(input.title)
  const isWideScale = SCALE_RE.test(text) || KO_SCALE_RE.test(text)
  // 국내 매체 기사는 그 자체로 한국 적용도가 가장 높다.
  const isKoreaRelated = KOREA_RE.test(text) || isKoreanArticle
  const majorBrand = brands.some((b) => WATCHLIST_BRANDS.includes(b))
  const brandInTitle = brands.some((b) =>
    input.title.toLowerCase().includes(b.toLowerCase().split(' ')[0]),
  )
  const tier1Source = input.sourceRegion === 'GLOBAL'

  const businessImpact = clamp(
    60 +
      (majorBrand ? 12 : brands.length > 0 ? 7 : 0) +
      (brandInTitle ? 5 : 0) +
      (hasFigures ? 8 : 0) +
      (figureInTitle ? 5 : 0) +
      (['M_AND_A', 'EXPANSION', 'PRICE_COST', 'DATA_INSIGHT'].includes(category) ? 8 : 0),
    0,
    100,
  )

  const novelty = clamp(
    52 +
      (isNovel ? 15 : 0) +
      (['DESIGN_CONCEPT', 'RESTAURANT_TECH'].includes(category) ? 10 : 0) +
      (keywords.length >= 3 ? 6 : 0),
    0,
    100,
  )

  const marketScale = clamp(
    56 +
      (isWideScale ? 14 : 0) +
      (majorBrand ? 12 : 0) +
      (tier1Source ? 8 : 0) +
      (hasFigures ? 5 : 0),
    0,
    100,
  )

  const koreaRelevance = clamp(
    48 +
      (isKoreaRelated ? 28 : 0) +
      (input.sourceRegion === 'ASIA' ? 10 : 0) +
      (TRANSFERABLE.includes(category) ? 10 : 0) +
      (majorBrand ? 6 : 0),
    0,
    100,
  )

  return {
    original_title: input.title,
    // 번역하지 않는다. 원문 제목을 그대로 둔다 (UI 가 '번역 미적용'으로 인지).
    korean_title: input.title,
    summary_ko: excerpt(input.body),
    region: (['GLOBAL', 'ASIA', 'EUROPE', 'AMERICAS'].includes(input.sourceRegion)
      ? input.sourceRegion
      : 'GLOBAL') as Analysis['region'],
    country: input.sourceCountry,
    category,
    secondary_categories: secondaryCategories(text, category),
    brands,
    keywords,
    trend: '',
    why_it_matters: '',
    korea_implication: '',
    sentiment: 'NEUTRAL',
    business_impact_score: businessImpact,
    novelty_score: novelty,
    market_scale_score: marketScale,
    source_reliability_score: 70,
    korea_relevance_score: koreaRelevance,
    recommended_action:
      koreaRelevance >= 78 ? 'BENCHMARK' : koreaRelevance >= 62 ? 'MID_LONG_TERM' : 'REFERENCE',
  }
}
