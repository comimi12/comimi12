import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardHeader, Label } from '@/components/ui/primitives'
import { TierTag } from '@/components/news/bits'
import { ArticleBriefList } from '@/components/news/article-brief'
import { OriginalTranslation } from '@/components/news/original-translation'
import { ShareButton } from '@/components/dashboard/share-button'
import { getArticleById, getArticles } from '@/lib/repository'
import { relatedInGroup } from '@/lib/dedupe'
import { CATEGORY_LABEL, REGION_LABEL_KO } from '@/lib/categories'
import { SCORE_WEIGHTS } from '@/lib/scoring'
import { dataMode } from '@/lib/db'
import { formatDateTime } from '@/lib/utils'
import { cleanSummaryLines } from '@/lib/summary'

export const dynamic = 'force-dynamic'

/**
 * 뉴스 상세 — ① 상단 요약 ② 원문 접속 ③ 번역 3가지만 앞에 두고,
 * 점수·분류 등 부가 분석은 접어둔다.
 */
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  const all = await getArticles()
  const sameEvent = relatedInGroup(article, all)

  const relatedByKeyword = all
    .filter(
      (a) =>
        a.id !== article.id &&
        !sameEvent.some((s) => s.id === a.id) &&
        !a.isDuplicate &&
        a.keywords.some((k) => article.keywords.includes(k)),
    )
    .slice(0, 5)

  // AI 번역이 적용된 기사인지 — 한국어 제목이 원문과 다르고 요약이 있으면 번역본으로 본다.
  const translated =
    article.koreanSummary.filter(Boolean).length > 0 && article.titleKo !== article.title

  const summaryLines = cleanSummaryLines(article.koreanSummary)
  const summaryText = summaryLines.length
    ? summaryLines
    : cleanSummaryLines([article.originalSummary ?? ''])

  const scoreRows = [
    { label: 'Business Impact', value: article.businessImpactScore, weight: SCORE_WEIGHTS.businessImpact },
    { label: 'Novelty', value: article.noveltyScore, weight: SCORE_WEIGHTS.novelty },
    { label: 'Market Scale', value: article.marketScaleScore, weight: SCORE_WEIGHTS.marketScale },
    { label: 'Source Reliability', value: article.reliabilityScore, weight: SCORE_WEIGHTS.sourceReliability },
    { label: 'Korea Relevance', value: article.koreaRelevanceScore, weight: SCORE_WEIGHTS.koreaRelevance },
  ]

  const hasExtra =
    Boolean(article.trend || article.whyItMatters || article.koreaImplication) ||
    article.keywords.length > 0 ||
    Boolean(article.expansion || article.tech || article.menu)

  return (
    <div className="min-h-full p-4">
      <div className="mx-auto max-w-4xl space-y-3">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/news-feed"
            className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-navy-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            전체 기사로
          </Link>
          <ShareButton
            title={article.titleKo}
            text={`${article.titleKo} — ${article.source}`}
            path={`/article/${article.id}`}
          />
        </div>

        <Card>
          {/* 제목 · 메타 */}
          <div className="border-b border-line px-5 py-4">
            <h1
              data-tr
              className="text-[19px] font-bold leading-snug tracking-tight text-navy-900"
            >
              {article.titleKo}
            </h1>
            {article.titleKo !== article.title ? (
              <p className="mt-1 text-[13px] leading-snug text-muted">{article.title}</p>
            ) : null}

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
              <span className="font-medium text-navy-700">{article.source}</span>
              <TierTag source={article.source} />
              <span>{formatDateTime(article.publishedAt)}</span>
              <span>
                {REGION_LABEL_KO[article.region]}
                {article.country ? ` · ${article.country}` : ''}
              </span>
              <Label className="border-line text-navy-700">
                {CATEGORY_LABEL[article.category]}
              </Label>
              <span>중요도 {article.totalScore}</span>
              {article.brands.length ? <span>{article.brands.join(', ')}</span> : null}
            </div>
          </div>

          {/* ① 상단 요약 */}
          <section className="border-b border-line px-5 py-4">
            <h2 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-accent">
              요약
            </h2>
            {summaryText.length === 0 ? (
              <p className="text-[12.5px] text-muted">요약할 본문이 수집되지 않았습니다.</p>
            ) : (
              <ul className="space-y-1.5">
                {summaryText.map((line, i) => (
                  <li key={i} data-tr className="text-[13px] leading-relaxed text-ink">
                    · {line}
                  </li>
                ))}
              </ul>
            )}

            {/* ② 원문 접속 */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <a
                href={article.articleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-navy-800 bg-navy-800 px-3.5 text-[12px] font-semibold text-white transition-colors hover:bg-navy-700"
              >
                원문 기사 열기
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <span className="text-[11px] text-muted">{article.source}</span>
              {dataMode() === 'demo' ? (
                <span className="text-[10.5px] text-muted">
                  DEMO 데이터 — 링크는 출처 사이트로 연결됩니다.
                </span>
              ) : null}
            </div>
          </section>

          {/* ③ 번역 */}
          <div className="px-5 py-4">
            <OriginalTranslation
              title={article.title}
              titleKo={article.titleKo}
              original={article.originalSummary}
              koreanSummary={article.koreanSummary}
              source={article.source}
              articleUrl={article.articleUrl}
              translated={translated}
            />
          </div>

          {/* 부가 분석 — 필요할 때만 펼친다 */}
          {hasExtra ? (
            <details className="border-t border-line px-5 py-3">
              <summary className="cursor-pointer text-[12px] font-semibold text-navy-800">
                분석 상세 (분류 · 키워드 · 점수)
              </summary>

              <div className="mt-3 space-y-3">
                {article.trend ? (
                  <p className="text-[12.5px] leading-relaxed text-ink">
                    <span className="font-semibold text-navy-800">핵심 트렌드 </span>
                    <span data-tr>{article.trend}</span>
                  </p>
                ) : null}

                {article.whyItMatters ? (
                  <p className="text-[12.5px] leading-relaxed text-ink">
                    <span className="font-semibold text-navy-800">Why It Matters </span>
                    <span data-tr>{article.whyItMatters}</span>
                  </p>
                ) : null}

                {article.koreaImplication ? (
                  <p className="text-[12.5px] leading-relaxed text-ink">
                    <span className="font-semibold text-navy-800">한국 적용 </span>
                    <span data-tr>{article.koreaImplication}</span>
                  </p>
                ) : null}

                {article.keywords.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {article.keywords.map((k) => (
                      <Link
                        key={k}
                        href={`/news-feed?q=${encodeURIComponent(k)}&range=ALL`}
                        className="rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-muted hover:border-navy-700"
                      >
                        {k}
                      </Link>
                    ))}
                  </div>
                ) : null}

                <table className="w-full max-w-md text-[11.5px] tabular">
                  <tbody>
                    {scoreRows.map((r) => (
                      <tr key={r.label} className="border-b border-line last:border-0">
                        <td className="py-1 text-muted">{r.label}</td>
                        <td className="py-1 text-right text-muted">
                          {Math.round(r.weight * 100)}%
                        </td>
                        <td className="py-1 text-right font-medium text-navy-800">{r.value}</td>
                      </tr>
                    ))}
                    <tr>
                      <td className="pt-1.5 text-[12px] font-bold text-navy-900">Total</td>
                      <td />
                      <td className="pt-1.5 text-right text-[13px] font-bold text-navy-900">
                        {article.totalScore}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {article.expansion ? (
                  <DetailRows
                    title="Expansion"
                    rows={[
                      ['브랜드', article.expansion.brand],
                      ['본사 국가', article.expansion.hqCountry],
                      ['진출 국가', article.expansion.expansionCountry],
                      ['도시', article.expansion.city],
                      ['점포 수', String(article.expansion.storeCount ?? '—')],
                      ['운영 형태', article.expansion.ownership],
                    ]}
                  />
                ) : null}

                {article.tech ? (
                  <DetailRows
                    title="Restaurant Tech"
                    rows={[
                      ['기술', article.tech.techCategory],
                      ['벤더', article.tech.vendor],
                      ['도입 브랜드', article.tech.adopterBrand],
                      ['목적', article.tech.purpose],
                      ['기대효과', article.tech.expectedEffect],
                    ]}
                  />
                ) : null}

                {article.menu ? (
                  <DetailRows
                    title="Menu Trend"
                    rows={[
                      ['트렌드', article.menu.trendName],
                      ['유형', article.menu.menuType],
                      ['한국 기회', article.menu.koreaOpportunity],
                    ]}
                  />
                ) : null}
              </div>
            </details>
          ) : null}
        </Card>

        {sameEvent.length > 0 ? (
          <Card>
            <CardHeader title="같은 사건 보도" subtitle="중복 판정 그룹 — 대표 기사 외 보도" />
            <ArticleBriefList articles={sameEvent} />
          </Card>
        ) : null}

        {relatedByKeyword.length > 0 ? (
          <Card>
            <CardHeader title="관련 기사" subtitle="키워드가 겹치는 다른 기사" />
            <ArticleBriefList articles={relatedByKeyword} />
          </Card>
        ) : null}
      </div>
    </div>
  )
}

function DetailRows({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-sm border border-line px-3 py-2">
      <p className="mb-1 text-[11.5px] font-semibold text-navy-800">{title}</p>
      {rows.map(([k, v]) => (
        <div key={k} className="flex gap-2 text-[11.5px]">
          <span className="w-[64px] shrink-0 text-muted">{k}</span>
          <span className="min-w-0 flex-1 text-ink">{v}</span>
        </div>
      ))}
    </div>
  )
}
