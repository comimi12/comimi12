import type { NewsArticle } from '../types'
import raw from './collected.json'

/**
 * 매일 수집된 실기사 저장소 (DB 없이 동작하는 경로).
 *
 * GitHub Actions 가 매일 09:00 KST 에 RSS 를 수집·분석해 이 JSON 을 갱신하고
 * 커밋하면, Vercel 자동 배포가 걸리면서 사이트 데이터가 바뀐다.
 * 파일이 비어 있으면 DEMO 데이터셋으로 폴백한다.
 */
export interface CollectedStore {
  generatedAt: string | null
  analyzer: string | null
  sourcesOk: number
  articles: NewsArticle[]
}

const store = raw as unknown as CollectedStore

export function collectedArticles(): NewsArticle[] {
  return Array.isArray(store.articles) ? store.articles : []
}

export function collectedMeta() {
  return {
    generatedAt: store.generatedAt,
    analyzer: store.analyzer,
    sourcesOk: store.sourcesOk ?? 0,
    count: collectedArticles().length,
  }
}

export function hasCollectedData(): boolean {
  return collectedArticles().length > 0
}
