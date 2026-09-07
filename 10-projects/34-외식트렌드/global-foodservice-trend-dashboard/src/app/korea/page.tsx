import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { RegionTabs } from '@/components/layout/region-tabs'
import { Card, CardBody, CardHeader, Empty } from '@/components/ui/primitives'
import { ArticleBriefList } from '@/components/news/article-brief'
import { getArticles, getSources } from '@/lib/repository'
import { koreaSummary } from '@/lib/analytics'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: '한국 — Global Foodservice Trend Intelligence' }

/** 국가별 탭 — 한국. 국내 매체 기사 + 해외 매체의 한국 관련 보도. */
export default async function KoreaPage() {
  const [articles, sources] = await Promise.all([getArticles(), getSources()])
  const summary = koreaSummary(articles, now())

  const krSources = sources.filter((s) => s.country === 'KR' && s.rssUrl)

  const tiles = [
    { label: '오늘 국내 기사', value: summary.today },
    { label: '30일 국내 기사', value: summary.total30d },
    { label: '국내 매체', value: krSources.length },
    { label: '해외의 한국 보도', value: summary.overseas.length },
  ]

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="COUNTRY · KOREA"
        title="한국 대시보드"
        description="국내 외식 전문지 기사와, 해외 매체가 다룬 한국 관련 보도를 함께 봅니다. 국내 기사는 아시아 탭에도 함께 집계됩니다."
      />
      <RegionTabs />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="bg-white px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {t.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-navy-900 tabular">
                {t.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
          <Card>
            <CardHeader
              title="국내 매체 기사"
              subtitle={
                krSources.length
                  ? `${krSources.map((s) => s.name).join(' · ')} · 최근순 ${summary.domestic.length}건`
                  : '국내 매체 미등록'
              }
              action={
                <Link
                  href="/news-feed?country=KR&range=ALL"
                  className="text-[11px] text-blue-accent hover:underline"
                >
                  필터로 열기 →
                </Link>
              }
            />
            <ArticleBriefList
              articles={summary.domestic.slice(0, 30)}
              empty="국내 매체 기사가 아직 수집되지 않았습니다."
            />
          </Card>

          <Card>
            <CardHeader title="카테고리 분포" subtitle="국내 기사 최근 30일" />
            <CardBody className="px-0 py-0">
              {summary.categories.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {summary.categories.map((c) => (
                    <li
                      key={c.category}
                      className="flex items-center justify-between gap-3 px-4 py-1.5"
                    >
                      <Link
                        href={`/news-feed?category=${c.category}&country=KR&range=ALL`}
                        className="min-w-0 truncate text-[11.5px] font-medium text-navy-800 hover:text-blue-accent"
                      >
                        {c.label}
                      </Link>
                      <span className="shrink-0 text-[11px] text-muted tabular">{c.count}건</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="해외 매체의 한국 관련 보도"
            subtitle="제목에 한국·서울·K-Food 가 등장하는 해외 기사"
          />
          <ArticleBriefList
            articles={summary.overseas.slice(0, 20)}
            empty="최근 해외 매체의 한국 관련 보도가 없습니다."
          />
        </Card>
      </div>
    </div>
  )
}
