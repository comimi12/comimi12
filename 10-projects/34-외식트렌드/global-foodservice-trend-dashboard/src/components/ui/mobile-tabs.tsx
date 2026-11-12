'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * PC에서는 카드를 격자로 모두 펼치고, 스마트폰에서는 칩 탭으로 한 장씩 보여준다.
 * (스크롤 길이를 줄이는 용도 — 내용은 서버에서 렌더한 그대로 전달받는다.)
 */
export function MobileTabs({
  items,
  gridClassName,
}: {
  items: { key: string; label: string; content: React.ReactNode }[]
  /** md 이상에서 쓸 격자 클래스 (예: 'md:grid-cols-2 xl:grid-cols-3') */
  gridClassName?: string
}) {
  const [active, setActive] = useState(items[0]?.key)

  return (
    <div>
      <div
        role="tablist"
        className="no-print no-scrollbar -mx-3 mb-2 flex gap-1.5 overflow-x-auto px-3 md:hidden"
      >
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active === it.key}
            onClick={() => setActive(it.key)}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors',
              active === it.key
                ? 'border-navy-800 bg-navy-800 text-white'
                : 'border-line bg-white text-navy-700',
            )}
          >
            {it.label}
          </button>
        ))}
      </div>

      <div className={cn('md:grid md:gap-4', gridClassName)}>
        {items.map((it) => (
          <div
            key={it.key}
            role="tabpanel"
            className={cn(active === it.key ? 'block' : 'hidden', 'md:block print:block')}
          >
            {it.content}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 스마트폰에서 긴 목록의 앞 5건만 보여주고 [더 보기]로 펼친다. PC는 항상 전부.
 * (Tailwind 클래스는 정적이어야 하므로 5건 고정 — 6번째 li 부터 CSS 로 숨긴다.)
 */
export function MobileMore({ total, children }: { total: number; children: React.ReactNode }) {
  const limit = 5
  const [open, setOpen] = useState(false)
  const hidden = total > limit && !open

  return (
    <div>
      <div className={cn(hidden && 'max-md:[&_ul>li:nth-child(n+6)]:hidden')}>
        {children}
      </div>
      {total > limit ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="no-print flex h-11 w-full items-center justify-center gap-1 border-t border-line text-[13px] font-medium text-blue-accent md:hidden"
        >
          {open ? '접기' : `${total - limit}건 더 보기`}
          <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
