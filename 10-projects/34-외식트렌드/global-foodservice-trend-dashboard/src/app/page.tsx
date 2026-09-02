import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { TopTable } from '@/components/news/article-table'
import {
  Card,
  CardBody,
  CardHeader,
  Empty,
  SectionTitle,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
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
        description="① 오늘 한눈에 → ② 핵심 뉴스 → ③ 트렌드 → ④ 지역별 → ⑤ 분포 순으로 읽으면 3분 안에 파악됩니다."
        action={
          <Link
            href="/daily-brief"
            className="inline-flex h-8 items-center rounded-sm border border-navy-800 bg-navy-800 px-3.5 text-[12px] font-semibold text-white hover:bg-navy-700"
          >
            Daily Brief 열기
          </Link>
        }
      />

      <div className="space-y-6 p-5">
        {dataMode() === 'demo' ? (
          <p className="rounded-sm border border-blue-accent/30 bg-blue-soft px-3.5 py-2 text-[12px] leading-relaxed text-navy-800">
            {DEMO_NOTICE} 실데이터 연결 방법은 <code className="font-mono">README.md</code> 를
            참고하세요.
          </p>
        ) : null}

        {/* ① 오늘 한눈에 */}
        <section className="space-y-2">
          <SectionTitle step="01" title="오늘 한눈에" ko="KPI" />
          <KpiCards kpis={kpis} />
        </section>

        {/* ② 핵심 뉴스 */}
        <section className="space-y-2">
          <SectionTitle
            step="02"
            title="오늘의 핵심 뉴스 TOP 10"
            ko="Today's Global Trend"
            action={
              <Link
                href="/news-feed"
                className="text-[12px] font-medium text-blue-accent hover:underline"
              >
                전체 기사 보기 →
              </Link>
            }
          />
          <Card>
            <TopTable articles={top10} />
          </Card>
        </section>

        {/* ③ 트렌드 */}
        <section className="space-y-2">
          <SectionTitle
            step="03"
            title="지금 뜨는 트렌드"
            ko="Trend Radar"
            action={
              <Link
                href="/trend-radar"
                className="text-[12px] font-medium text-blue-accent hover:underline"
              >
                레이더 상세 →
              </Link>
            }
          />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_1fr]">
            <Card>
              <CardHeader
                title="급상승 키워드"
                subtitle="최근 30일 언급량 · 직전 기간 대비 성장률"
              />
              {radar.length === 0 ? (
                <Empty />
              ) : (
                <TableWrap>
                  <Table>
                    <thead>
                      <tr>
                        <Th>키워드</Th>
                        <Th className="w-20 text-right">30일</Th>
                        <Th className="w-20 text-right">7일</Th>
                        <Th className="w-24 text-right">7일 성장</Th>
                        <Th className="w-[150px]">지역 분포</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {radar.map((k) => (
                        <tr key={k.keyword}>
                          <Td>
                            <span className="block text-[12.5px] font-semibold text-navy-800">
                              {k.keyword}
                            </span>
                            <span className="block text-[11px] text-muted">{k.labelKo}</span>
                          </Td>
                          <Td className="text-right text-[12.5px]">{k.mentions30d}</Td>
                          <Td className="text-right text-[12.5px]">{k.mentions7d}</Td>
                          <Td
                            className={
                              k.growth7d > 0
                                ? 'text-right text-[12.5px] font-semibold text-navy-800'
                                : 'text-right text-[12.5px] text-muted'
                            }
                          >
                            {pct(k.growth7d)}
                          </Td>
                          <Td className="text-[11px] leading-snug text-muted">
                            {REGION_ORDER.filter((r) => k.regionDistribution[r] > 0)
                              .map((r) => `${r} ${k.regionDistribution[r]}`)
                              .join(' · ') || '—'}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </TableWrap>
              )}
            </Card>

            <Card>
              <CardHeader
                title="30일 키워드 변화"
                subtitle="상위 5개 키워드 · 주 단위 언급량"
              />
              <CardBody>
                <KeywordTimelineChart keys={timeline.keys} rows={timeline.rows} />
              </CardBody>
            </Card>
          </div>
        </section>

        {/* ④ 지역별 */}
        <section className="space-y-2">
          <SectionTitle step="04" title="지역별 현황" ko="Region Snapshot" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {regions.map((r) => (
              <Card key={r.region}>
                <div className="flex items-baseline justify-between border-b border-line px-4 py-2.5">
                  <Link
                    href={`/${r.region.toLowerCase()}`}
                    className="text-[13.5px] font-bold text-navy-900 hover:text-blue-accent"
                  >
                    {r.region}
                    <span className="ml-1.5 text-[11.5px] font-normal text-muted">
                      {REGION_LABEL_KO[r.region]}
                    </span>
                  </Link>
                  <span className="text-[11.5px] text-muted tabular">
                    오늘 <b className="text-navy-800">{r.today}</b> · 30일 {r.total}
                  </span>
                </div>
                <div className="px-4 py-3">
                  {r.top5[0] ? (
                    <Link
                      href={`/article/${r.top5[0].id}`}
                      className="block text-[12.5px] font-semibold leading-snug text-navy-800 hover:text-blue-accent"
                    >
                      {r.top5[0].titleKo}
                    </Link>
                  ) : (
                    <p className="text-[12px] text-muted">해당 기간 기사 없음</p>
                  )}
                  {r.keywords.length ? (
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {r.keywords.slice(0, 4).map((k) => (
                        <span
                          key={k.term}
                          className="rounded-sm border border-line px-1.5 py-0.5 text-[10.5px] text-muted"
                        >
                          {k.term}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        </section>

        {/* ⑤ 분포 */}
        <section className="space-y-2">
          <SectionTitle step="05" title="분포 한눈에" ko="Distribution" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="지역별 기사량" subtitle="최근 30일" />
              <CardBody>
                <RegionBarChart data={regionCounts(articles, reference)} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="중요도 분포" subtitle="전체 기사 · Trend Score 구간" />
              <CardBody>
                <ScoreDistributionChart data={scoreDistribution(articles)} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="카테고리별 기사량" subtitle="최근 30일 · 상위 9개" />
              <CardBody>
                <CategoryBarChart data={categoryCounts(articles, reference).slice(0, 9)} />
              </CardBody>
            </Card>
          </div>
        </section>
      </div>
    </div>
  )
}
