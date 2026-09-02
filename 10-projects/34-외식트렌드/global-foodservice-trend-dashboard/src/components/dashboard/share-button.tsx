'use client'

import { useState } from 'react'
import { Check, Copy, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'copied' | 'failed'

/**
 * 카카오톡 공유 버튼.
 *
 * 모바일(안드로이드/iOS)에서는 Web Share API 가 열리고 공유 시트에 카카오톡이 나온다.
 * 데스크톱 브라우저에는 Web Share 가 없으므로 링크 복사로 대체한다 —
 * 복사한 링크를 카카오톡 대화창에 붙여넣으면 동일하게 공유된다.
 *
 * 카카오톡 전용 카드형 공유를 붙이려면 Kakao Developers 앱 등록 후
 * JavaScript 키가 필요하다. README 참고.
 */
export function ShareButton({
  title,
  text,
  path,
  className,
}: {
  title: string
  text?: string
  /** 공유할 경로. 비우면 현재 페이지 */
  path?: string
  className?: string
}) {
  const [status, setStatus] = useState<Status>('idle')

  // window 접근은 이벤트 핸들러 안에서만 한다 (렌더/이펙트에서 상태를 만들지 않음)
  function shareUrl(): string {
    return path ? `${window.location.origin}${path}` : window.location.href
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(`${title}\n${url}`)
      setStatus('copied')
      setTimeout(() => setStatus('idle'), 2200)
    } catch {
      window.prompt('아래 링크를 복사해 카카오톡에 붙여넣으세요', url)
      setStatus('idle')
    }
  }

  async function handleShare() {
    const url = shareUrl()
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text ?? title, url })
        return
      } catch {
        // 사용자가 공유 시트를 닫은 경우 — 아무 것도 하지 않는다.
        return
      }
    }
    // 데스크톱: 공유 시트가 없으므로 링크 복사로 대체
    await copy(url)
  }

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <button
        onClick={handleShare}
        title="모바일에서는 카카오톡 공유 시트가 열리고, PC에서는 링크가 복사됩니다"
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-navy-800 bg-navy-800 px-3 text-[12px] font-semibold text-white transition-colors hover:bg-navy-700"
      >
        <Share2 className="h-3.5 w-3.5" aria-hidden />
        카카오톡 공유
      </button>
      <button
        onClick={() => copy(shareUrl())}
        aria-label="링크 복사"
        className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line bg-white px-3 text-[12px] font-medium text-navy-800 transition-colors hover:border-navy-700"
      >
        {status === 'copied' ? (
          <>
            <Check className="h-3.5 w-3.5 text-blue-accent" aria-hidden />
            복사됨
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" aria-hidden />
            링크 복사
          </>
        )}
      </button>
    </div>
  )
}
