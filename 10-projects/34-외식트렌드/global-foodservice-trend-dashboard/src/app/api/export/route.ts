import type { NextRequest } from 'next/server'
import { fail, filtersFromSearchParams } from '@/lib/api'
import {
  brandWatch,
  expansionRows,
  filterArticles,
  keywordTrends,
  menuTrends,
  techRows,
} from '@/lib/analytics'
import { getArticles, getSources } from '@/lib/repository'
import { CATEGORY_LABEL, EXPANSION_TYPE_LABEL, MENU_TYPE_LABEL, TECH_LABEL, scoreLabel } from '@/lib/categories'
import { toCsv, toExcelXml, type Row } from '@/lib/export'
import { now, toDateKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** §30 — CSV / Excel Export */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const resource = sp.get('resource') ?? 'articles'
  const format = sp.get('format') === 'xls' ? 'xls' : 'csv'
  const articles = await getArticles()

  let rows: Row[] = []

  switch (resource) {
    case 'articles': {
      const filtered = filterArticles(articles, filtersFromSearchParams(sp), now())
      rows = filtered.map((a) => ({
        id: a.id,
        publishedAt: a.publishedAt,
        region: a.region,
        country: a.country ?? '',
        source: a.source,
        category: CATEGORY_LABEL[a.category],
        titleKo: a.titleKo,
        title: a.title,
        trend: a.trend,
        brands: a.brands.join(' | '),
        keywords: a.keywords.join(' | '),
        summary1: a.koreanSummary[0] ?? '',
        summary2: a.koreanSummary[1] ?? '',
        summary3: a.koreanSummary[2] ?? '',
        whyItMatters: a.whyItMatters,
        koreaImplication: a.koreaImplication,
        recommendedAction: a.recommendedAction,
        totalScore: a.totalScore,
        scoreLabel: scoreLabel(a.totalScore),
        businessImpact: a.businessImpactScore,
        novelty: a.noveltyScore,
        marketScale: a.marketScaleScore,
        reliability: a.reliabilityScore,
        koreaRelevance: a.koreaRelevanceScore,
        sentiment: a.sentiment,
        isDuplicate: a.isDuplicate ? 'Y' : 'N',
        articleUrl: a.articleUrl,
      }))
      break
    }
    case 'trend-radar':
      rows = keywordTrends(articles, now()).map((k) => ({
        keyword: k.keyword,
        labelKo: k.labelKo,
        mentions30d: k.mentions30d,
        mentions7d: k.mentions7d,
        growth7dPct: k.growth7d,
        growth30dPct: k.growth30d,
        GLOBAL: k.regionDistribution.GLOBAL,
        ASIA: k.regionDistribution.ASIA,
        EUROPE: k.regionDistribution.EUROPE,
        AMERICAS: k.regionDistribution.AMERICAS,
        topBrands: k.topBrands.join(' | '),
      }))
      break
    case 'menu-trends':
      rows = menuTrends(articles, now()).map((m) => ({
        trendName: m.trendName,
        menuType: MENU_TYPE_LABEL[m.menuType],
        mentions: m.mentions,
        growthRatePct: m.growthRate,
        topCountries: m.topCountries.join(' | '),
        topBrands: m.topBrands.join(' | '),
        koreaOpportunity: m.koreaOpportunity,
      }))
      break
    case 'brand-watch':
      rows = brandWatch(articles).map((b) => ({
        brand: b.brand,
        newsCount: b.newsCount,
        newMarkets: b.newMarkets,
        newStores: b.newStores,
        newMenu: b.newMenu,
        franchise: b.franchise,
        investment: b.investment,
        mAndA: b.mAndA,
        technology: b.technology,
        topScore: b.topScore,
      }))
      break
    case 'restaurant-tech':
      rows = techRows(articles).map((t) => ({
        techCategory: TECH_LABEL[t.techCategory],
        vendor: t.vendor,
        adopterBrand: t.adopterBrand,
        region: t.region,
        country: t.country,
        purpose: t.purpose,
        expectedEffect: t.expectedEffect,
        headlineKo: t.headlineKo,
        publishedAt: t.publishedAt,
        totalScore: t.totalScore,
      }))
      break
    case 'expansion':
      rows = expansionRows(articles).map((e) => ({
        brand: e.brand,
        hqCountry: e.hqCountry,
        expansionCountry: e.expansionCountry,
        city: e.city,
        storeCount: e.storeCount ?? '',
        expansionType: EXPANSION_TYPE_LABEL[e.expansionType],
        ownership: e.ownership,
        announcementDate: e.announcementDate,
        source: e.source,
        headlineKo: e.headlineKo,
      }))
      break
    case 'sources': {
      const sources = await getSources()
      rows = sources.map((s) => ({
        name: s.name,
        region: s.region,
        country: s.country,
        url: s.url,
        rssUrl: s.rssUrl ?? '',
        reliabilityTier: s.reliabilityTier,
        active: s.active ? 'Y' : 'N',
        lastCrawledAt: s.lastCrawledAt ?? '',
        lastSuccessAt: s.lastSuccessAt ?? '',
        articleCount: s.articleCount,
        note: s.note ?? '',
      }))
      break
    }
    default:
      return fail(`알 수 없는 resource: ${resource}`)
  }

  const filename = `${resource}_${toDateKey(now())}.${format === 'xls' ? 'xls' : 'csv'}`
  const body = format === 'xls' ? toExcelXml(rows, resource) : toCsv(rows)
  const contentType =
    format === 'xls'
      ? 'application/vnd.ms-excel; charset=utf-8'
      : 'text/csv; charset=utf-8'

  return new Response(body, {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}
