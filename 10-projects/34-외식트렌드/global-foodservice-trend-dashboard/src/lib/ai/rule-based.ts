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

function classify(text: string): Analysis['category'] {
  return CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? 'DATA_INSIGHT'
}

function secondaryCategories(text: string, primary: Analysis['category']): string[] {
  return CATEGORY_RULES.filter(([cat, re]) => cat !== primary && re.test(text))
    .map(([cat]) => cat)
    .slice(0, 2)
}

/** 원문에서 온전한 문장 2~3개를 발췌한다(번역 아님). */
function excerpt(body: string): string[] {
  const sentences = body
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 40 && s.length < 320)
  return sentences.slice(0, 3)
}

export function analyzeWithRules(input: ArticleInput): Analysis {
  const text = `${input.title} ${input.body}`
  const brands = extractBrands(text)
  const keywords = extractKeywords(text)
  const category = classify(text)

  const hasFigures = FIGURE_RE.test(text)
  const figureInTitle = FIGURE_RE.test(input.title)
  const isNovel = NOVEL_RE.test(input.title)
  const isWideScale = SCALE_RE.test(text)
  const isKoreaRelated = KOREA_RE.test(text)
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
