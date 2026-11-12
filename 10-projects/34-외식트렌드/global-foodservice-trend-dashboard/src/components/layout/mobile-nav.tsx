'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Globe2, LayoutDashboard, Menu, Newspaper, Radar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NAV } from './sidebar'

const REGION_PATHS = ['/korea', '/asia', '/americas', '/europe', '/global']
const ANALYSIS_PATHS = ['/trend-radar', '/menu-trends', '/brand-watch', '/restaurant-tech', '/expansion']

/**
 * 스마트폰 전용 하단 탭바 (md 미만에서만 보인다).
 *
 * 자주 쓰는 4곳(브리프 · 지역 · 트렌드 · 기사)을 엄지 한 번으로 열고,
 * 나머지 메뉴는 [전체 메뉴] 바텀시트에서 고른다.
 */
export function MobileNav({ showGlobal = false }: { showGlobal?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // 시트가 열려 있는 동안 뒤 화면 스크롤을 막는다.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const tabs = [
    { href: '/', label: '브리프', icon: LayoutDashboard, active: pathname === '/' },
    {
      href: '/korea',
      label: '지역',
      icon: Globe2,
      active: REGION_PATHS.some((p) => pathname.startsWith(p)),
    },
    {
      href: '/trend-radar',
      label: '트렌드',
      icon: Radar,
      active: ANALYSIS_PATHS.some((p) => pathname.startsWith(p)),
    },
    {
      href: '/news-feed',
      label: '기사',
      icon: Newspaper,
      active: pathname.startsWith('/news-feed') || pathname.startsWith('/article'),
    },
  ]

  return (
    <>
      <nav
        aria-label="하단 메뉴"
        className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="grid h-14 grid-cols-5">
          {tabs.map((t) => {
            const Icon = t.icon
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={t.active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium',
                  t.active ? 'text-blue-accent' : 'text-muted',
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {t.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium',
              open ? 'text-blue-accent' : 'text-muted',
            )}
          >
            <Menu className="h-5 w-5" aria-hidden />
            전체 메뉴
          </button>
        </div>
      </nav>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-navy-900/40"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-xl bg-white"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-white px-4 py-3">
              <p className="text-[15px] font-bold text-navy-900">전체 메뉴</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-canvas"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {NAV.map((section, i) => (
              <div key={i} className="px-3 pt-3">
                {section.group ? (
                  <p className="px-1 pb-1.5 text-[11px] font-semibold tracking-wide text-muted">
                    {section.group.split(' · ').slice(1).join(' · ') || section.group}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2">
                  {section.items
                    .filter((item) => item.href !== '/global' || showGlobal)
                    .map((item) => {
                      const Icon = item.icon
                      const active =
                        item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setOpen(false)}
                          className={cn(
                            'flex items-center gap-2.5 rounded-lg border px-3 py-2.5',
                            active
                              ? 'border-blue-accent bg-blue-soft/60'
                              : 'border-line bg-white active:bg-canvas',
                          )}
                        >
                          <Icon
                            className={cn('h-4 w-4 shrink-0', active ? 'text-blue-accent' : 'text-muted')}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-[13.5px] font-semibold leading-tight text-navy-800">
                              {item.ko.split(' · ')[0]}
                            </span>
                            <span className="block truncate text-[10.5px] leading-tight text-muted">
                              {item.label}
                            </span>
                          </span>
                        </Link>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </>
  )
}
