import Link from 'next/link'
import type { NewsArticle } from '@/lib/types'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardHeader, Empty } from '@/components/ui/primitives'
import { ActionTag, ScoreTag } from '@/components/news/bits'
import { PrintButton } from '@/components/dashboard/print-button'
import { ShareButton } from '@/components/dashboard/share-button'
import { buildDailyBrief } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { formatDate, now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Daily Brief — Global Foodservice Trend Intelligence' }

function BriefSection({
  heading,
  caption,
  articles,
}: {
  heading: string
  caption?: string
  articles: NewsArticle[]
}) {
  return (
    <section className="border-t border-line px-5 py-3 first:border-t-0">
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-[12.5px] font-bold tracking-tight text-navy-900">{heading}</h2>
        {caption ? <span className="text-[10.5px] text-muted">{caption}</span> : null}
      </div>
      {articles.length === 0 ? (
        <Empty>노출할 기사 없음</Empty>
      ) : (
        <ol className="space-y-2.5">
          {articles.map((a, i) => (
            <li key={a.id} className="flex gap-3">
              <span className="mt-0.5 w-4 shrink-0 text-[11px] font-semibold text-blue-accent tabular">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Link
                    href={`/article/${a.id}`}
                    className="text-[13.5px] font-bold leading-snug text-navy-800 hover:text-blue-accent"
                  >
                    {a.titleKo}
                  </Link>
                  <ScoreTag score={a.totalScore} />
                  <ActionTag action={a.recommendedAction} />
                </div>
                <p className="mt-0.5 text-[10.5px] text-muted">
                  {a.source} · {a.region}
                  {a.country ? ` · ${a.country}` : ''} · {formatDate(a.publishedAt)}
                </p>
                {a.koreanSummary.filter(Boolean).length > 0 ? (
                  <>
                    {a.titleKo === a.title ? (
                      <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                        원문 발췌 (번역 미적용)
                      </p>
                    ) : null}
                    <ul className="mt-1 space-y-0.5">
                      {a.koreanSummary.filter(Boolean).map((line, li) => (
                        <li key={li} className="text-[12.5px] leading-relaxed text-ink">
                          · <span data-tr>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {a.koreaImplication ? (
                  <p className="mt-1 border-l-2 border-blue-soft pl-2 text-[11.5px] leading-relaxed text-muted">
                    <span className="font-semibold text-navy-700">한국 적용</span> —{' '}
                    {a.koreaImplication}
                  </p>
                ) : null}
                <Link
                  href={`/article/${a.id}`}
                  className="no-print mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-medium text-blue-accent hover:underline"
                >
                  원문 · 번역 보기 →
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

export default async function DailyBriefPage() {
  const articles = await getArticles()
  const reference = now()
  const brief = buildDailyBrief(articles, reference)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="EXECUTIVE DAILY BRIEF"
        title={`GLOBAL FOODSERVICE DAILY BRIEF — ${brief.date}`}
        description="매일 자동 생성. 지역별 3건 + 글로벌 2건, 총 10~12건."
        action={
          <div className="flex items-center gap-2">
            <ShareButton
              title={`글로벌 외식 데일리 브리프 ${brief.date}`}
              text="오늘 글로벌 외식업의 핵심 변화 요약"
              path="/daily-brief"
            />
            <PrintButton />
          </div>
        }
      />

      <div className="p-4">
        <Card className="mx-auto max-w-5xl">
          <CardHeader
            title="Today's Key Message"
            subtitle="오늘 가장 중요한 변화 3줄"
          />
          <ol className="space-y-1.5 px-5 py-3">
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

          <BriefSection heading="ASIA TOP 3" articles={brief.asiaTop3} />
          <BriefSection heading="EUROPE TOP 3" articles={brief.europeTop3} />
          <BriefSection heading="AMERICAS TOP 3" articles={brief.americasTop3} />
          <BriefSection
            heading="GLOBAL DATA INSIGHT"
            caption="시장 지표 · 소비자 조사"
            articles={brief.globalInsight}
          />
          <BriefSection heading="MENU TREND" articles={brief.menuTrend} />
          <BriefSection heading="RESTAURANT TECH" articles={brief.restaurantTech} />
          <BriefSection heading="EXPANSION / FRANCHISE" articles={brief.expansion} />

          {brief.koreaImplication.length > 0 ? (
            <section className="border-t border-line px-5 py-3">
              <h2 className="mb-2 text-[12.5px] font-bold tracking-tight text-navy-900">
                KOREA IMPLICATION
              </h2>
              <ul className="space-y-1">
                {brief.koreaImplication.map((k, i) => (
                  <li key={i} className="text-[11.5px] leading-relaxed text-ink">
                    · {k}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="border-t-2 border-navy-800 bg-canvas px-5 py-4">
            <h2 className="mb-2 text-[13px] font-bold tracking-tight text-navy-900">
              한국 외식기업이 오늘 확인해야 할 3가지
            </h2>
            <ol className="space-y-2">
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
          </section>
        </Card>
      </div>
    </div>
  )
}
