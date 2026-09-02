'use client'

import { useState } from 'react'
import { Check, Languages, Loader2 } from 'lucide-react'
import { checkAvailability, translateMany } from '@/lib/translate'

type State = 'idle' | 'busy' | 'done' | 'unsupported' | 'error'

/**
 * 페이지 전체 한국어 번역 (무료 · 브라우저 내장 엔진).
 *
 * 서버가 렌더한 [data-tr] 요소의 텍스트를 기기 안에서 번역해 교체한다.
 * 서버 호출이 없으므로 비용이 들지 않고 기사 내용도 외부로 나가지 않는다.
 */
export function PageTranslateButton() {
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState(0)

  async function run() {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tr]')).filter(
      (n) => n.dataset.trDone !== '1' && (n.textContent ?? '').trim().length > 0,
    )
    if (nodes.length === 0) {
      setState('done')
      return
    }

    setState('busy')
    setProgress(0)
    try {
      const availability = await checkAvailability()
      if (availability === 'unsupported' || availability === 'unavailable') {
        setState('unsupported')
        return
      }
      const texts = nodes.map((n) => (n.textContent ?? '').trim())
      const out = await translateMany(texts, setProgress)
      nodes.forEach((n, i) => {
        if (out[i]) {
          n.textContent = out[i]
          n.dataset.trDone = '1'
        }
      })
      setState('done')
    } catch {
      setState('error')
    }
  }

  const label =
    state === 'busy'
      ? progress > 0 && progress < 100
        ? `모델 ${progress}%`
        : '번역 중'
      : state === 'done'
        ? '번역됨'
        : state === 'unsupported'
          ? 'Chrome 필요'
          : state === 'error'
            ? '실패 · 재시도'
            : '한국어 번역'

  return (
    <button
      onClick={run}
      disabled={state === 'busy'}
      title={
        state === 'unsupported'
          ? '브라우저 내장 번역이 없습니다. Chrome/Edge 최신 버전에서 사용하세요.'
          : '브라우저에서 무료로 번역합니다. 기사 내용은 외부로 전송되지 않습니다.'
      }
      className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-sm border border-line bg-white px-2.5 text-[11.5px] font-medium text-navy-800 transition-colors hover:border-navy-700 disabled:opacity-60"
    >
      {state === 'busy' ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      ) : state === 'done' ? (
        <Check className="h-3 w-3 text-blue-accent" aria-hidden />
      ) : (
        <Languages className="h-3 w-3" aria-hidden />
      )}
      {label}
    </button>
  )
}
