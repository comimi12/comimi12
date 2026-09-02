/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NewsArticle, TrendCategory } from '../types'
import { SOURCES } from '../sources'
import { getPrisma, isLive } from '../db'
import { getAnalyzer } from '../ai'
import { markDuplicates } from '../dedupe'
import { computeTotalScore, deriveRecommendedAction, resolveReliability } from '../scoring'
import { buildDailyBrief } from '../analytics'
import { fetchFeed, urlHash } from './rss'
import { toDateKey } from '../utils'

/**
 * §24 — 자동 수집 파이프라인 (매일 06:00 KST)
 *
 *  1 Source Check          6 Categorization
 *  2 New Article Collection 7 Scoring
 *  3 Duplicate Detection    8 Keyword Extraction
 *  4 AI Summarization       9 Database Insert
 *  5 Translation           10 Dashboard Refresh
 *                          11 Daily Executive Brief Generation
 */

export interface SourceOutcome {
  sourceId: string
  sourceName: string
  ok: boolean
  found: number
  inserted: number
  message?: string
}

export interface RunReport {
  startedAt: string
  finishedAt: string
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED'
  mode: 'live' | 'dry-run'
  analyzer: string
  sourcesTried: number
  sourcesOk: number
  articlesFound: number
  articlesNew: number
  duplicates: number
  aiAnalyzed: number
  briefGenerated: boolean
  outcomes: SourceOutcome[]
  errors: string[]
}

interface Collected {
  sourceId: string
  sourceName: string
  title: string
  url: string
  publishedAt: string
  body: string
}

/** 1~2 — Source Check + New Article Collection */
async function collectFromSources(): Promise<{
  items: Collected[]
  outcomes: SourceOutcome[]
}> {
  const active = SOURCES.filter((s) => s.active && s.rssUrl)
  const items: Collected[] = []
  const outcomes: SourceOutcome[] = []

  const results = await Promise.all(
    active.map(async (source) => {
      const res = await fetchFeed(source.rssUrl!)
      return { source, res }
    }),
  )

  for (const { source, res } of results) {
    outcomes.push({
      sourceId: source.id,
      sourceName: source.name,
      ok: res.ok,
      found: res.items.length,
      inserted: 0,
      message: res.message,
    })
    for (const item of res.items) {
      if (!item.link || !item.title) continue
      items.push({
        sourceId: source.id,
        sourceName: source.name,
        title: item.title,
        url: item.link,
        publishedAt: item.publishedAt,
        body: item.summary || item.title,
      })
    }
  }

  // RSS 미제공 소스는 여기서 건너뛴다 (HTML 파서는 소스별 구현 필요).
  SOURCES.filter((s) => s.active && !s.rssUrl).forEach((s) =>
    outcomes.push({
      sourceId: s.id,
      sourceName: s.name,
      ok: false,
      found: 0,
      inserted: 0,
      message: 'RSS 미제공 — HTML 파서 미구현 (src/lib/collect 에 소스별 어댑터 추가 필요)',
    }),
  )

  return { items, outcomes }
}

/** 이미 저장된 기사인지 확인 (9 Database Insert 의 upsert 키) */
async function existingHashes(prisma: any, hashes: string[]): Promise<Set<string>> {
  if (!prisma || hashes.length === 0) return new Set()
  const rows = await prisma.article.findMany({
    where: { urlHash: { in: hashes } },
    select: { urlHash: true },
  })
  return new Set(rows.map((r: any) => r.urlHash))
}

/**
 * 파이프라인 실행.
 * dryRun=true 이면 수집·분석까지만 하고 DB 쓰기를 건너뛴다.
 */
export async function runPipeline(options: { dryRun?: boolean } = {}): Promise<RunReport> {
  const startedAt = new Date().toISOString()
  const errors: string[] = []
  const analyzer = getAnalyzer()
  const live = isLive() && !options.dryRun
  const prisma = live ? await getPrisma() : null

  const { items, outcomes } = await collectFromSources()

  // 3 — 이미 저장된 기사 제외
  const withHashes = await Promise.all(
    items.map(async (item) => ({ ...item, hash: await urlHash(item.url) })),
  )
  const seen = new Set<string>()
  const unique = withHashes.filter((i) => {
    if (seen.has(i.hash)) return false
    seen.add(i.hash)
    return true
  })
  const known = await existingHashes(prisma, unique.map((i) => i.hash))
  const fresh = unique.filter((i) => !known.has(i.hash))

  // 4~8 — AI 요약 · 번역 · 분류 · 스코어링 · 키워드 추출
  const analyzed: (NewsArticle & { urlHash: string; sourceId: string })[] = []
  let aiAnalyzed = 0

  for (const item of fresh) {
    const source = SOURCES.find((s) => s.id === item.sourceId)!
    try {
      const a = await analyzer.analyze({
        title: item.title,
        sourceName: source.name,
        sourceRegion: source.region,
        sourceCountry: source.country,
        publishedAt: item.publishedAt,
        url: item.url,
        body: item.body,
      })
      aiAnalyzed += 1

      // 신뢰도는 항상 소스 Tier 가 결정한다 (§26)
      const reliabilityScore = resolveReliability(source.name, a.source_reliability_score)
      const totalScore = computeTotalScore({
        businessImpactScore: a.business_impact_score,
        noveltyScore: a.novelty_score,
        marketScaleScore: a.market_scale_score,
        reliabilityScore,
        koreaRelevanceScore: a.korea_relevance_score,
      })

      analyzed.push({
        id: item.hash,
        urlHash: item.hash,
        sourceId: source.id,
        title: a.original_title || item.title,
        titleKo: a.korean_title || item.title,
        source: source.name,
        sourceUrl: source.url,
        articleUrl: item.url,
        publishedAt: item.publishedAt,
        collectedAt: new Date().toISOString(),
        region: a.region,
        country: a.country || source.country,
        category: a.category,
        secondaryCategories: a.secondary_categories.filter(
          (c): c is TrendCategory => typeof c === 'string',
        ) as TrendCategory[],
        brands: a.brands,
        keywords: a.keywords,
        originalSummary: item.body.slice(0, 4000),
        koreanSummary: a.summary_ko.slice(0, 3),
        trend: a.trend,
        whyItMatters: a.why_it_matters,
        koreaImplication: a.korea_implication,
        recommendedAction:
          a.recommended_action ??
          deriveRecommendedAction(a.korea_relevance_score, totalScore),
        trendScore: totalScore,
        businessImpactScore: a.business_impact_score,
        noveltyScore: a.novelty_score,
        marketScaleScore: a.market_scale_score,
        reliabilityScore,
        koreaRelevanceScore: a.korea_relevance_score,
        totalScore,
        sentiment: a.sentiment,
        isDuplicate: false,
      })
    } catch (err) {
      errors.push(
        `[analyze] ${source.name} — ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  // 3 — Duplicate Detection (신규 + 기존 최근 기사 대상)
  const recentExisting: NewsArticle[] = []
  if (prisma) {
    try {
      const since = new Date(Date.now() - 7 * 86_400_000)
      const rows = await prisma.article.findMany({
        where: { publishedAt: { gte: since } },
        include: { source: true, brands: { include: { brand: true } }, keywords: { include: { keyword: true } } },
      })
      rows.forEach((r: any) =>
        recentExisting.push({
          ...r,
          source: r.source?.name ?? '',
          publishedAt: r.publishedAt.toISOString(),
          collectedAt: r.collectedAt.toISOString(),
          brands: (r.brands ?? []).map((b: any) => b.brand.name),
          keywords: (r.keywords ?? []).map((k: any) => k.keyword.term),
        } as NewsArticle),
      )
    } catch (err) {
      errors.push(`[dedupe] 기존 기사 조회 실패 — ${String(err)}`)
    }
  }

  const flagged = markDuplicates([...recentExisting, ...analyzed])
  const flaggedNew = flagged.filter((a) => analyzed.some((n) => n.id === a.id))
  const duplicates = flaggedNew.filter((a) => a.isDuplicate).length

  // 9 — Database Insert
  let inserted = 0
  if (prisma) {
    for (const article of flaggedNew) {
      const origin = analyzed.find((a) => a.id === article.id)!
      try {
        await persistArticle(prisma, article, origin.urlHash, origin.sourceId)
        inserted += 1
        const outcome = outcomes.find((o) => o.sourceId === origin.sourceId)
        if (outcome) outcome.inserted += 1
      } catch (err) {
        errors.push(
          `[insert] ${article.title.slice(0, 60)} — ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  // 11 — Daily Executive Brief
  let briefGenerated = false
  if (prisma) {
    try {
      const all = markDuplicates([...recentExisting, ...flaggedNew])
      const brief = buildDailyBrief(all, new Date())
      await prisma.dailyBrief.upsert({
        where: { date: new Date(toDateKey(new Date())) },
        create: {
          date: new Date(toDateKey(new Date())),
          keyMessage: brief.keyMessage,
          koreaImplication: brief.koreaImplication,
          todayThree: brief.todayThree,
          payload: {
            asia: brief.asiaTop3.map((a) => a.id),
            europe: brief.europeTop3.map((a) => a.id),
            americas: brief.americasTop3.map((a) => a.id),
            global: brief.globalInsight.map((a) => a.id),
            menu: brief.menuTrend.map((a) => a.id),
            tech: brief.restaurantTech.map((a) => a.id),
            expansion: brief.expansion.map((a) => a.id),
          },
        },
        update: {
          keyMessage: brief.keyMessage,
          koreaImplication: brief.koreaImplication,
          todayThree: brief.todayThree,
          generatedAt: new Date(),
        },
      })
      briefGenerated = true
    } catch (err) {
      errors.push(`[brief] ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // 소스별 수집 로그 (§29)
  if (prisma) {
    try {
      await recordRun(prisma, outcomes, {
        found: unique.length,
        inserted,
        duplicates,
        aiAnalyzed,
        errors,
      })
    } catch (err) {
      errors.push(`[log] ${String(err)}`)
    }
  }

  const sourcesOk = outcomes.filter((o) => o.ok).length
  return {
    startedAt,
    finishedAt: new Date().toISOString(),
    status: sourcesOk === 0 ? 'FAILED' : errors.length > 0 ? 'PARTIAL' : 'SUCCESS',
    mode: live ? 'live' : 'dry-run',
    analyzer: analyzer.name,
    sourcesTried: outcomes.length,
    sourcesOk,
    articlesFound: unique.length,
    articlesNew: live ? inserted : flaggedNew.length,
    duplicates,
    aiAnalyzed,
    briefGenerated,
    outcomes,
    errors,
  }
}

async function persistArticle(
  prisma: any,
  article: NewsArticle,
  hash: string,
  sourceSlug: string,
) {
  const source = await prisma.source.findUnique({ where: { slug: sourceSlug } })
  if (!source) throw new Error(`Source '${sourceSlug}' 가 DB에 없습니다. seed 를 먼저 실행하세요.`)

  const published = new Date(article.publishedAt)
  const data = {
    urlHash: hash,
    title: article.title,
    titleKo: article.titleKo,
    articleUrl: article.articleUrl,
    publishedAt: published,
    region: article.region,
    country: article.country ?? null,
    category: article.category,
    secondaryCategories: article.secondaryCategories ?? [],
    originalSummary: article.originalSummary,
    koreanSummary: article.koreanSummary,
    trend: article.trend,
    whyItMatters: article.whyItMatters,
    koreaImplication: article.koreaImplication,
    recommendedAction: article.recommendedAction,
    sentiment: article.sentiment,
    businessImpactScore: article.businessImpactScore,
    noveltyScore: article.noveltyScore,
    marketScaleScore: article.marketScaleScore,
    reliabilityScore: article.reliabilityScore,
    koreaRelevanceScore: article.koreaRelevanceScore,
    trendScore: article.trendScore,
    totalScore: article.totalScore,
    isDuplicate: article.isDuplicate,
    duplicateGroupId: article.duplicateGroupId ?? null,
    sourceId: source.id,
    publishedDate: new Date(toDateKey(published)),
    publishedMonth: toDateKey(published).slice(0, 7),
    publishedYear: published.getFullYear(),
  }

  const saved = await prisma.article.upsert({
    where: { urlHash: hash },
    create: data,
    update: data,
  })

  for (const name of article.brands) {
    const brand = await prisma.brand.upsert({
      where: { normalized: name.toLowerCase() },
      create: { name, normalized: name.toLowerCase() },
      update: {},
    })
    await prisma.articleBrand.upsert({
      where: { articleId_brandId: { articleId: saved.id, brandId: brand.id } },
      create: { articleId: saved.id, brandId: brand.id },
      update: {},
    })
  }

  for (const term of article.keywords) {
    const keyword = await prisma.keyword.upsert({
      where: { normalized: term.toLowerCase() },
      create: { term, normalized: term.toLowerCase() },
      update: {},
    })
    await prisma.articleKeyword.upsert({
      where: { articleId_keywordId: { articleId: saved.id, keywordId: keyword.id } },
      create: { articleId: saved.id, keywordId: keyword.id },
      update: {},
    })
  }

  await prisma.source.update({
    where: { id: source.id },
    data: { articleCount: { increment: 1 }, lastSuccessAt: new Date() },
  })
}

async function recordRun(
  prisma: any,
  outcomes: SourceOutcome[],
  stats: {
    found: number
    inserted: number
    duplicates: number
    aiAnalyzed: number
    errors: string[]
  },
) {
  const run = await prisma.collectionRun.create({
    data: {
      finishedAt: new Date(),
      status:
        outcomes.every((o) => o.ok)
          ? 'SUCCESS'
          : outcomes.some((o) => o.ok)
            ? 'PARTIAL'
            : 'FAILED',
      sourcesTried: outcomes.length,
      sourcesOk: outcomes.filter((o) => o.ok).length,
      articlesFound: stats.found,
      articlesNew: stats.inserted,
      duplicates: stats.duplicates,
      aiAnalyzed: stats.aiAnalyzed,
      errorLog: stats.errors.length ? stats.errors.join('\n') : null,
    },
  })

  for (const outcome of outcomes) {
    const source = await prisma.source.findUnique({ where: { slug: outcome.sourceId } })
    if (!source) continue
    await prisma.crawlEvent.create({
      data: {
        runId: run.id,
        sourceId: source.id,
        ok: outcome.ok,
        itemsFound: outcome.found,
        itemsNew: outcome.inserted,
        message: outcome.message ?? null,
      },
    })
    await prisma.source.update({
      where: { id: source.id },
      data: { lastCrawledAt: new Date() },
    })
  }
}
