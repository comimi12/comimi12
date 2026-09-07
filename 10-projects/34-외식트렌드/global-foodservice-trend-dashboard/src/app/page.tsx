import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { KpiCards } from '@/components/dashboard/kpi-cards'
import { ArticleBriefList } from '@/components/news/article-brief'
import { PrintButton } from '@/components/dashboard/print-button'
import { ShareButton } from '@/components/dashboard/share-button'
import { Card, CardHeader, Empty, SectionTitle } from '@/components/ui/primitives'
import {
  buildDailyBrief,
  computeKpis,
  koreaSummary,
  koreaTop,
  regionSummary,
  todayTop,
} from '@/lib/analytics'
import { dataSourceMeta, getArticles } from '@/lib/repository'
import { REGION_LABEL_KO } from '@/lib/categories'
import { DEMO_NOTICE } from '@/lib/data/demo'
import { formatDate, now } from '@/lib/utils'
import type { NewsArticle, Region } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * 대시보드 = 데일리 브리프 (하나로 합친 오늘의 화면).
 *
 * KPI → 오늘의 요약 → 핵심 뉴스 TOP 10 → 지역별 TOP 3 → 주제별 순으로 읽는다.
 * 기사마다 요약 · [원문] 버튼이 있고, 상단바 '한국어 번역'이 화면 전체를 번역한다.
 */
export default async function DashboardPage() {
  const articles = await getArticles()
  const reference = now()

  const kpis = computeKpis(articles, reference)
  const brief = buildDailyBrief(articles, reference)
  const top10 = todayTop(articles, 10, reference)
  const meta = dataSourceMeta()

  // 한국 → 아시아 → 미주 → 유럽 순. GLOBAL 은 기사가 있을 때만 붙인다.
  const korea = koreaSummary(articles, reference)
  const regionBlocks: {
    key: string
    title: string
    href: string
    caption: string
    articles: NewsArticle[]
  }[] = [
    {
      key: 'KOREA',
      title: 'KOREA · 한국',
      href: '/korea',
      caption: `오늘 ${korea.today}건 · 30일 ${korea.total30d}건 · 해외 보도 ${korea.overseas.length}건`,
      articles: koreaTop(articles, 3, reference),
    },
    ...(
      [
        ['ASIA', brief.asiaTop3],
        ['AMERICAS', brief.americasTop3],
        ['EUROPE', brief.europeTop3],
        ['GLOBAL', brief.globalInsight],
      ] as [Region, NewsArticle[]][]
    )
      .filter(([region, list]) => region !== 'GLOBAL' || list.length > 0)
      .map(([region, list]) => {
        const summary = regionSummary(articles, region, reference)
        return {
          key: region,
          title: `${region} · ${REGION_LABEL_KO[region]}`,
          href: `/${region.toLowerCase()}`,
          caption: `오늘 ${summary.today}건 · 30일 ${summary.total}건`,
          articles: list,
        }
      }),
  ]

  const topicBlocks = [
    { title: '메뉴 트렌드', href: '/menu-trends', articles: brief.menuTrend },
    { title: '레스토랑 테크', href: '/restaurant-tech', articles: brief.restaurantTech },
    { title: '출점 · 프랜차이즈', href: '/expansion', articles: brief.expansion },
  ]

  // 무료 수집 모드: 실기사이지만 AI 번역이 없는 상태
  const untranslated =
    meta.source === 'collected' && articles.every((a) => a.titleKo === a.title)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="EXECUTIVE DASHBOARD · DAILY BRIEF"
        title={`오늘의 글로벌 외식 브리프 — ${brief.date}`}
        description="매일 09:00 자동 갱신. 요약 → 핵심 뉴스 → 지역 → 주제 순으로 3분. 기사마다 [원문] 버튼이 있고, 상단바 '한국어 번역'으로 이 화면 전체를 번역합니다."
        action={
          <div className="flex items-center gap-2">
            <ShareButton
              title={`글로벌 외식 브리프 ${brief.date}`}
              text="오늘 글로벌 외식업의 핵심 변화 요약"
              path="/"
            />
            <PrintButton />
          </div>
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
            한국어 번역·요약 없음. 요약은 원문 발췌이고, 중요도 점수는 본문 분석 없이 산출돼
            참고용입니다.
          </p>
        ) : null}

        {/* ① KPI */}
        <section className="space-y-2">
          <SectionTitle step="01" title="오늘 한눈에" ko="KPI" />
          <KpiCards kpis={kpis} />
        </section>

        {/* ② 오늘의 요약 */}
        <section className="space-y-2">
          <SectionTitle step="02" title="오늘의 요약" ko="Key Message" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader title="오늘 가장 중요한 변화" subtitle="상위 3건" />
              <ol className="space-y-1.5 px-4 py-3">
                {brief.keyMessage.length === 0 ? (
                  <Empty />
                ) : (
                  brief.keyMessage.map((m, i) => (
                    <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink">
                      <span className="font-semibold text-blue-accent tabular">{i + 1}.</span>
                      <span data-tr>{m}</span>
                    </li>
                  ))
                )}
              </ol>
            </Card>

            <Card>
              <CardHeader
                title="한국 외식기업이 오늘 확인할 3가지"
                subtitle="적용 관점 정리"
              />
              <ol className="space-y-2 px-4 py-3">
                {brief.todayThree.length === 0 ? (
                  <Empty />
                ) : (
                  brief.todayThree.map((t, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-sm bg-navy-800 text-[11px] font-bold text-white">
                        {i + 1}
                      </span>
                      <span data-tr className="text-[12px] leading-relaxed text-ink">
                        {t}
                      </span>
                    </li>
                  ))
                )}
              </ol>
            </Card>
          </div>
        </section>

        {/* ③ 핵심 뉴스 */}
        <section className="space-y-2">
          <SectionTitle
            step="03"
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

        {/* ④ 지역별 */}
        <section className="space-y-2">
          <SectionTitle step="04" title="한국 · 지역별 TOP 3" ko="Country & Region Brief" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {regionBlocks.map((b) => (
              <Card key={b.key}>
                <CardHeader
                  title={b.title}
                  subtitle={b.caption}
                  action={
                    <Link href={b.href} className="text-[11px] text-blue-accent hover:underline">
                      탭 열기 →
                    </Link>
                  }
                />
                <ArticleBriefList articles={b.articles} rank empty="오늘 노출할 기사 없음" />
              </Card>
            ))}
          </div>
        </section>

        {/* ⑤ 주제별 */}
        <section className="space-y-2">
          <SectionTitle step="05" title="주제별" ko="Menu · Tech · Expansion" />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {topicBlocks.map((t) => (
              <Card key={t.title}>
                <CardHeader
                  title={t.title}
                  action={
                    <Link
                      href={t.href}
                      className="text-[11px] text-blue-accent hover:underline"
                    >
                      상세 →
                    </Link>
                  }
                />
                <ArticleBriefList articles={t.articles} empty="오늘 해당 기사 없음" />
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
