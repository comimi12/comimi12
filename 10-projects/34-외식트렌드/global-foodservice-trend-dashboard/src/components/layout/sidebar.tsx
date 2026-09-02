'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Activity,
  BarChart3,
  Building2,
  Cpu,
  FileText,
  Globe2,
  LayoutDashboard,
  Map,
  Newspaper,
  Radar,
  Settings,
  UtensilsCrossed,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** §28 — 좌측 Navigation (영문 라벨 + 한글 병기) */
const NAV = [
  {
    group: null,
    items: [
      { href: '/', label: 'Dashboard', ko: '대시보드', icon: LayoutDashboard },
      { href: '/daily-brief', label: 'Daily Brief', ko: '데일리 브리프', icon: FileText },
    ],
  },
  {
    group: 'REGION · 지역',
    items: [
      { href: '/global', label: 'Global', ko: '글로벌', icon: Globe2 },
      { href: '/asia', label: 'Asia', ko: '아시아', icon: Globe2 },
      { href: '/europe', label: 'Europe', ko: '유럽', icon: Globe2 },
      { href: '/americas', label: 'Americas', ko: '미주', icon: Globe2 },
    ],
  },
  {
    group: 'ANALYSIS · 분석',
    items: [
      { href: '/trend-radar', label: 'Trend Radar', ko: '트렌드 레이더', icon: Radar },
      { href: '/menu-trends', label: 'Menu Trends', ko: '메뉴 트렌드', icon: UtensilsCrossed },
      { href: '/brand-watch', label: 'Brand Watch', ko: '브랜드 워치', icon: Building2 },
      { href: '/restaurant-tech', label: 'Restaurant Tech', ko: '레스토랑 테크', icon: Cpu },
      { href: '/expansion', label: 'Expansion', ko: '출점 · 확장', icon: Map },
    ],
  },
  {
    group: 'DATA · 데이터',
    items: [
      { href: '/news-feed', label: 'News Feed', ko: '전체 기사', icon: Newspaper },
      { href: '/sources', label: 'Sources', ko: '소스 관리', icon: Activity },
      { href: '/settings', label: 'Settings', ko: '설정', icon: Settings },
    ],
  },
] as const

export function Sidebar() {
  const pathname = usePathname()

  return (
    <nav className="no-print flex h-full w-[212px] shrink-0 flex-col border-r border-line bg-white">
      <div className="border-b border-line px-4 py-3.5">
        <Link href="/" className="block">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-blue-accent" aria-hidden />
            <span className="text-[11.5px] font-bold leading-tight tracking-tight text-navy-900">
              GLOBAL FOODSERVICE
            </span>
          </div>
          <span className="mt-0.5 block text-[10px] font-medium tracking-[0.14em] text-muted">
            TREND INTELLIGENCE
          </span>
          <span className="mt-1 block text-[10.5px] text-muted">글로벌 외식 트렌드</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {NAV.map((section, i) => (
          <div key={i} className="mb-1">
            {section.group ? (
              <p className="px-4 pb-1 pt-3 text-[9.5px] font-semibold tracking-[0.12em] text-muted/70">
                {section.group}
              </p>
            ) : null}
            {section.items.map((item) => {
              const active =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 border-l-2 px-4 py-2 transition-colors',
                    active
                      ? 'border-blue-accent bg-blue-soft/60'
                      : 'border-transparent hover:bg-canvas',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-blue-accent' : 'text-muted',
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0">
                    <span
                      className={cn(
                        'block truncate text-[12.5px] leading-tight',
                        active ? 'font-semibold text-navy-800' : 'font-medium text-navy-700',
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      className={cn(
                        'block truncate text-[10.5px] leading-tight',
                        active ? 'text-navy-700' : 'text-muted',
                      )}
                    >
                      {item.ko}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        ))}
      </div>

      <div className="border-t border-line px-4 py-3">
        <p className="text-[10px] leading-relaxed text-muted">
          외식기업 본사 기획 · 운영 · 교육 · 해외사업 담당자용
        </p>
      </div>
    </nav>
  )
}
