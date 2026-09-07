import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import type { NewsArticle } from '@/lib/types'
import { Empty } from '@/components/ui/primitives'
import { formatDate } from '@/lib/utils'
import { cleanSummaryText } from '@/lib/summary'

/**
 * 기사 한 건을 "요약 · 원문 · 번역" 3가지로만 보여주는 공용 목록.
 *
 * - 요약: 제목 아래 두 줄. AI 요약이 없으면 원문 발췌 문장을 그대로 쓴다.
 * - 원문: 오른쪽 [원문] 버튼 → 매체 기사 새 탭.
 * - 번역: 제목·요약에 data-tr 을 달아두면 상단바 "한국어 번역" 버튼 한 번으로
 *   그 탭에 보이는 기사 전체가 번역된다(브라우저 내장 엔진, 무료).
 */

/** 카드에 보여줄 요약문 — 제목과 같은 문장이면 생략한다. */
function briefSummary(a: NewsArticle): string {
  const ko = cleanSummaryText(a.koreanSummary)
  const text = ko || cleanSummaryText([a.originalSummary ?? ''])
  const title = (a.titleKo || a.title).trim()
  if (!text || text === title || text.startsWith(title)) return ''
  // 카드에는 두 줄이면 충분하고, 번역 버튼이 처리할 문장도 짧아진다.
  return text.length > 180 ? `${text.slice(0, 180).trimEnd()}…` : text
}

export function ArticleBrief({ article, rank }: { article: NewsArticle; rank?: number }) {
  const summary = briefSummary(article)

  return (
    <li className="px-4 py-3 hover:bg-blue-soft/30">
      <div className="flex items-start gap-3">
        {rank ? (
          <span className="mt-0.5 w-5 shrink-0 text-[12px] font-bold text-blue-accent tabular">
            {rank}
          </span>
        ) : null}

        <div className="min-w-0 flex-1">
          <Link href={`/article/${article.id}`} className="group block min-w-0">
            <span
              data-tr
              className="line-clamp-2 text-[13px] font-semibold leading-snug text-navy-900 group-hover:text-blue-accent"
            >
              {article.titleKo}
            </span>
          </Link>

          {summary ? (
            <p
              data-tr
              className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-ink"
            >
              {summary}
            </p>
          ) : null}

          <p className="mt-1.5 text-[10.5px] text-muted">
            {formatDate(article.publishedAt)} · {article.source} · {article.region}
            {article.brands.length ? ` · ${article.brands.slice(0, 3).join(', ')}` : ''}
            {` · 중요도 ${article.totalScore}`}
          </p>
        </div>

        <a
          href={article.articleUrl}
          target="_blank"
          rel="noreferrer"
          title={`${article.source} 원문 열기`}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-sm border border-line px-2 text-[11px] font-medium text-navy-800 transition-colors hover:border-navy-700 hover:text-blue-accent"
        >
          원문
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </li>
  )
}

export function ArticleBriefList({
  articles,
  rank = false,
  empty = '표시할 기사가 없습니다.',
}: {
  articles: NewsArticle[]
  /** 순위 번호 표시 (TOP N 목록) */
  rank?: boolean
  empty?: string
}) {
  if (articles.length === 0) return <Empty>{empty}</Empty>
  return (
    <ul className="divide-y divide-line">
      {articles.map((a, i) => (
        <ArticleBrief key={a.id} article={a} rank={rank ? i + 1 : undefined} />
      ))}
    </ul>
  )
}
