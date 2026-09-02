import Link from 'next/link'
import type { NewsArticle, RecommendedAction } from '@/lib/types'
import {
  ACTION_LABEL,
  CATEGORY_LABEL,
  SCORE_LABEL_CLASS,
  scoreLabel,
} from '@/lib/categories'
import { Label } from '@/components/ui/primitives'
import { tierOf } from '@/lib/sources'
import { cn } from '@/lib/utils'

/** §6 — 색상 배지 대신 명확한 Label */
export function ScoreTag({ score, className }: { score: number; className?: string }) {
  const label = scoreLabel(score)
  return (
    <Label className={cn(SCORE_LABEL_CLASS[label], className)}>
      {label} · {score}
    </Label>
  )
}

export function ActionTag({ action }: { action: RecommendedAction }) {
  const emphasis =
    action === 'IMMEDIATE_REVIEW'
      ? 'border-blue-accent/50 bg-blue-soft text-navy-800'
      : action === 'BENCHMARK'
        ? 'border-navy-700/30 text-navy-700'
        : 'border-line text-muted'
  return <Label className={emphasis}>{ACTION_LABEL[action]}</Label>
}

export function CategoryTag({ article }: { article: NewsArticle }) {
  return <Label className="border-line text-navy-700">{CATEGORY_LABEL[article.category]}</Label>
}

export function TierTag({ source }: { source: string }) {
  return <Label className="border-line text-muted">TIER {tierOf(source)}</Label>
}

export function Headline({
  article,
  className,
}: {
  article: NewsArticle
  className?: string
}) {
  return (
    <Link
      href={`/article/${article.id}`}
      className={cn(
        'group block min-w-0 hover:text-blue-accent',
        className,
      )}
    >
      {/* data-tr: 페이지 전체 번역 버튼이 이 요소의 텍스트를 교체한다 */}
      <span
        data-tr
        className="line-clamp-2 text-[13px] font-semibold leading-snug text-navy-900 group-hover:text-blue-accent"
      >
        {article.titleKo}
      </span>
      {/* 번역 미적용 기사는 한글 제목이 원문과 같다. 같은 문장을 두 번 보이지 않는다. */}
      {article.titleKo !== article.title ? (
        <span className="mt-1 line-clamp-1 text-[11px] font-normal leading-tight text-muted">
          {article.title}
        </span>
      ) : null}
    </Link>
  )
}
