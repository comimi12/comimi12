import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardBody, CardHeader, Label } from '@/components/ui/primitives'
import { ActionTag, ScoreTag, TierTag } from '@/components/news/bits'
import { CompactList } from '@/components/news/article-table'
import { getArticleById, getArticles } from '@/lib/repository'
import { relatedInGroup } from '@/lib/dedupe'
import { CATEGORY_LABEL, REGION_LABEL_KO } from '@/lib/categories'
import { SCORE_WEIGHTS } from '@/lib/scoring'
import { dataMode } from '@/lib/db'
import { formatDateTime, now } from '@/lib/utils'
import { keywordTrends } from '@/lib/analytics'

export const dynamic = 'force-dynamic'

/** §21 — 뉴스 상세 페이지 */
export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) notFound()

  const all = await getArticles()
  const sameEvent = relatedInGroup(article, all)

  // 키워드가 겹치는 다른 기사 (관련 뉴스)
  const relatedByKeyword = all
    .filter(
      (a) =>
        a.id !== article.id &&
        !sameEvent.some((s) => s.id === a.id) &&
        !a.isDuplicate &&
        a.keywords.some((k) => article.keywords.includes(k)),
    )
    .slice(0, 6)

  const radar = keywordTrends(all, now())

  const scoreRows = [
    { label: 'Business Impact', value: article.businessImpactScore, weight: SCORE_WEIGHTS.businessImpact },
    { label: 'Novelty', value: article.noveltyScore, weight: SCORE_WEIGHTS.novelty },
    { label: 'Market Scale', value: article.marketScaleScore, weight: SCORE_WEIGHTS.marketScale },
    { label: 'Source Reliability', value: article.reliabilityScore, weight: SCORE_WEIGHTS.sourceReliability },
    { label: 'Korea Relevance', value: article.koreaRelevanceScore, weight: SCORE_WEIGHTS.koreaRelevance },
  ]

  return (
    <div className="min-h-full p-4">
      <div className="mx-auto max-w-5xl space-y-3">
        <Link
          href="/news-feed"
          className="inline-flex items-center gap-1 text-[11.5px] text-muted hover:text-navy-800"
        >
          <ArrowLeft className="h-3 w-3" aria-hidden />
          전체 기사로
        </Link>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <Label className="border-navy-700/40 text-navy-700">{article.region}</Label>
              {article.country ? (
                <Label className="border-line text-muted">{article.country}</Label>
              ) : null}
              <Label className="border-line text-navy-700">
                {CATEGORY_LABEL[article.category]}
              </Label>
              {(article.secondaryCategories ?? []).map((c) => (
                <Label key={c} className="border-line text-muted">
                  {CATEGORY_LABEL[c]}
                </Label>
              ))}
              <ScoreTag score={article.totalScore} />
              <ActionTag action={article.recommendedAction} />
              {article.isDuplicate ? (
                <Label className="border-line text-muted">중복 기사</Label>
              ) : null}
            </div>

            <h1 className="mt-2 text-[19px] font-bold leading-snug tracking-tight text-navy-900">
              {article.titleKo}
            </h1>
            <p className="mt-1 text-[13px] leading-snug text-muted">{article.title}</p>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
              <span>
                <span className="font-semibold text-navy-700">출처</span> {article.source}
              </span>
              <TierTag source={article.source} />
              <span>
                <span className="font-semibold text-navy-700">발행</span>{' '}
                {formatDateTime(article.publishedAt)}
              </span>
              <span>
                <span className="font-semibold text-navy-700">수집</span>{' '}
                {formatDateTime(article.collectedAt)}
              </span>
              <span>
                <span className="font-semibold text-navy-700">지역</span>{' '}
                {REGION_LABEL_KO[article.region]}
              </span>
              {article.brands.length ? (
                <span>
                  <span className="font-semibold text-navy-700">브랜드</span>{' '}
                  {article.brands.join(', ')}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr]">
            <div className="space-y-4 px-5 py-4">
              <section>
                <h2 className="mb-1.5 text-[12px] font-bold tracking-tight text-navy-900">
                  3줄 요약
                </h2>
                <ul className="space-y-1">
                  {article.koreanSummary.map((line, i) => (
                    <li key={i} className="text-[12.5px] leading-relaxed text-ink">
                      · {line}
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="mb-1 text-[12px] font-bold tracking-tight text-navy-900">
                  핵심 트렌드
                </h2>
                <p className="text-[12.5px] leading-relaxed text-ink">{article.trend}</p>
              </section>

              <section className="border-l-2 border-blue-accent bg-blue-soft/40 px-3 py-2">
                <h2 className="mb-1 text-[12px] font-bold tracking-tight text-navy-900">
                  Why It Matters
                </h2>
                <p className="text-[12.5px] leading-relaxed text-ink">{article.whyItMatters}</p>
              </section>

              <section className="border-l-2 border-navy-800 bg-canvas px-3 py-2">
                <h2 className="mb-1 text-[12px] font-bold tracking-tight text-navy-900">
                  Korea Implication — 한국 외식기업 적용 가능성
                </h2>
                <p className="text-[12.5px] leading-relaxed text-ink">
                  {article.koreaImplication}
                </p>
              </section>

              <section>
                <h2 className="mb-1 text-[12px] font-bold tracking-tight text-navy-900">
                  원문 요약 (Original)
                </h2>
                <p className="text-[12px] leading-relaxed text-muted">{article.originalSummary}</p>
              </section>

              <section>
                <h2 className="mb-1.5 text-[12px] font-bold tracking-tight text-navy-900">
                  관련 키워드
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {article.keywords.map((k) => {
                    const tracked = radar.some(
                      (r) => r.keyword.toLowerCase() === k.toLowerCase(),
                    )
                    return (
                      <Link
                        key={k}
                        href={`/news-feed?q=${encodeURIComponent(k)}&range=ALL`}
                        className={
                          tracked
                            ? 'rounded-sm border border-blue-accent/40 bg-blue-soft px-1.5 py-0.5 text-[11px] text-navy-800'
                            : 'rounded-sm border border-line px-1.5 py-0.5 text-[11px] text-muted hover:border-navy-700'
                        }
                      >
                        {k}
                      </Link>
                    )
                  })}
                </div>
              </section>

              <section>
                <a
                  href={article.articleUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-blue-accent hover:underline"
                >
                  원문 기사 링크
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
                {dataMode() === 'demo' ? (
                  <p className="mt-1 text-[10.5px] text-muted">
                    DEMO 데이터입니다. 링크는 실제 기사가 아니라 출처 사이트로 연결됩니다.
                  </p>
                ) : null}
              </section>
            </div>

            <aside className="space-y-3 border-t border-line px-5 py-4 lg:border-l lg:border-t-0">
              <div>
                <h2 className="mb-1.5 text-[12px] font-bold tracking-tight text-navy-900">
                  Trend Score 구성
                </h2>
                <table className="w-full text-[11.5px] tabular">
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
              </div>

              {article.expansion ? (
                <DetailBlock title="Expansion">
                  <Row k="브랜드" v={article.expansion.brand} />
                  <Row k="본사 국가" v={article.expansion.hqCountry} />
                  <Row k="진출 국가" v={article.expansion.expansionCountry} />
                  <Row k="도시" v={article.expansion.city} />
                  <Row k="점포 수" v={String(article.expansion.storeCount ?? '—')} />
                  <Row k="운영 형태" v={article.expansion.ownership} />
                </DetailBlock>
              ) : null}

              {article.tech ? (
                <DetailBlock title="Restaurant Tech">
                  <Row k="기술" v={article.tech.techCategory} />
                  <Row k="벤더" v={article.tech.vendor} />
                  <Row k="도입 브랜드" v={article.tech.adopterBrand} />
                  <Row k="목적" v={article.tech.purpose} />
                  <Row k="기대효과" v={article.tech.expectedEffect} />
                </DetailBlock>
              ) : null}

              {article.menu ? (
                <DetailBlock title="Menu Trend">
                  <Row k="트렌드" v={article.menu.trendName} />
                  <Row k="유형" v={article.menu.menuType} />
                  <Row k="한국 기회" v={article.menu.koreaOpportunity} />
                </DetailBlock>
              ) : null}
            </aside>
          </div>
        </Card>

        {sameEvent.length > 0 ? (
          <Card>
            <CardHeader
              title="같은 사건 보도"
              subtitle="중복 판정 그룹 — 대표 기사 외 보도"
            />
            <CompactList articles={sameEvent} />
          </Card>
        ) : null}

        <Card>
          <CardHeader title="관련 뉴스" subtitle="키워드가 겹치는 다른 기사" />
          <CompactList articles={relatedByKeyword} />
        </Card>
      </div>
    </div>
  )
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm border border-line">
      <CardHeader title={title} />
      <CardBody className="space-y-1 px-3 py-2">{children}</CardBody>
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2 text-[11.5px]">
      <span className="w-[64px] shrink-0 text-muted">{k}</span>
      <span className="min-w-0 flex-1 text-ink">{v}</span>
    </div>
  )
}
