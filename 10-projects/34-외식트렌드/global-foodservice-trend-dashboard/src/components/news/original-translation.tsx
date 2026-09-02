'use client'

import { useState } from 'react'
import { ExternalLink, Languages, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { checkAvailability, translateMany, type TranslateStatus } from '@/lib/translate'

type View = 'both' | 'ko' | 'en'

/**
 * 원문 ↔ 번역 대조 뷰.
 *
 * AI 번역본이 있으면 그대로 보여주고, 없으면 브라우저 내장 번역(무료)으로
 * 그 자리에서 한국어를 만들어 채운다.
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
  /** AI 번역이 적용된 기사인지 */
  translated: boolean
}) {
  const [view, setView] = useState<View>('both')
  const [live, setLive] = useState<{ title: string; lines: string[] } | null>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<TranslateStatus | null>(null)

  const showKo = view === 'both' || view === 'ko'
  const showEn = view === 'both' || view === 'en'
  const hasKorean = translated || live !== null

  async function runTranslate() {
    setBusy(true)
    setProgress(0)
    try {
      const state = await checkAvailability()
      setStatus(state)
      if (state === 'unsupported' || state === 'unavailable' || state === 'error') return

      const bodyLines = original
        .replace(/\s+/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 20)
        .slice(0, 6)

      const results = await translateMany([title, ...bodyLines], setProgress)
      setLive({ title: results[0], lines: results.slice(1).filter(Boolean) })
      setStatus('ready')
    } catch {
      setStatus('error')
    } finally {
      setBusy(false)
    }
  }

  const tabs: { key: View; label: string }[] = [
    { key: 'both', label: '나란히' },
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
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-accent">
                한국어 {live ? '· 브라우저 번역' : ''}
              </p>
              {!translated ? (
                <button
                  onClick={runTranslate}
                  disabled={busy}
                  className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-navy-800 bg-navy-800 px-2.5 text-[11.5px] font-semibold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
                >
                  {busy ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      {progress > 0 && progress < 100 ? `번역 모델 ${progress}%` : '번역 중'}
                    </>
                  ) : (
                    <>
                      <Languages className="h-3 w-3" aria-hidden />
                      {live ? '다시 번역' : '한국어로 번역'}
                    </>
                  )}
                </button>
              ) : null}
            </div>

            <h3 className="text-[15px] font-bold leading-snug text-navy-900">
              {live?.title ?? titleKo}
            </h3>

            {hasKorean ? (
              <ul className="mt-2.5 space-y-1.5">
                {(live?.lines ?? koreanSummary.filter(Boolean)).map((line, i) => (
                  <li key={i} className="text-[13px] leading-relaxed text-ink">
                    · {line}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-2.5 rounded-sm border border-line bg-canvas px-3 py-2.5 text-[12px] leading-relaxed text-muted">
                {status === 'unsupported' ? (
                  <>
                    이 브라우저는 내장 번역을 지원하지 않습니다.
                    <br />
                    Chrome 또는 Edge 최신 버전에서 열거나, 브라우저 우클릭 → &ldquo;한국어로
                    번역&rdquo;을 쓰세요.
                  </>
                ) : status === 'unavailable' ? (
                  <>이 기기에서 영어 → 한국어 번역을 쓸 수 없습니다.</>
                ) : status === 'error' ? (
                  <>번역에 실패했습니다. 잠시 후 다시 시도하세요.</>
                ) : (
                  <>
                    <b className="text-navy-800">번역 버튼</b>을 누르면 브라우저에서 바로 번역합니다.
                    무료이고, 기사 내용은 외부로 전송되지 않습니다.
                    <br />
                    처음 한 번은 번역 모델을 내려받습니다.
                  </>
                )}
              </div>
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
