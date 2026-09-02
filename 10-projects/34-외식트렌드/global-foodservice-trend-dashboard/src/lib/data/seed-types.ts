import type {
  ExpansionDetail,
  MenuDetail,
  NewsArticle,
  RecommendedAction,
  Region,
  Sentiment,
  TechDetail,
  TrendCategory,
} from '../types'
import { SOURCE_BY_NAME, reliabilityScoreOf } from '../sources'
import { computeTotalScore } from '../scoring'

/**
 * Demo seed — 화면 확인용 합성 데이터(§31).
 * 필드를 짧게 유지하고 파생값(총점·ID·수집시각)은 builder 가 계산한다.
 */
export interface ArticleSeed {
  /** 오늘로부터 며칠 전 */
  d: number
  /** 발행 시각(KST 기준 시) */
  h: number
  r: Region
  country: string
  cat: TrendCategory
  cat2?: TrendCategory[]
  src: string
  t: string
  tk: string
  brands: string[]
  kw: string[]
  os: string
  ks: [string, string, string]
  trend: string
  why: string
  ki: string
  act: RecommendedAction
  /** [businessImpact, novelty, marketScale, koreaRelevance] */
  s: [number, number, number, number]
  sent?: Sentiment
  exp?: ExpansionDetail
  tech?: TechDetail
  menu?: MenuDetail
}

const DAY = 86_400_000

/** KST 기준 발행시각을 ISO 로 변환 */
function publishedIso(base: Date, daysBefore: number, hour: number): string {
  const d = new Date(base.getTime() - daysBefore * DAY)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return new Date(`${y}-${m}-${day}T${String(hour).padStart(2, '0')}:00:00+09:00`).toISOString()
}

export function buildArticles(seeds: ArticleSeed[], base: Date): NewsArticle[] {
  return seeds.map((seed, i) => {
    const source = SOURCE_BY_NAME.get(seed.src)
    const reliability = reliabilityScoreOf(seed.src)
    const [businessImpactScore, noveltyScore, marketScaleScore, koreaRelevanceScore] = seed.s
    const totalScore = computeTotalScore({
      businessImpactScore,
      noveltyScore,
      marketScaleScore,
      reliabilityScore: reliability,
      koreaRelevanceScore,
    })
    const publishedAt = publishedIso(base, seed.d, seed.h)
    return {
      id: `demo-${String(i + 1).padStart(3, '0')}`,
      title: seed.t,
      titleKo: seed.tk,
      source: seed.src,
      sourceUrl: source?.url ?? '',
      // DEMO 데이터는 실제 기사 URL 을 만들어내지 않는다. 출처 사이트로 연결한다.
      articleUrl: source?.url ?? '',
      publishedAt,
      collectedAt: new Date(
        Math.min(base.getTime(), new Date(publishedAt).getTime() + 4 * 3_600_000),
      ).toISOString(),
      region: seed.r,
      country: seed.country,
      category: seed.cat,
      secondaryCategories: seed.cat2 ?? [],
      brands: seed.brands,
      keywords: seed.kw,
      originalSummary: seed.os,
      koreanSummary: seed.ks,
      trend: seed.trend,
      whyItMatters: seed.why,
      koreaImplication: seed.ki,
      recommendedAction: seed.act,
      trendScore: totalScore,
      businessImpactScore,
      noveltyScore,
      marketScaleScore,
      reliabilityScore: reliability,
      koreaRelevanceScore,
      totalScore,
      sentiment: seed.sent ?? 'NEUTRAL',
      isDuplicate: false,
      expansion: seed.exp
        ? { ...seed.exp, announcementDate: publishedAt.slice(0, 10) }
        : undefined,
      tech: seed.tech,
      menu: seed.menu,
    } satisfies NewsArticle
  })
}
