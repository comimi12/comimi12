'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Check, Languages, Loader2 } from 'lucide-react'
import { checkAvailability, translateMany } from '@/lib/translate'
import { cn } from '@/lib/utils'

type State = 'idle' | 'busy' | 'done' | 'unsupported' | 'error'

/** 한 번 번역을 켜면 다른 탭으로 이동해도 자동으로 번역한다(기기별 저장). */
const AUTO_KEY = 'gfti:auto-translate'

function readAuto(): boolean {
  try {
    return window.localStorage.getItem(AUTO_KEY) === '1'
  } catch {
    return false
  }
}
function writeAuto(on: boolean) {
  try {
    if (on) window.localStorage.setItem(AUTO_KEY, '1')
    else window.localStorage.removeItem(AUTO_KEY)
  } catch {
    /* 저장소 차단 — 무시 */
  }
}

/**
 * 스마트폰 브라우저(안드로이드 Chrome · iOS Safari)에는 내장 Translator API 가 없다.
 * 그때는 Google 번역 페이지 프록시(*.translate.goog)로 지금 화면을 연다 — 무료 · 로그인 불필요.
 * 로컬 개발 주소는 프록시가 접근할 수 없으므로 제외한다.
 */
function googleTranslateUrl(): string | null {
  const { hostname, pathname, search } = window.location
  if (hostname === 'localhost' || /^[\d.]+$/.test(hostname) || hostname.endsWith('.translate.goog')) {
    return null
  }
  const proxyHost = hostname.replace(/-/g, '--').replace(/\./g, '-') + '.translate.goog'
  const sp = new URLSearchParams(search)
  sp.set('_x_tr_sl', 'auto')
  sp.set('_x_tr_tl', 'ko')
  sp.set('_x_tr_hl', 'ko')
  return `https://${proxyHost}${pathname}?${sp.toString()}`
}

/**
 * 페이지 전체 한국어 번역 (무료 · 브라우저 내장 엔진).
 *
 * 서버가 렌더한 [data-tr] 요소의 텍스트를 기기 안에서 번역해 교체한다.
 * 서버 호출이 없으므로 비용이 들지 않고 기사 내용도 외부로 나가지 않는다.
 */
export function PageTranslateButton({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname()
  const [state, setState] = useState<State>('idle')
  const [progress, setProgress] = useState(0)
  const running = useRef(false)
  const btn = useRef<HTMLButtonElement>(null)

  const run = useCallback(async (auto = false) => {
    if (running.current) return
    // 이미 한국어인 기사(국내 매체)는 en→ko 번역을 돌리면 문장이 망가진다 — 건너뛴다.
    const nodes = Array.from(document.querySelectorAll<HTMLElement>('[data-tr]')).filter((n) => {
      const text = (n.textContent ?? '').trim()
      return n.dataset.trDone !== '1' && text.length > 0 && !/[가-힣]/.test(text)
    })

    const availability = await checkAvailability()
    if (availability === 'unsupported' || availability === 'unavailable') {
      if (auto) return
      const url = googleTranslateUrl()
      if (url) {
        window.location.href = url
        return
      }
      setState('unsupported')
      return
    }

    if (nodes.length === 0) {
      setState('done')
      writeAuto(true)
      return
    }

    running.current = true
    setState('busy')
    setProgress(0)
    try {
      const texts = nodes.map((n) => (n.textContent ?? '').trim())
      const out = await translateMany(texts, setProgress)
      nodes.forEach((n, i) => {
        if (out[i]) {
          n.textContent = out[i]
          n.dataset.trDone = '1'
        }
      })
      setState('done')
      writeAuto(true)
    } catch {
      setState('error')
    } finally {
      running.current = false
    }
  }, [])

  // 번역을 켜 둔 상태면 새 화면으로 이동할 때마다 자동 번역한다.
  useEffect(() => {
    if (!readAuto()) return
    // PC/모바일 상단바에 버튼이 둘 있다 — 화면에 보이는 쪽만 실행한다.
    if (!btn.current || btn.current.offsetParent === null) return
    // 서버 컴포넌트가 화면에 붙을 시간을 조금 준다.
    const t = window.setTimeout(() => void run(true), 250)
    return () => window.clearTimeout(t)
  }, [pathname, run])

  function onClick() {
    if (state === 'done') {
      // 다시 누르면 자동 번역 끄기 → 원문으로 새로고침
      writeAuto(false)
      window.location.reload()
      return
    }
    void run(false)
  }

  const label =
    state === 'busy'
      ? progress > 0 && progress < 100
        ? `모델 ${progress}%`
        : '번역 중'
      : state === 'done'
        ? compact
          ? '번역됨'
          : '번역됨 · 끄기'
        : state === 'unsupported'
          ? 'Chrome 필요'
          : state === 'error'
            ? '실패 · 재시도'
            : compact
              ? '번역'
              : '한국어 번역'

  return (
    <button
      ref={btn}
      onClick={onClick}
      disabled={state === 'busy'}
      title={
        state === 'done'
          ? '다시 누르면 자동 번역을 끄고 원문으로 돌아갑니다.'
          : state === 'unsupported'
            ? '브라우저 내장 번역이 없습니다. Chrome/Edge 최신 버전에서 사용하세요.'
            : '브라우저에서 무료로 번역합니다. 한 번 켜면 다른 화면도 자동 번역됩니다.'
      }
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-sm border bg-white font-medium text-navy-800 transition-colors hover:border-navy-700 disabled:opacity-60',
        compact ? 'h-8 rounded-full px-3 text-[12.5px]' : 'h-7 px-2.5 text-[11.5px]',
        state === 'done' ? 'border-blue-accent/50 bg-blue-soft/60' : 'border-line',
      )}
    >
      {state === 'busy' ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : state === 'done' ? (
        <Check className="h-3.5 w-3.5 text-blue-accent" aria-hidden />
      ) : (
        <Languages className="h-3.5 w-3.5" aria-hidden />
      )}
      {label}
    </button>
  )
}
