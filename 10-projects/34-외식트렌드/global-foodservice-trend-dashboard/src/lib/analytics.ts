import type {
  ArticleFilters,
  BrandWatchRow,
  DailyBrief,
  DateRangeKey,
  ExpansionDetail,
  KeywordTrend,
  Kpi,
  MenuTrendRow,
  NewsArticle,
  Region,
  TechDetail,
  TrendCategory,
} from './types'
import { CATEGORY_LABEL, CATEGORY_ORDER, REGION_ORDER, scoreLabel } from './categories'
import { RADAR_KEYWORDS, WATCHLIST_BRANDS } from './radar-keywords'
import { sortByRanking } from './scoring'
import { tierOf } from './sources'
import { countBy, daysAgo, now, toDateKey, topN, uniq } from './utils'

const DAY = 86_400_000

/* ------------------------------------------------------------------ */
/* Filtering (§19, §20)                                                */
/* ------------------------------------------------------------------ */

export const RANGE_DAYS: Record<Exclude<DateRangeKey, 'CUSTOM' | 'ALL'>, number> = {
  TODAY: 1,
  '7D': 7,
  '30D': 30,
  '90D': 90,
}

export function inRange(
  article: NewsArticle,
  range: DateRangeKey | undefined,
  reference: Date,
  from?: string,
  to?: string,
): boolean {
  if (!range || range === 'ALL') return true
  if (range === 'CUSTOM') {
    const t = new Date(article.publishedAt).getTime()
    if (from && t < new Date(`${from}T00:00:00`).getTime()) return false
    if (to && t > new Date(`${to}T23:59:59`).getTime()) return false
    return true
  }
  if (range === 'TODAY') {
    return toDateKey(article.publishedAt) === toDateKey(reference)
  }
  return daysAgo(article.publishedAt, reference) < RANGE_DAYS[range]
}

/** §19 — 브랜드·국가·제목·메뉴·식재료·카테고리·키워드 전 필드 검색 */
export function matchesQuery(article: NewsArticle, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    article.title,
    article.titleKo,
    article.source,
    article.country ?? '',
    CATEGORY_LABEL[article.category],
    article.category,
    article.trend,
    article.originalSummary,
    article.koreanSummary.join(' '),
    article.whyItMatters,
    article.koreaImplication,
    article.brands.join(' '),
    article.keywords.join(' '),
    article.menu?.trendName ?? '',
    article.tech?.vendor ?? '',
    article.expansion?.expansionCountry ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return needle
    .split(/\s+/)
    .every((token) => haystack.includes(token))
}

export function filterArticles(
  articles: NewsArticle[],
  filters: ArticleFilters,
  reference: Date = now(),
): NewsArticle[] {
  return articles.filter((a) => {
    if (!filters.includeDuplicates && a.isDuplicate) return false
    if (filters.region && filters.region !== 'ALL' && a.region !== filters.region) return false
    if (filters.category && filters.category !== 'ALL' && !hasCategory(a, filters.category))
      return false
    if (filters.country && a.country !== filters.country) return false
    if (filters.source && a.source !== filters.source) return false
    if (filters.brand && !a.brands.some((b) => b === filters.brand)) return false
    if (filters.minScore != null && a.totalScore < filters.minScore) return false
    if (filters.tier && filters.tier !== 'ALL' && tierOf(a.source) !== filters.tier) return false
    if (!inRange(a, filters.range, reference, filters.from, filters.to)) return false
    if (filters.q && !matchesQuery(a, filters.q)) return false
    return true
  })
}

export function hasCategory(a: NewsArticle, category: TrendCategory): boolean {
  return a.category === category || (a.secondaryCategories ?? []).includes(category)
}

/** §26 — Tier 4 는 메인 대시보드에서 제외 */
export function mainDashboardArticles(articles: NewsArticle[]): NewsArticle[] {
  return articles.filter((a) => !a.isDuplicate && tierOf(a.source) <= 3)
}

/* ------------------------------------------------------------------ */
/* KPI (§9)                                                            */
/* ------------------------------------------------------------------ */

export function computeKpis(articles: NewsArticle[], reference: Date = now()): Kpi[] {
  const base = mainDashboardArticles(articles)
  const today = base.filter((a) => toDateKey(a.publishedAt) === toDateKey(reference))
  const yesterday = base.filter(
    (a) => toDateKey(a.publishedAt) === toDateKey(new Date(reference.getTime() - DAY)),
  )

  const countIn = (list: NewsArticle[], pred: (a: NewsArticle) => boolean) =>
    list.filter(pred).length

  const highPriority = (a: NewsArticle) => a.totalScore >= 80
  const newConcept = (a: NewsArticle) =>
    hasCategory(a, 'DESIGN_CONCEPT') || a.expansion?.expansionType === 'FORMAT_LAUNCH'
  const menu = (a: NewsArticle) => hasCategory(a, 'MENU_FOOD') || hasCategory(a, 'BEVERAGE')
  const tech = (a: NewsArticle) => hasCategory(a, 'RESTAURANT_TECH')
  const expansion = (a: NewsArticle) =>
    hasCategory(a, 'EXPANSION') || hasCategory(a, 'M_AND_A') || hasCategory(a, 'FRANCHISE')

  const delta = (n: number, prev: number) => (prev === 0 ? null : n - prev)

  return [
    {
      key: 'today',
      label: 'Today Articles',
      labelKo: '오늘 수집 기사',
      value: today.length,
      unit: '건',
      delta: delta(today.length, yesterday.length),
      hint: '오늘 수집된 기사 (중복 제외 · Tier 1~3)',
      href: '/news-feed?range=TODAY',
    },
    {
      key: 'high',
      label: 'High Priority Trends',
      labelKo: '중요 뉴스',
      value: countIn(today, highPriority),
      unit: '건',
      delta: delta(countIn(today, highPriority), countIn(yesterday, highPriority)),
      hint: 'Total Score 80 이상 (HIGH · MUST KNOW)',
      href: '/news-feed?range=TODAY&minScore=80',
    },
    {
      key: 'concepts',
      label: 'New Brands / Concepts',
      labelKo: '신규 브랜드 · 콘셉트',
      value: countIn(today, newConcept),
      unit: '건',
      delta: delta(countIn(today, newConcept), countIn(yesterday, newConcept)),
      hint: '신규 콘셉트 · 포맷 관련 기사',
      href: '/news-feed?range=TODAY&category=DESIGN_CONCEPT',
    },
    {
      key: 'menu',
      label: 'Menu Trends',
      labelKo: '메뉴 트렌드',
      value: countIn(today, menu),
      unit: '건',
      delta: delta(countIn(today, menu), countIn(yesterday, menu)),
      hint: '메뉴/푸드 · 음료 카테고리',
      href: '/menu-trends',
    },
    {
      key: 'tech',
      label: 'Restaurant Tech',
      labelKo: '레스토랑 테크',
      value: countIn(today, tech),
      unit: '건',
      delta: delta(countIn(today, tech), countIn(yesterday, tech)),
      hint: 'AI · 로봇 · POS · 예약 · 배달 기술',
      href: '/restaurant-tech',
    },
    {
      key: 'expansion',
      label: 'Expansion / M&A',
      labelKo: '출점 · M&A',
      value: countIn(today, expansion),
      unit: '건',
      delta: delta(countIn(today, expansion), countIn(yesterday, expansion)),
      hint: '출점 · 프랜차이즈 · 인수합병',
      href: '/expansion',
    },
  ]
}

/* ------------------------------------------------------------------ */
/* TOP 10 / Region (§10, §11, §12)                                     */
/* ------------------------------------------------------------------ */

export function todayTop(
  articles: NewsArticle[],
  n: number,
  reference: Date = now(),
  region?: Region,
): NewsArticle[] {
  const pool = mainDashboardArticles(articles).filter((a) => {
    if (region && a.region !== region) return false
    return daysAgo(a.publishedAt, reference) <= 2
  })
  const wide =
    pool.length >= n
      ? pool
      : mainDashboardArticles(articles).filter((a) =>
          region ? a.region === region : true,
        )
  return sortByRanking(wide, reference).slice(0, n)
}

export interface RegionSummary {
  region: Region
  total: number
  today: number
  top5: NewsArticle[]
  keywords: { term: string; count: number }[]
  brands: { brand: string; count: number }[]
  categories: { category: TrendCategory; label: string; count: number }[]
  recent: NewsArticle[]
  concepts: NewsArticle[]
  expansion: NewsArticle[]
}

export function regionSummary(
  articles: NewsArticle[],
  region: Region,
  reference: Date = now(),
): RegionSummary {
  const base = mainDashboardArticles(articles).filter((a) => a.region === region)
  const last30 = base.filter((a) => daysAgo(a.publishedAt, reference) < 30)

  const keywordCounts = countBy(
    last30.flatMap((a) => a.keywords),
    (k) => k,
  )
  const brandCounts = countBy(
    last30.flatMap((a) => a.brands),
    (b) => b,
  )

  return {
    region,
    total: base.length,
    today: base.filter((a) => toDateKey(a.publishedAt) === toDateKey(reference)).length,
    top5: todayTop(articles, 5, reference, region),
    keywords: topN(keywordCounts, 10).map(([term, count]) => ({ term, count })),
    brands: topN(brandCounts, 8).map(([brand, count]) => ({ brand, count })),
    categories: CATEGORY_ORDER.map((category) => ({
      category,
      label: CATEGORY_LABEL[category],
      count: last30.filter((a) => hasCategory(a, category)).length,
    }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count),
    recent: sortByRanking(base, reference)
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 20),
    concepts: base.filter((a) => hasCategory(a, 'DESIGN_CONCEPT')).slice(0, 6),
    expansion: base
      .filter((a) => hasCategory(a, 'EXPANSION') || hasCategory(a, 'FRANCHISE'))
      .slice(0, 6),
  }
}

/* ------------------------------------------------------------------ */
/* Trend Radar (§13)                                                   */
/* ------------------------------------------------------------------ */

function articleText(a: NewsArticle): string {
  return [
    a.title,
    a.titleKo,
    a.trend,
    a.originalSummary,
    a.koreanSummary.join(' '),
    a.keywords.join(' '),
    a.menu?.trendName ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

function mentions(articles: NewsArticle[], patterns: string[]): NewsArticle[] {
  return articles.filter((a) => {
    const text = articleText(a)
    return patterns.some((p) => text.includes(p))
  })
}

export function keywordTrends(
  articles: NewsArticle[],
  reference: Date = now(),
): KeywordTrend[] {
  const base = mainDashboardArticles(articles)
  const win = (fromDays: number, toDays: number) =>
    base.filter((a) => {
      const d = daysAgo(a.publishedAt, reference)
      return d >= fromDays && d < toDays
    })

  const last7 = win(0, 7)
  const prev7 = win(7, 14)
  const last30 = win(0, 30)
  const prev30 = win(30, 60)

  const growth = (current: number, previous: number) => {
    if (previous === 0) return current === 0 ? 0 : 100
    return ((current - previous) / previous) * 100
  }

  return RADAR_KEYWORDS.map((rk) => {
    const in30 = mentions(last30, rk.match)
    const in7 = mentions(last7, rk.match)
    const inPrev7 = mentions(prev7, rk.match)
    const inPrev30 = mentions(prev30, rk.match)

    const regionDistribution = REGION_ORDER.reduce(
      (acc, r) => {
        acc[r] = in30.filter((a) => a.region === r).length
        return acc
      },
      {} as Record<Region, number>,
    )

    return {
      keyword: rk.keyword,
      labelKo: rk.labelKo,
      mentions30d: in30.length,
      mentions7d: in7.length,
      growth7d: Math.round(growth(in7.length, inPrev7.length)),
      growth30d: Math.round(growth(in30.length, inPrev30.length)),
      regionDistribution,
      topBrands: topN(
        countBy(
          in30.flatMap((a) => a.brands),
          (b) => b,
        ),
        3,
      ).map(([b]) => b),
      articleIds: in30.map((a) => a.id),
    }
  })
    .filter((k) => k.mentions30d > 0)
    .sort((a, b) => b.growth7d - a.growth7d || b.mentions30d - a.mentions30d)
}

/** §22-3 — 30일 키워드 변화 타임라인 (상위 5개 키워드, 주 단위) */
export function keywordTimeline(articles: NewsArticle[], reference: Date = now()) {
  const base = mainDashboardArticles(articles)
  const top = keywordTrends(articles, reference)
    .slice()
    .sort((a, b) => b.mentions30d - a.mentions30d)
    .slice(0, 5)

  const buckets = [
    { label: 'D-30~22', from: 22, to: 31 },
    { label: 'D-21~15', from: 15, to: 22 },
    { label: 'D-14~8', from: 8, to: 15 },
    { label: 'D-7~0', from: 0, to: 8 },
  ]

  return {
    keys: top.map((t) => t.keyword),
    rows: buckets.map((b) => {
      const inBucket = base.filter((a) => {
        const d = daysAgo(a.publishedAt, reference)
        return d >= b.from && d < b.to
      })
      const row: Record<string, string | number> = { bucket: b.label }
      top.forEach((t) => {
        const patterns = RADAR_KEYWORDS.find((r) => r.keyword === t.keyword)?.match ?? []
        row[t.keyword] = mentions(inBucket, patterns).length
      })
      return row
    }),
  }
}

/* ------------------------------------------------------------------ */
/* Menu Trend (§14)                                                    */
/* ------------------------------------------------------------------ */

export function menuTrends(articles: NewsArticle[], reference: Date = now()): MenuTrendRow[] {
  const base = mainDashboardArticles(articles)
  const withMenu = base.filter((a) => a.menu)
  const groups = new Map<string, NewsArticle[]>()
  withMenu.forEach((a) => {
    const key = a.menu!.trendName
    groups.set(key, [...(groups.get(key) ?? []), a])
  })

  const last30 = (list: NewsArticle[]) =>
    list.filter((a) => daysAgo(a.publishedAt, reference) < 30).length
  const prev30 = (list: NewsArticle[]) =>
    list.filter((a) => {
      const d = daysAgo(a.publishedAt, reference)
      return d >= 30 && d < 60
    }).length

  return Array.from(groups.entries())
    .map(([trendName, list]) => {
      const patterns = RADAR_KEYWORDS.find((r) => r.keyword === trendName)?.match ?? [
        trendName.toLowerCase(),
      ]
      const allMentions = mentions(base, patterns)
      const cur = last30(allMentions)
      const prev = prev30(allMentions)
      return {
        trendName,
        menuType: list[0].menu!.menuType,
        mentions: allMentions.length,
        growthRate:
          prev === 0 ? (cur === 0 ? 0 : 100) : Math.round(((cur - prev) / prev) * 100),
        topCountries: uniq(allMentions.map((a) => a.country ?? '')).filter(Boolean).slice(0, 4),
        topBrands: topN(
          countBy(
            allMentions.flatMap((a) => a.brands),
            (b) => b,
          ),
          3,
        ).map(([b]) => b),
        articleIds: allMentions.map((a) => a.id),
        koreaOpportunity: list[0].menu!.koreaOpportunity,
      }
    })
    .sort((a, b) => b.mentions - a.mentions)
}

/* ------------------------------------------------------------------ */
/* Brand Watch (§15)                                                   */
/* ------------------------------------------------------------------ */

export function brandWatch(articles: NewsArticle[]): BrandWatchRow[] {
  const base = mainDashboardArticles(articles)
  const brands = uniq([...WATCHLIST_BRANDS, ...base.flatMap((a) => a.brands)])

  return brands
    .map((brand) => {
      const mine = base.filter((a) => a.brands.includes(brand))
      const count = (pred: (a: NewsArticle) => boolean) => mine.filter(pred).length
      return {
        brand,
        newsCount: mine.length,
        newMarkets: count(
          (a) =>
            a.expansion?.expansionType === 'NEW_MARKET_ENTRY' ||
            a.expansion?.expansionType === 'MASTER_FRANCHISE',
        ),
        newStores: mine.reduce(
          (sum, a) =>
            sum +
            (a.expansion && a.expansion.expansionType === 'STORE_OPENING'
              ? (a.expansion.storeCount ?? 0)
              : 0),
          0,
        ),
        newMenu: count((a) => hasCategory(a, 'MENU_FOOD') || hasCategory(a, 'BEVERAGE')),
        franchise: count((a) => hasCategory(a, 'FRANCHISE')),
        investment: count((a) => hasCategory(a, 'EXPANSION')),
        mAndA: count((a) => hasCategory(a, 'M_AND_A')),
        technology: count((a) => hasCategory(a, 'RESTAURANT_TECH')),
        topScore: mine.reduce((m, a) => Math.max(m, a.totalScore), 0),
        articleIds: mine.map((a) => a.id),
      }
    })
    .filter((row) => row.newsCount > 0 || WATCHLIST_BRANDS.includes(row.brand))
    .sort((a, b) => b.newsCount - a.newsCount || b.topScore - a.topScore)
}

/* ------------------------------------------------------------------ */
/* Restaurant Tech (§16) · Expansion (§17)                             */
/* ------------------------------------------------------------------ */

export interface TechRow extends TechDetail {
  articleId: string
  headline: string
  headlineKo: string
  region: Region
  country: string
  publishedAt: string
  totalScore: number
}

export function techRows(articles: NewsArticle[]): TechRow[] {
  return mainDashboardArticles(articles)
    .filter((a) => a.tech)
    .map((a) => ({
      ...a.tech!,
      articleId: a.id,
      headline: a.title,
      headlineKo: a.titleKo,
      region: a.region,
      country: a.country ?? '',
      publishedAt: a.publishedAt,
      totalScore: a.totalScore,
    }))
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
}

export interface ExpansionRow extends ExpansionDetail {
  articleId: string
  source: string
  headlineKo: string
  region: Region
  totalScore: number
}

export function expansionRows(articles: NewsArticle[]): ExpansionRow[] {
  return mainDashboardArticles(articles)
    .filter((a) => a.expansion)
    .map((a) => ({
      ...a.expansion!,
      articleId: a.id,
      source: a.source,
      headlineKo: a.titleKo,
      region: a.region,
      totalScore: a.totalScore,
    }))
    .sort(
      (a, b) =>
        new Date(b.announcementDate).getTime() - new Date(a.announcementDate).getTime(),
    )
}

/* ------------------------------------------------------------------ */
/* Charts (§22)                                                        */
/* ------------------------------------------------------------------ */

export function regionCounts(articles: NewsArticle[], reference: Date = now()) {
  const base = mainDashboardArticles(articles).filter(
    (a) => daysAgo(a.publishedAt, reference) < 30,
  )
  return REGION_ORDER.map((region) => ({
    region,
    count: base.filter((a) => a.region === region).length,
  }))
}

export function categoryCounts(articles: NewsArticle[], reference: Date = now()) {
  const base = mainDashboardArticles(articles).filter(
    (a) => daysAgo(a.publishedAt, reference) < 30,
  )
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    count: base.filter((a) => hasCategory(a, category)).length,
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
}

export function scoreDistribution(articles: NewsArticle[]) {
  const base = mainDashboardArticles(articles)
  const buckets = ['MUST KNOW', 'HIGH', 'WATCH', 'REFERENCE', 'LOW'] as const
  return buckets.map((label) => ({
    label,
    count: base.filter((a) => scoreLabel(a.totalScore) === label).length,
  }))
}

export function brandMentionRanking(articles: NewsArticle[], limit = 10) {
  const base = mainDashboardArticles(articles)
  return topN(
    countBy(
      base.flatMap((a) => a.brands),
      (b) => b,
    ),
    limit,
  ).map(([brand, count]) => ({ brand, count }))
}

export function expansionCountryRanking(articles: NewsArticle[], limit = 10) {
  const rows = expansionRows(articles)
  return topN(
    countBy(rows, (r) => r.expansionCountry),
    limit,
  ).map(([country, count]) => ({ country, count }))
}

/* ------------------------------------------------------------------ */
/* Executive Daily Brief (§12, §18)                                    */
/* ------------------------------------------------------------------ */

export function buildDailyBrief(
  articles: NewsArticle[],
  reference: Date = now(),
): DailyBrief {
  const asiaTop3 = todayTop(articles, 3, reference, 'ASIA')
  const europeTop3 = todayTop(articles, 3, reference, 'EUROPE')
  const americasTop3 = todayTop(articles, 3, reference, 'AMERICAS')
  const globalInsight = todayTop(articles, 2, reference, 'GLOBAL')

  const recent = mainDashboardArticles(articles).filter(
    (a) => daysAgo(a.publishedAt, reference) <= 2,
  )
  const pick = (pred: (a: NewsArticle) => boolean, n: number) =>
    sortByRanking(recent.filter(pred), reference).slice(0, n)

  const headline = [...asiaTop3, ...europeTop3, ...americasTop3, ...globalInsight]
  const ranked = sortByRanking(headline, reference)

  const keyMessage = ranked.slice(0, 3).map((a) => `${a.titleKo} — ${a.trend}`)

  const actionable = sortByRanking(
    recent.filter(
      (a) => a.recommendedAction === 'IMMEDIATE_REVIEW' || a.recommendedAction === 'BENCHMARK',
    ),
    reference,
  )

  return {
    date: toDateKey(reference),
    keyMessage,
    asiaTop3,
    europeTop3,
    americasTop3,
    globalInsight,
    menuTrend: pick((a) => hasCategory(a, 'MENU_FOOD') || hasCategory(a, 'BEVERAGE'), 3),
    restaurantTech: pick((a) => hasCategory(a, 'RESTAURANT_TECH'), 3),
    expansion: pick(
      (a) => hasCategory(a, 'EXPANSION') || hasCategory(a, 'FRANCHISE') || hasCategory(a, 'M_AND_A'),
      3,
    ),
    koreaImplication: ranked.slice(0, 4).map((a) => a.koreaImplication),
    todayThree: actionable.slice(0, 3).map((a) => a.koreaImplication),
  }
}

/** §12 — Executive Summary 노출 기사 (10~12건) */
export function executiveSummaryArticles(
  articles: NewsArticle[],
  reference: Date = now(),
): NewsArticle[] {
  const brief = buildDailyBrief(articles, reference)
  return uniq(
    [...brief.asiaTop3, ...brief.europeTop3, ...brief.americasTop3, ...brief.globalInsight].map(
      (a) => a.id,
    ),
  )
    .map((id) => articles.find((a) => a.id === id)!)
    .filter(Boolean)
}
