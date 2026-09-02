import { Suspense } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { FilterBar } from '@/components/news/filter-bar'
import { FeedTable } from '@/components/news/article-table'
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
        description="브랜드 · 국가 · 제목 · 메뉴 · 카테고리 · 키워드 전 필드 검색. 기본은 대표 기사만."
        action={<ExportButton resource="articles" query={exportQuery.toString()} />}
      />

      <Suspense fallback={<div className="h-14 border-b border-line bg-white" />}>
        <FilterBar countries={countries} brands={brands} sources={sources} />
      </Suspense>

      <div className="p-4">
        <Card>
          <CardHeader
            title="Results"
            subtitle={`${results.length}건 / 전체 ${articles.length}건`}
          />
          <FeedTable articles={results} />
        </Card>
      </div>
    </div>
  )
}
