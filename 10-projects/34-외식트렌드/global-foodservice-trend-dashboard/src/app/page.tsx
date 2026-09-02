import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { TopTable } from '@/components/news/article-table'
import { Card, CardBody, CardHeader, Empty } from '@/components/ui/primitives'
import {
  CategoryBarChart,
  KeywordTimelineChart,
  RegionBarChart,
  ScoreDistributionChart,
} from '@/components/charts'
import {
  categoryCounts,
  computeKpis,
  keywordTimeline,
  keywordTrends,
  regionCounts,
  regionSummary,
  scoreDistribution,
  todayTop,
} from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import { dataMode } from '@/lib/db'
import { DEMO_NOTICE } from '@/lib/data/demo'
import { now, pct } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const articles = await getArticles()
  const reference = now()

  const kpis = computeKpis(articles, reference)
  const top10 = todayTop(articles, 10, reference)
  const radar = keywordTrends(articles, reference).slice(0, 8)
  const timeline = keywordTimeline(articles, reference)
  const regions = REGION_ORDER.map((r) => regionSummary(articles, r, reference))

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="EXECUTIVE DASHBOARD"
        title="오늘의 글로벌 외식 인텔리전스"
        description="상단 KPI → 핵심 뉴스 TOP 10 → 트렌드 → 지역별 분석 순으로 3분 안에 오늘의 변화를 파악합니다."
        action={
          <Link
            href="/daily-brief"
            className="inline-flex h-7 items-center rounded-sm border border-navy-800 bg-navy-800 px-3 text-[11px] font-medium text-white hover:bg-navy-700"
          >
            Daily Brief 열기
          </Link>
        }
      />

      <div className="space-y-3 p-4">
        {dataMode() === 'demo' ? (
          <p className="rounded-sm border border-blue-accent/30 bg-blue-soft px-3 py-1.5 text-[11px] text-navy-800">
            {DEMO_NOTICE} 실데이터 연결 방법은 <code className="font-mono">README.md</code> 를
            참고하세요.
          </p>
        ) : null}

        {/* 1. KPI */}
        <KpiCards kpis={kpis} />

        {/* 2. 핵심 뉴스 */}
        <Card>
          <CardHeader
            title="Today's Global Trend TOP 10"
            subtitle="Total Score · 신선도 · 지역 중요도 · 한국 적용 가능성을 종합한 순위"
            action={
              <Link href="/news-feed" className="text-[11px] text-blue-accent hover:underline">
                전체 기사 →
              </Link>
            }
          />
          <TopTable articles={top10} />
        </Card>

        {/* 3. 트렌드 */}
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.35fr_1fr]">
          <Card>
            <CardHeader
              title="Trend Radar — 급상승 키워드"
              subtitle="최근 30일 언급량 기준, 7일 성장률 순"
              action={
                <Link href="/trend-radar" className="text-[11px] text-blue-accent hover:underline">
                  상세 →
                </Link>
              }
            />
            <CardBody className="px-0 py-0">
              {radar.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {radar.map((k) => (
                    <li
                      key={k.keyword}
                      className="flex items-center gap-3 px-4 py-1.5 text-[12px]"
                    >
                      <span className="w-[150px] shrink-0 font-medium text-navy-800">
                        {k.keyword}
                        <span className="ml-1 text-[10px] text-muted">{k.labelKo}</span>
                      </span>
                      <span className="w-14 shrink-0 text-right text-muted tabular">
                        {k.mentions30d}건
                      </span>
                      <span className="w-16 shrink-0 text-right font-medium text-navy-700 tabular">
                        {pct(k.growth7d)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10.5px] text-muted">
                        {REGION_ORDER.filter((r) => k.regionDistribution[r] > 0)
                          .map((r) => `${r} ${k.regionDistribution[r]}`)
                          .join(' · ')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="30일 키워드 변화" subtitle="상위 5개 키워드 · 주 단위 언급량" />
            <CardBody>
              <KeywordTimelineChart keys={timeline.keys} rows={timeline.rows} />
            </CardBody>
          </Card>
        </div>

        {/* 4. 지역별 분석 */}
        <Card>
          <CardHeader
            title="Region Snapshot"
            subtitle="최근 30일 기준 지역별 기사량 · 오늘의 최상위 뉴스"
          />
          <div className="grid grid-cols-1 divide-y divide-line md:grid-cols-2 md:divide-y-0 xl:grid-cols-4 xl:divide-x">
            {regions.map((r) => (
              <div key={r.region} className="px-4 py-3">
                <div className="flex items-baseline justify-between">
                  <Link
                    href={`/${r.region.toLowerCase()}`}
                    className="text-[12px] font-semibold text-navy-800 hover:text-blue-accent"
                  >
                    {r.region}
                    <span className="ml-1 text-[10px] font-normal text-muted">
                      {REGION_LABEL_KO[r.region]}
                    </span>
                  </Link>
                  <span className="text-[11px] text-muted tabular">
                    오늘 {r.today} / 30일 {r.total}
                  </span>
                </div>
                {r.top5[0] ? (
                  <Link
                    href={`/article/${r.top5[0].id}`}
                    className="mt-1.5 block text-[11.5px] font-medium leading-snug text-navy-700 hover:text-blue-accent"
                  >
                    {r.top5[0].titleKo}
                  </Link>
                ) : (
                  <p className="mt-1.5 text-[11px] text-muted">해당 기간 기사 없음</p>
                )}
                <p className="mt-1.5 line-clamp-2 text-[10.5px] leading-relaxed text-muted">
                  {r.keywords
                    .slice(0, 5)
                    .map((k) => k.term)
                    .join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </Card>

        {/* 5. 시각화 */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <Card>
            <CardHeader title="Region별 기사량" subtitle="최근 30일" />
            <CardBody>
              <RegionBarChart data={regionCounts(articles, reference)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Trend Score 분포" subtitle="전체 기사" />
            <CardBody>
              <ScoreDistributionChart data={scoreDistribution(articles)} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Category별 기사량" subtitle="최근 30일" />
            <CardBody>
              <CategoryBarChart data={categoryCounts(articles, reference).slice(0, 9)} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  )
}
