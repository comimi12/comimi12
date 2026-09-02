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
        'group block min-w-0 text-[12px] font-medium leading-snug text-navy-800 hover:text-blue-accent',
        className,
      )}
    >
      <span className="line-clamp-2">{article.titleKo}</span>
      <span className="mt-0.5 line-clamp-1 text-[10.5px] font-normal text-muted">
        {article.title}
      </span>
    </Link>
  )
}
