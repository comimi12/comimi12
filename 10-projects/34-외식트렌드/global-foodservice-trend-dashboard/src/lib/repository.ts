/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NewsArticle, SourceRecord } from './types'
import { demoArticles, demoSources } from './data/demo'
import { collectedArticles, collectedMeta, hasCollectedData } from './data/collected'
import { getPrisma, isLive } from './db'
import { SOURCES } from './sources'
import { markDuplicates } from './dedupe'

/**
 * 데이터 접근 계층.
 * DEMO 모드에서는 내장 합성 데이터셋, LIVE 모드에서는 PostgreSQL 을 읽는다.
 * 화면·API 는 이 모듈만 사용하고 Prisma 를 직접 호출하지 않는다.
 */

function rowToArticle(row: any): NewsArticle {
  return {
    id: row.id,
    title: row.title,
    titleKo: row.titleKo,
    source: row.source?.name ?? '',
    sourceUrl: row.source?.url ?? '',
    articleUrl: row.articleUrl,
    publishedAt: row.publishedAt.toISOString(),
    collectedAt: row.collectedAt.toISOString(),
    region: row.region,
    country: row.country ?? undefined,
    category: row.category,
    secondaryCategories: row.secondaryCategories ?? [],
    brands: (row.brands ?? []).map((b: any) => b.brand.name),
    keywords: (row.keywords ?? []).map((k: any) => k.keyword.term),
    originalSummary: row.originalSummary,
    koreanSummary: row.koreanSummary ?? [],
    trend: row.trend,
    whyItMatters: row.whyItMatters,
    koreaImplication: row.koreaImplication,
    recommendedAction: row.recommendedAction,
    trendScore: row.trendScore,
    businessImpactScore: row.businessImpactScore,
    noveltyScore: row.noveltyScore,
    marketScaleScore: row.marketScaleScore,
    reliabilityScore: row.reliabilityScore,
    koreaRelevanceScore: row.koreaRelevanceScore,
    totalScore: row.totalScore,
    sentiment: row.sentiment,
    isDuplicate: row.isDuplicate,
    duplicateGroupId: row.duplicateGroupId ?? undefined,
    imageUrl: row.imageUrl ?? undefined,
    expansion: row.expansion
      ? {
          brand: row.expansion.brand,
          hqCountry: row.expansion.hqCountry,
          expansionCountry: row.expansion.expansionCountry,
          city: row.expansion.city,
          storeCount: row.expansion.storeCount,
          expansionType: row.expansion.expansionType,
          ownership: row.expansion.ownership,
          announcementDate: row.expansion.announcementDate.toISOString().slice(0, 10),
        }
      : undefined,
    tech: row.tech
      ? {
          techCategory: row.tech.techCategory,
          vendor: row.tech.vendor,
          adopterBrand: row.tech.adopterBrand,
          purpose: row.tech.purpose,
          expectedEffect: row.tech.expectedEffect,
        }
      : undefined,
    menu: row.menu
      ? {
          trendName: row.menu.trendName,
          menuType: row.menu.menuType,
          koreaOpportunity: row.menu.koreaOpportunity,
        }
      : undefined,
  }
}

/** §27 — 기본 조회 창은 최근 3년 */
const DEFAULT_LOOKBACK_DAYS = 365 * 3

/**
 * 데이터 출처 우선순위
 *   1. LIVE 모드 + DATABASE_URL  → PostgreSQL
 *   2. 매일 수집된 collected.json → 실기사 (DB 없이 매일 갱신되는 경로)
 *   3. DEMO 데이터셋              → 합성 데이터
 */
export type DataSource = 'db' | 'collected' | 'demo'

export function dataSource(): DataSource {
  if (isLive()) return 'db'
  return hasCollectedData() ? 'collected' : 'demo'
}

export function dataSourceMeta() {
  const source = dataSource()
  return {
    source,
    ...collectedMeta(),
    isDemo: source === 'demo',
  }
}

function fileOrDemo(): NewsArticle[] {
  return hasCollectedData() ? markDuplicates(collectedArticles()) : demoArticles()
}

export async function getArticles(): Promise<NewsArticle[]> {
  if (!isLive()) return fileOrDemo()

  const prisma = await getPrisma()
  if (!prisma) return fileOrDemo()

  try {
    const since = new Date(Date.now() - DEFAULT_LOOKBACK_DAYS * 86_400_000)
    const rows = await prisma.article.findMany({
      where: { publishedAt: { gte: since } },
      orderBy: { publishedAt: 'desc' },
      include: {
        source: true,
        brands: { include: { brand: true } },
        keywords: { include: { keyword: true } },
        expansion: true,
        tech: true,
        menu: true,
      },
    })
    const articles = rows.map(rowToArticle)
    // 저장 시점에 중복 판정을 했더라도 조회 시 재확인한다(신규 유입 반영).
    return markDuplicates(articles)
  } catch (err) {
    console.error('[repository] DB 조회 실패 — 파일/DEMO 데이터로 폴백합니다.', err)
    return fileOrDemo()
  }
}

export async function getArticleById(id: string): Promise<NewsArticle | null> {
  const all = await getArticles()
  return all.find((a) => a.id === id) ?? null
}

export async function getSources(): Promise<SourceRecord[]> {
  if (!isLive()) return sourcesFromArticles()

  const prisma = await getPrisma()
  if (!prisma) return sourcesFromArticles()

  try {
    const rows = await prisma.source.findMany({ orderBy: [{ region: 'asc' }, { name: 'asc' }] })
    return rows.map((s: any) => ({
      id: s.slug,
      name: s.name,
      region: s.region,
      country: s.country,
      url: s.url,
      rssUrl: s.rssUrl,
      reliabilityTier: s.reliabilityTier,
      active: s.active,
      lastCrawledAt: s.lastCrawledAt?.toISOString() ?? null,
      lastSuccessAt: s.lastSuccessAt?.toISOString() ?? null,
      articleCount: s.articleCount,
      note: s.note ?? undefined,
    }))
  } catch (err) {
    console.error('[repository] Source 조회 실패 — 파일/DEMO 데이터로 폴백합니다.', err)
    return sourcesFromArticles()
  }
}

/** collected.json 이 있으면 실제 수집 결과 기준으로 소스 현황을 만든다. */
function sourcesFromArticles(): SourceRecord[] {
  if (!hasCollectedData()) return demoSources()
  const articles = collectedArticles()
  const meta = collectedMeta()
  return SOURCES.map((s) => {
    const mine = articles.filter((a) => a.source === s.name)
    return {
      ...s,
      articleCount: mine.length,
      lastCrawledAt: meta.generatedAt,
      lastSuccessAt: mine.length > 0 ? (mine[0].collectedAt ?? meta.generatedAt) : null,
    }
  })
}
