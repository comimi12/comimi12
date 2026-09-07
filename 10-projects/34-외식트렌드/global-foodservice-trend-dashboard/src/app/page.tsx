import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { ArticleBriefList } from '@/components/news/article-brief'
import { Card, SectionTitle } from '@/components/ui/primitives'
import { computeKpis, regionSummary, todayTop } from '@/lib/analytics'
import { dataSourceMeta, getArticles } from '@/lib/repository'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import { DEMO_NOTICE } from '@/lib/data/demo'
import { formatDate, now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const articles = await getArticles()
  const reference = now()

  const kpis = computeKpis(articles, reference)
  const top10 = todayTop(articles, 10, reference)
  const regions = REGION_ORDER.map((r) => regionSummary(articles, r, reference))
  const meta = dataSourceMeta()
  // 무료 수집 모드: 실기사이지만 AI 번역이 없는 상태
  const untranslated =
    meta.source === 'collected' && articles.every((a) => a.titleKo === a.title)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="EXECUTIVE DASHBOARD"
        title="오늘의 글로벌 외식 인텔리전스"
        description="KPI → 핵심 뉴스 → 지역 순으로 3분. 기사마다 요약과 [원문] 버튼이 있고, 상단바 '한국어 번역'으로 화면 전체를 번역합니다."
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
        {meta.source === 'demo' ? (
          <p className="rounded-sm border border-blue-accent/30 bg-blue-soft px-3.5 py-2 text-[12px] leading-relaxed text-navy-800">
            {DEMO_NOTICE} 실데이터 연결 방법은 <code className="font-mono">README.md</code> 를
            참고하세요.
          </p>
        ) : untranslated ? (
          <p className="rounded-sm border border-line bg-canvas px-3.5 py-2 text-[12px] leading-relaxed text-ink">
            <b className="text-navy-800">원문 수집 모드</b> · 매일 09:00 자동 수집 · 실기사{' '}
            {meta.count}건
            {meta.generatedAt ? (
              <span className="text-muted"> · 최근 수집 {formatDate(meta.generatedAt)}</span>
            ) : null}
            <br />
            한국어 번역·요약 없음. 제목 클릭 시 원문. 중요도 점수는 본문 분석 없이 산출돼 참고용.
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
            <ArticleBriefList articles={top10} rank />
          </Card>
        </section>

        {/* ③ 지역별 */}
        <section className="space-y-2">
          <SectionTitle step="03" title="지역별 현황" ko="Region Snapshot" />
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
                      <span data-tr>{r.top5[0].titleKo}</span>
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

      </div>
    </div>
  )
}
