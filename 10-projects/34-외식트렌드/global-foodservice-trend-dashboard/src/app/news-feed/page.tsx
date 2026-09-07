import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { FilterBar } from '@/components/news/filter-bar'
import { ArticleBriefList } from '@/components/news/article-brief'
import { ExportButton } from '@/components/dashboard/export-button'
import { Card, CardHeader } from '@/components/ui/primitives'
import { filterArticles } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { SOURCES } from '@/lib/sources'
import type { ArticleFilters, DateRangeKey, Region, TrendCategory } from '@/lib/types'
import { now, uniq } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'News Feed — Global Foodservice Trend Intelligence' }

type SP = Record<string, string | string[] | undefined>

function one(sp: SP, key: string): string | undefined {
  const v = sp[key]
  return Array.isArray(v) ? v[0] : v
}

export default async function NewsFeedPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const sp = await searchParams
  const articles = await getArticles()

  const filters: ArticleFilters = {
    q: one(sp, 'q'),
    region: (one(sp, 'region') as Region | undefined) ?? 'ALL',
    country: one(sp, 'country'),
    category: (one(sp, 'category') as TrendCategory | undefined) ?? 'ALL',
    brand: one(sp, 'brand'),
    source: one(sp, 'source'),
    minScore: one(sp, 'minScore') ? Number(one(sp, 'minScore')) : undefined,
    range: (one(sp, 'range') as DateRangeKey | undefined) ?? '7D',
    from: one(sp, 'from'),
    to: one(sp, 'to'),
    includeDuplicates: one(sp, 'dupes') === '1',
  }

  const results = filterArticles(articles, filters, now())
  // 카드형 목록은 한 화면에 100건까지만. 나머지는 필터로 좁혀 본다.
  const LIMIT = 100
  const shown = results.slice(0, LIMIT)

  const countries = uniq(articles.map((a) => a.country ?? '').filter(Boolean)).sort()
  const brands = uniq(articles.flatMap((a) => a.brands)).sort()
  const sources = uniq([...SOURCES.map((s) => s.name), ...articles.map((a) => a.source)]).sort()

  const exportQuery = new URLSearchParams()
  Object.entries(sp).forEach(([k, v]) => {
    const value = Array.isArray(v) ? v[0] : v
    if (value) exportQuery.set(k, value)
  })

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="NEWS FEED"
        title="전체 기사 검색"
        description="기사마다 요약 두 줄과 [원문] 버튼만 둡니다. 한국어로 보려면 상단바의 '한국어 번역'을 누르세요."
        action={<ExportButton resource="articles" query={exportQuery.toString()} />}
      />

      <Suspense fallback={<div className="h-14 border-b border-line bg-white" />}>
        <FilterBar countries={countries} brands={brands} sources={sources} />
      </Suspense>

      <div className="p-4">
        <Card>
          <CardHeader
            title="검색 결과"
            subtitle={
              results.length > LIMIT
                ? `${results.length}건 중 최신 ${LIMIT}건 표시 — 더 좁히려면 위 필터를 쓰세요 (보관 ${articles.length}건)`
                : `${results.length}건 / 보관 ${articles.length}건`
            }
          />
          <ArticleBriefList articles={shown} empty="조건에 맞는 기사가 없습니다." />
        </Card>
      </div>
    </div>
  )
}
