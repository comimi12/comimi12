import type { NewsArticle, SourceRecord } from '../types'
import { SOURCES } from '../sources'
import { markDuplicates } from '../dedupe'
import { now } from '../utils'
import { buildArticles } from './seed-types'
import { ASIA_SEEDS } from './seeds-asia'
import { EUROPE_SEEDS } from './seeds-europe'
import { AMERICAS_SEEDS } from './seeds-americas'
import { GLOBAL_SEEDS } from './seeds-global'
import { BASELINE_SEEDS } from './seeds-baseline'

/**
 * §31 Demo Mode — API Key / DB 없이 화면을 확인하기 위한 합성 데이터셋.
 *
 * ⚠️ 실제 보도된 기사가 아니다. 실존 브랜드명을 사용하되 내용은 화면 검증용으로
 *    작성된 것이며, articleUrl 은 출처 사이트 홈으로 연결된다.
 */
const ALL_SEEDS = [
  ...GLOBAL_SEEDS,
  ...ASIA_SEEDS,
  ...EUROPE_SEEDS,
  ...AMERICAS_SEEDS,
  ...BASELINE_SEEDS,
]

let cache: NewsArticle[] | null = null

export function demoArticles(): NewsArticle[] {
  if (!cache) {
    const built = buildArticles(ALL_SEEDS, now())
    cache = markDuplicates(built).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    )
  }
  return cache
}

/** §29 — Demo 모드에서도 소스별 수집 현황이 보이도록 카운트를 채운다. */
export function demoSources(): SourceRecord[] {
  const articles = demoArticles()
  const reference = now()
  return SOURCES.map((s) => {
    const mine = articles.filter((a) => a.source === s.name)
    const latest = mine[0]
    return {
      ...s,
      articleCount: mine.length,
      lastCrawledAt: reference.toISOString(),
      // RSS 미제공 소스는 마지막 성공 수집이 오래된 상태로 표현한다.
      lastSuccessAt:
        mine.length > 0
          ? latest.collectedAt
          : new Date(reference.getTime() - 3 * 86_400_000).toISOString(),
    }
  })
}

export const DEMO_NOTICE =
  'DEMO 데이터 — 실제 보도 기사가 아닌 화면 검증용 합성 데이터입니다.'
