import Link from 'next/link'
import type { Region } from '@/lib/types'
import { PageHeader } from '@/components/layout/page-header'
import { RegionTabs } from '@/components/layout/region-tabs'
import { Card, CardBody, CardHeader, Empty } from '@/components/ui/primitives'
import { CompactList, FeedTable } from '@/components/news/article-table'
import { CategoryBarChart } from '@/components/charts'
import { getArticles } from '@/lib/repository'
import { keywordTrends, regionSummary } from '@/lib/analytics'
import { REGION_LABEL_KO } from '@/lib/categories'
import { now, pct } from '@/lib/utils'

const DESCRIPTION: Record<Region, string> = {
  GLOBAL: '국가 단위를 넘는 시장 지표, 소비자 조사, 글로벌 메뉴 트래킹.',
  ASIA: '일본·중국·동남아 시장 지표, 브랜드 확장, 메뉴 동향.',
  EUROPE: '영국·EU 실적, 규제, 매장 포맷 변화.',
  AMERICAS: '미국·캐나다·브라질 QSR·패스트캐주얼·풀서비스 동향.',
}

/** §11 — Region Dashboard (4개 탭 공용 본문) */
export async function RegionDashboard({ region }: { region: Region }) {
  const articles = await getArticles()
  const reference = now()
  const summary = regionSummary(articles, region, reference)
  const radar = keywordTrends(
    articles.filter((a) => a.region === region),
    reference,
  ).slice(0, 8)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow={`REGION · ${region}`}
        title={`${region} 대시보드`}
        description={DESCRIPTION[region]}
      />
      <RegionTabs />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            { label: '오늘 기사', value: summary.today },
            { label: '30일 기사', value: summary.total },
            { label: '추적 브랜드', value: summary.brands.length },
            { label: '활성 카테고리', value: summary.categories.length },
          ].map((s) => (
            <div key={s.label} className="bg-white px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {s.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-navy-900 tabular">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader
              title={`Today TOP 5 — ${REGION_LABEL_KO[region]}`}
              subtitle="랭킹 점수 상위 5건"
            />
            <CompactList articles={summary.top5} />
          </Card>

          <Card>
            <CardHeader title="Trending Keywords" subtitle="최근 30일 언급량, 7일 증감" />
            <CardBody className="px-0 py-0">
              {radar.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {radar.map((k) => (
                    <li key={k.keyword} className="flex items-center gap-3 px-4 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-navy-800">
                        {k.keyword}
                        <span className="ml-1 text-[10px] font-normal text-muted">
                          {k.labelKo}
                        </span>
                      </span>
                      <span className="w-12 shrink-0 text-right text-[11px] text-muted tabular">
                        {k.mentions30d}건
                      </span>
                      <span className="w-14 shrink-0 text-right text-[11px] font-medium text-navy-700 tabular">
                        {pct(k.growth7d)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
          <Card>
            <CardHeader title="Top Brands Mentioned" subtitle="최근 30일" />
            <CardBody className="px-0 py-0">
              {summary.brands.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {summary.brands.map((b) => (
                    <li
                      key={b.brand}
                      className="flex items-center justify-between px-4 py-1.5 text-[11.5px]"
                    >
                      <Link
                        href={`/brand-watch?brand=${encodeURIComponent(b.brand)}`}
                        className="truncate font-medium text-navy-800 hover:text-blue-accent"
                      >
                        {b.brand}
                      </Link>
                      <span className="text-muted tabular">{b.count}건</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader title="Category Distribution" subtitle="최근 30일, 보조 카테고리 포함" />
            <CardBody>
              {summary.categories.length === 0 ? (
                <Empty />
              ) : (
                <CategoryBarChart data={summary.categories} />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <Card>
            <CardHeader title="New Restaurant Concepts" subtitle="디자인/콘셉트 카테고리" />
            <CompactList articles={summary.concepts} />
          </Card>
          <Card>
            <CardHeader title="Expansion / Franchise News" subtitle="출점·프랜차이즈 카테고리" />
            <CompactList articles={summary.expansion} />
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Recent News Feed"
            subtitle={`${region} 최근 기사 ${summary.recent.length}건`}
            action={
              <Link
                href={`/news-feed?region=${region}`}
                className="text-[11px] text-blue-accent hover:underline"
              >
                필터로 열기 →
              </Link>
            }
          />
          <FeedTable articles={summary.recent} />
        </Card>
      </div>
    </div>
  )
}
