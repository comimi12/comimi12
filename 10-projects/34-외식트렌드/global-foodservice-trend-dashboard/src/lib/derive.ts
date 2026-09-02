import type {
  ExpansionDetail,
  MenuDetail,
  MenuType,
  NewsArticle,
  TechCategory,
  TechDetail,
} from './types'

/**
 * 구조화 필드 파생.
 *
 * AI 분석 모드에서는 tech / menu / expansion 상세를 모델이 채운다.
 * 무료(규칙 기반) 수집 모드에서는 이 필드가 비므로, 원문에서 관측 가능한 것만 뽑아
 * Restaurant Tech · Menu Trend · Expansion 화면을 채운다.
 *
 * 원칙: 확인되지 않은 값은 만들지 않는다. 모르면 빈 문자열로 둔다.
 */

function textOf(a: NewsArticle): string {
  return `${a.title} ${a.originalSummary} ${a.keywords.join(' ')}`
}

/* ------------------------------------------------------------------ */
/* Restaurant Tech (§16)                                               */
/* ------------------------------------------------------------------ */

const TECH_RULES: [TechCategory, RegExp][] = [
  ['AI_ORDERING', /\b(ai (order\w*|drive-?thru|voice)|voice ai|conversational ai|ai-powered order\w*|chatbot)\b/i],
  ['AI_FORECASTING', /\b(forecast\w*|demand prediction|predictive analytics)\b/i],
  ['ROBOTICS', /\brobot\w*\b/i],
  ['KITCHEN_AUTOMATION', /\b(kitchen automation|automated (kitchen|prep|makeline|fryer)|makeline|smart kitchen)\b/i],
  ['LOYALTY', /\b(loyalty|rewards? (programme|program|scheme)|membership)\b/i],
  ['RESERVATION', /\b(reservation\w*|booking (system|platform)|opentable|resy|sevenrooms)\b/i],
  ['DELIVERY', /\b(delivery (app|platform|partner)|doordash|uber eats|deliveroo|just eat|grubhub)\b/i],
  ['POS', /\b(point of sale|\bpos\b|toast|lightspeed|square\b)\b/i],
  ['CRM', /\b(crm\b|customer data|guest data platform)\b/i],
  ['INVENTORY', /\b(inventory|stock management|supply chain (software|platform))\b/i],
  ['WORKFORCE', /\b(scheduling (software|platform)|workforce management|rota software|shift management)\b/i],
]

export function deriveTech(a: NewsArticle): TechDetail | null {
  const hit = TECH_RULES.find(([, re]) => re.test(textOf(a)))
  // 어떤 기술인지 특정되지 않으면 표에 넣지 않는다.
  // (RESTAURANT_TECH 로 분류됐다는 이유만으로 POS 등으로 뭉뚱그리지 않는다)
  if (!hit) return null

  return {
    techCategory: hit[0],
    vendor: '',
    adopterBrand: a.brands[0] ?? '',
    purpose: '',
    expectedEffect: '',
  }
}

/* ------------------------------------------------------------------ */
/* Menu & Product Trend (§14)                                          */
/* ------------------------------------------------------------------ */

const MENU_TERMS: [string, MenuType, RegExp][] = [
  ['Matcha', 'INGREDIENT', /\bmatcha\b/i],
  ['Protein', 'INGREDIENT', /\b(high[- ]?protein|protein[- ]?(packed|rich|forward)|\bprotein\b)/i],
  ['Plant-based', 'INGREDIENT', /\b(plant-?based|vegan|meat-?free|vegetarian)\b/i],
  ['Seafood', 'INGREDIENT', /\b(seafood|shrimp|prawn|salmon|oyster|crab)\b/i],
  ['Fermentation', 'COOKING_METHOD', /\b(ferment\w*|kimchi|miso|koji|sourdough)\b/i],
  ['Grill & BBQ', 'COOKING_METHOD', /\b(bbq|barbecue|grill\w*|smok(ed|ehouse))\b/i],
  ['Spice & Heat', 'COOKING_METHOD', /\b(spicy|hot sauce|chilli|chili|nduja|sriracha)\b/i],
  ['Fried Chicken', 'FOOD', /\b(fried chicken|chicken wings?|wings\b|tenders)\b/i],
  ['Burger', 'FOOD', /\bburger\w*\b/i],
  ['Pizza', 'FOOD', /\bpizza\w*\b/i],
  ['Sushi', 'FOOD', /\b(sushi|sashimi|omakase)\b/i],
  ['Noodles', 'FOOD', /\b(noodle\w*|ramen|udon|pasta|pho)\b/i],
  ['Breakfast', 'FOOD', /\b(breakfast|brunch|all-?day breakfast)\b/i],
  ['Coffee', 'BEVERAGE', /\b(coffee|espresso|latte|cold brew)\b/i],
  ['Tea & Boba', 'BEVERAGE', /\b(bubble tea|boba|milk tea|\btea\b)\b/i],
  ['Functional Beverage', 'BEVERAGE', /\b(functional (drink|beverage)|adaptogen|electrolyte|energy drink|protein (shake|drink))\b/i],
  ['Non-alcoholic', 'BEVERAGE', /\b(non-?alcoholic|alcohol-?free|low-?abv|zero-?proof|mocktail)\b/i],
  ['Soft Drinks', 'BEVERAGE', /\b(soft drink|soda|juice|smoothie)\b/i],
  ['Cocktail', 'ALCOHOL', /\bcocktail\w*\b/i],
  ['Beer', 'ALCOHOL', /\b(beer|lager|ale|craft brew\w*)\b/i],
  ['Wine', 'ALCOHOL', /\b(wine|sommelier|vineyard)\b/i],
  ['Dessert', 'DESSERT', /\b(dessert|ice cream|gelato|cake|pastry|doughnut|donut|cookie)\b/i],
  ['Bakery', 'DESSERT', /\b(bakery|bread|croissant|patisserie)\b/i],
  ['Korean Food', 'CUISINE', /\b(korean|k-food|gochujang|bibimbap|bulgogi)\b/i],
  ['Japanese Food', 'CUISINE', /\b(japanese|izakaya|yakitori|teppanyaki)\b/i],
  ['Italian Food', 'CUISINE', /\bitalian\b/i],
  ['Mexican Food', 'CUISINE', /\b(mexican|taco|burrito)\b/i],
  ['Indian Food', 'CUISINE', /\b(indian|curry|tandoor\w*)\b/i],
  ['Chinese Food', 'CUISINE', /\b(chinese|dim sum|hot pot|szechuan|sichuan)\b/i],
]

/** 기사 하나에서 관측된 메뉴 트렌드(복수 가능) */
export function deriveMenuTerms(a: NewsArticle): MenuDetail[] {
  const text = textOf(a)
  return MENU_TERMS.filter(([, , re]) => re.test(text))
    .slice(0, 3)
    .map(([trendName, menuType]) => ({ trendName, menuType, koreaOpportunity: '' }))
}

/* ------------------------------------------------------------------ */
/* Expansion & Franchise (§17)                                         */
/* ------------------------------------------------------------------ */

const COUNTRIES: [string, RegExp][] = [
  ['UK', /\b(uk|united kingdom|britain|england|scotland|wales|london)\b/i],
  ['US', /\b(us|u\.s\.|usa|united states|america)\b/i],
  ['Canada', /\bcanada\b/i],
  ['Brazil', /\bbrazil\b/i],
  ['Mexico', /\bmexico\b/i],
  ['France', /\b(france|paris)\b/i],
  ['Germany', /\b(germany|berlin|munich)\b/i],
  ['Spain', /\b(spain|madrid|barcelona)\b/i],
  ['Italy', /\b(italy|milan|rome)\b/i],
  ['Ireland', /\b(ireland|dublin)\b/i],
  ['Netherlands', /\b(netherlands|amsterdam)\b/i],
  ['UAE', /\b(uae|dubai|abu dhabi)\b/i],
  ['Saudi Arabia', /\b(saudi|riyadh)\b/i],
  ['India', /\b(india|mumbai|delhi)\b/i],
  ['China', /\b(china|shanghai|beijing|shenzhen)\b/i],
  ['Hong Kong', /\bhong kong\b/i],
  ['Japan', /\b(japan|tokyo|osaka)\b/i],
  ['Korea', /\b(south korea|korea|seoul)\b/i],
  ['Singapore', /\bsingapore\b/i],
  ['Malaysia', /\b(malaysia|kuala lumpur)\b/i],
  ['Indonesia', /\b(indonesia|jakarta)\b/i],
  ['Thailand', /\b(thailand|bangkok)\b/i],
  ['Vietnam', /\b(vietnam|hanoi|ho chi minh)\b/i],
  ['Philippines', /\b(philippines|manila)\b/i],
  ['Australia', /\b(australia|sydney|melbourne)\b/i],
]

/** 소스 국가코드(ISO-2) → COUNTRIES 표시명 */
const CODE_TO_NAME: Record<string, string> = {
  US: 'US',
  GB: 'UK',
  UK: 'UK',
  CA: 'Canada',
  BR: 'Brazil',
  MX: 'Mexico',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  IE: 'Ireland',
  NL: 'Netherlands',
  BE: 'Belgium',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  IN: 'India',
  CN: 'China',
  HK: 'Hong Kong',
  JP: 'Japan',
  KR: 'Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  ID: 'Indonesia',
  TH: 'Thailand',
  VN: 'Vietnam',
  PH: 'Philippines',
  TW: 'Taiwan',
  AU: 'Australia',
}

const STORE_COUNT_RE =
  /(\d[\d,]*)\s*(?:new\s+|more\s+)?(?:stores?|sites?|restaurants?|locations?|units?|outlets?|branches)/i

function deriveExpansionType(text: string): ExpansionDetail['expansionType'] {
  if (/\b(master franchise|area development agreement)\b/i.test(text)) return 'MASTER_FRANCHISE'
  if (/\b(refranchis\w*)\b/i.test(text)) return 'REFRANCHISING'
  if (/\b(acquir\w*|acquisition|takeover|buyout)\b/i.test(text)) return 'ACQUISITION'
  if (/\b(enters?|entry into|first (site|store|restaurant) in|debuts? in|launch\w* in)\b/i.test(text))
    return 'NEW_MARKET_ENTRY'
  if (/\b(new (format|concept)|prototype|format launch)\b/i.test(text)) return 'FORMAT_LAUNCH'
  return 'STORE_OPENING'
}

export function deriveExpansion(a: NewsArticle): ExpansionDetail | null {
  const isExpansion =
    ['EXPANSION', 'FRANCHISE', 'M_AND_A'].includes(a.category) ||
    (a.secondaryCategories ?? []).some((c) => ['EXPANSION', 'FRANCHISE'].includes(c))
  if (!isExpansion) return null

  const text = textOf(a)
  const countryHit = COUNTRIES.find(([, re]) => re.test(text))?.[0]
  const countMatch = text.match(STORE_COUNT_RE)
  const storeCount = countMatch ? Number(countMatch[1].replace(/,/g, '')) : null

  return {
    brand: a.brands[0] ?? '',
    // 확인되지 않은 본사 국가는 만들지 않는다.
    hqCountry: '',
    expansionCountry:
      countryHit ?? (a.country ? (CODE_TO_NAME[a.country] ?? a.country) : ''),
    city: '',
    storeCount: storeCount != null && storeCount > 0 && storeCount < 100_000 ? storeCount : null,
    expansionType: deriveExpansionType(text),
    ownership: /\bjoint venture\b/i.test(text)
      ? 'JV'
      : /\bfranchis\w*/i.test(text)
        ? 'FRANCHISE'
        : 'DIRECT',
    announcementDate: a.publishedAt.slice(0, 10),
  }
}
