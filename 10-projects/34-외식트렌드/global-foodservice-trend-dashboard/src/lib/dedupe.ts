import type { NewsArticle } from './types'
import { jaccard } from './utils'

/**
 * §7 — 중복 기사 처리
 *
 * 판정 기준
 *  - 제목 의미 유사도
 *  - 동일 브랜드
 *  - 동일 사건 (키워드 유사도)
 *  - 동일 날짜 또는 ±2일
 *  - 기사 본문 키워드 유사도
 *
 * 별도 기사로 유지하는 예외
 *  - 서로 다른 지역의 영향 분석
 *  - 새로운 수치 또는 데이터 추가
 *  - 다른 기업의 대응 사례
 *  - 후속 기사
 */
export const DUPLICATE_THRESHOLD = 0.55
const DAY = 86_400_000

export interface DuplicateDecision {
  isDuplicate: boolean
  duplicateGroupId?: string
  keptReason?: string
}

function withinTwoDays(a: string, b: string): boolean {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) <= 2 * DAY
}

function overlap(a: string[], b: string[]): number {
  const sb = new Set(b.map((s) => s.toLowerCase()))
  const hit = a.filter((s) => sb.has(s.toLowerCase())).length
  const denom = new Set([...a, ...b].map((s) => s.toLowerCase())).size
  return denom === 0 ? 0 : hit / denom
}

/** 두 기사가 같은 사건인지 판정 */
export function similarity(a: NewsArticle, b: NewsArticle): number {
  if (!withinTwoDays(a.publishedAt, b.publishedAt)) return 0
  const titleSim = jaccard(a.title, b.title)
  const keywordSim = overlap(a.keywords, b.keywords)
  const brandSim = overlap(a.brands, b.brands)
  const bodySim = jaccard(a.originalSummary, b.originalSummary)
  // 제목은 매체마다 표현이 크게 달라 단독 신호로는 약하다.
  // 같은 사건인지는 브랜드·키워드 일치가 더 강하게 말해준다.
  return titleSim * 0.35 + keywordSim * 0.3 + brandSim * 0.2 + bodySim * 0.15
}

/** §7 예외 규칙 — 유사해도 별도 기사로 유지해야 하는가? */
export function shouldKeepSeparate(
  candidate: NewsArticle,
  representative: NewsArticle,
): string | null {
  if (candidate.region !== representative.region) {
    return '서로 다른 지역의 영향 분석'
  }
  if (hasNewFigures(candidate) && !hasNewFigures(representative)) {
    return '새로운 수치 또는 데이터 추가'
  }
  const candBrands = new Set(candidate.brands.map((b) => b.toLowerCase()))
  const repBrands = new Set(representative.brands.map((b) => b.toLowerCase()))
  const distinct = [...candBrands].filter((b) => !repBrands.has(b))
  if (distinct.length > 0 && candidate.brands.length > 0) {
    return '다른 기업의 대응 사례'
  }
  if (
    new Date(candidate.publishedAt).getTime() -
      new Date(representative.publishedAt).getTime() >
    DAY
  ) {
    return '후속 기사'
  }
  return null
}

const FIGURE_RE = /\d[\d,.]*\s?(%|percent|billion|million|bn|억|조|만|개점|stores?|units?)/i

function hasNewFigures(a: NewsArticle): boolean {
  return FIGURE_RE.test(a.originalSummary) || FIGURE_RE.test(a.title)
}

/**
 * 기사 배열에 중복 플래그를 부여한다.
 * 대표 기사는 (신뢰도 → 총점 → 발행시각) 순으로 가장 강한 기사 1건.
 */
export function markDuplicates(articles: NewsArticle[]): NewsArticle[] {
  const ordered = [...articles].sort((a, b) => {
    if (b.reliabilityScore !== a.reliabilityScore)
      return b.reliabilityScore - a.reliabilityScore
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime()
  })

  const representatives: NewsArticle[] = []
  const result = new Map<string, NewsArticle>()

  for (const article of ordered) {
    let matched: NewsArticle | null = null
    for (const rep of representatives) {
      if (similarity(article, rep) >= DUPLICATE_THRESHOLD) {
        matched = rep
        break
      }
    }

    if (!matched) {
      const rep = { ...article, isDuplicate: false, duplicateGroupId: `grp-${article.id}` }
      representatives.push(rep)
      result.set(article.id, rep)
      continue
    }

    const keepReason = shouldKeepSeparate(article, matched)
    if (keepReason) {
      const rep = { ...article, isDuplicate: false, duplicateGroupId: matched.duplicateGroupId }
      representatives.push(rep)
      result.set(article.id, rep)
    } else {
      result.set(article.id, {
        ...article,
        isDuplicate: true,
        duplicateGroupId: matched.duplicateGroupId,
      })
    }
  }

  return articles.map((a) => result.get(a.id) ?? a)
}

/** 같은 사건 그룹의 다른 기사들 (상세 페이지 "관련 뉴스") */
export function relatedInGroup(article: NewsArticle, all: NewsArticle[]): NewsArticle[] {
  if (!article.duplicateGroupId) return []
  return all.filter(
    (a) => a.id !== article.id && a.duplicateGroupId === article.duplicateGroupId,
  )
}
