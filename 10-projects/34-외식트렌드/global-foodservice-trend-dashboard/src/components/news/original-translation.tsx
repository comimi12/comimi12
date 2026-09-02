'use client'

import { useState } from 'react'
import { ExternalLink, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'

type View = 'both' | 'ko' | 'en'

/**
 * 원문 ↔ 번역 대조 뷰.
 * 요약본에서 기사를 클릭하면 이 화면에서 원문과 한국어를 나란히 확인한다.
 */
export function OriginalTranslation({
  title,
  titleKo,
  original,
  koreanSummary,
  source,
  articleUrl,
  translated,
}: {
  title: string
  titleKo: string
  original: string
  koreanSummary: string[]
  source: string
  articleUrl: string
  /** AI 번역이 적용된 기사인지 (미적용이면 원문만 신뢰 가능) */
  translated: boolean
}) {
  const [view, setView] = useState<View>('both')

  const showKo = view === 'both' || view === 'ko'
  const showEn = view === 'both' || view === 'en'

  const tabs: { key: View; label: string }[] = [
    { key: 'both', label: '나란히 보기' },
    { key: 'ko', label: '번역본' },
    { key: 'en', label: '원문' },
  ]

  return (
    <section className="rounded-md border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Languages className="h-4 w-4 text-blue-accent" aria-hidden />
          <h2 className="text-[13.5px] font-bold tracking-tight text-navy-900">
            원문 · 번역 대조
          </h2>
        </div>
        <div className="flex items-center gap-1" role="tablist" aria-label="표시 방식">
          {tabs.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={view === t.key}
              onClick={() => setView(t.key)}
              className={cn(
                'rounded-sm border px-2.5 py-1 text-[11.5px] font-medium transition-colors',
                view === t.key
                  ? 'border-navy-800 bg-navy-800 text-white'
                  : 'border-line text-muted hover:border-navy-700 hover:text-navy-800',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <div
        className={cn(
          'grid grid-cols-1 divide-y divide-line',
          view === 'both' && 'lg:grid-cols-2 lg:divide-x lg:divide-y-0',
        )}
      >
        {showKo ? (
          <article className="px-4 py-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-accent">
              한국어 번역
            </p>
            <h3 className="text-[15px] font-bold leading-snug text-navy-900">{titleKo}</h3>
            {translated ? (
              <ul className="mt-2.5 space-y-1.5">
                {koreanSummary.filter(Boolean).map((line, i) => (
                  <li key={i} className="text-[13px] leading-relaxed text-ink">
                    · {line}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2.5 rounded-sm border border-line bg-canvas px-3 py-2 text-[12px] leading-relaxed text-muted">
                이 기사는 AI 번역이 적용되지 않았습니다. 오른쪽 원문을 확인하세요.
                <br />
                (수집 시 <code className="font-mono">ANTHROPIC_API_KEY</code> 가 설정되면 한국어
                제목·3줄 요약이 함께 생성됩니다)
              </p>
            )}
          </article>
        ) : null}

        {showEn ? (
          <article className="px-4 py-3.5">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              ORIGINAL · 원문
            </p>
            <h3 className="text-[15px] font-semibold leading-snug text-navy-800">{title}</h3>
            <p className="mt-2.5 whitespace-pre-line text-[13px] leading-relaxed text-ink">
              {original}
            </p>
            <p className="mt-3 text-[11px] text-muted">
              출처 · {source}
              {' — '}
              <a
                href={articleUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-medium text-blue-accent hover:underline"
              >
                기사 원문 열기
                <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </p>
          </article>
        ) : null}
      </div>
    </section>
  )
}
