import type { NewsArticle, RecommendedAction } from './types'
import { reliabilityScoreOf } from './sources'

/**
 * §6 — Trend Score (100점 만점)
 *
 * Total Score =
 *   Business Impact 30%
 * + Novelty          25%
 * + Market Scale     20%
 * + Source Reliability 15%
 * + Korea Relevance  10%
 */
export const SCORE_WEIGHTS = {
  businessImpact: 0.3,
  novelty: 0.25,
  marketScale: 0.2,
  sourceReliability: 0.15,
  koreaRelevance: 0.1,
} as const

export interface ScoreInput {
  businessImpactScore: number
  noveltyScore: number
  marketScaleScore: number
  reliabilityScore: number
  koreaRelevanceScore: number
}

export function computeTotalScore(input: ScoreInput): number {
  const total =
    input.businessImpactScore * SCORE_WEIGHTS.businessImpact +
    input.noveltyScore * SCORE_WEIGHTS.novelty +
    input.marketScaleScore * SCORE_WEIGHTS.marketScale +
    input.reliabilityScore * SCORE_WEIGHTS.sourceReliability +
    input.koreaRelevanceScore * SCORE_WEIGHTS.koreaRelevance
  return Math.round(clamp(total, 0, 100))
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/**
 * Reliability는 출처 Tier에서 결정된다(§26). AI가 임의로 올리지 못하도록
 * 파이프라인에서 항상 이 함수로 덮어쓴다.
 */
export function resolveReliability(sourceName: string, aiScore?: number): number {
  const tierScore = reliabilityScoreOf(sourceName)
  if (aiScore == null) return tierScore
  // AI 판단은 Tier 점수를 ±5점 범위에서만 보정할 수 있다.
  return Math.round(clamp(aiScore, tierScore - 5, tierScore + 5))
}

/** §5 — Korea Relevance 점수에서 권고 액션을 도출 (AI 값이 없을 때의 폴백) */
export function deriveRecommendedAction(
  koreaRelevance: number,
  total: number,
): RecommendedAction {
  if (koreaRelevance >= 85 && total >= 80) return 'IMMEDIATE_REVIEW'
  if (koreaRelevance >= 70) return 'BENCHMARK'
  if (koreaRelevance >= 55) return 'MID_LONG_TERM'
  return 'REFERENCE'
}

/**
 * §10 — TOP 10 선정 기준
 *   Total Score + 뉴스 신선도 + 지역 중요도 + 한국 외식업 적용 가능성
 * 원 점수를 훼손하지 않도록 별도 ranking score를 계산한다.
 */
const REGION_WEIGHT: Record<NewsArticle['region'], number> = {
  GLOBAL: 1.5,
  ASIA: 2.5,
  AMERICAS: 2.0,
  EUROPE: 1.5,
}

const ACTION_WEIGHT: Record<RecommendedAction, number> = {
  IMMEDIATE_REVIEW: 6,
  BENCHMARK: 4,
  MID_LONG_TERM: 2,
  REFERENCE: 0,
}

export function rankingScore(a: NewsArticle, reference: Date): number {
  const ageHours = Math.max(
    0,
    (reference.getTime() - new Date(a.publishedAt).getTime()) / 3_600_000,
  )
  // 신선도: 24시간 이내 만점, 이후 완만하게 감쇠 (7일 = 0에 수렴)
  const freshness = 8 * Math.exp(-ageHours / 96)
  return a.totalScore + freshness + REGION_WEIGHT[a.region] + ACTION_WEIGHT[a.recommendedAction]
}

export function sortByRanking(articles: NewsArticle[], reference: Date): NewsArticle[] {
  return [...articles].sort((a, b) => rankingScore(b, reference) - rankingScore(a, reference))
}
