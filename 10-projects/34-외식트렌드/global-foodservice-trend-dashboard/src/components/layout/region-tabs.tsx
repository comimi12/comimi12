'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import { cn } from '@/lib/utils'

/** 지역 4개 + 국가별(한국) 탭 */
const TABS: { href: string; label: string; ko: string }[] = [
  ...REGION_ORDER.map((region) => ({
    href: `/${region.toLowerCase()}`,
    label: region as string,
    ko: REGION_LABEL_KO[region],
  })),
  { href: '/korea', label: 'KOREA', ko: '한국' },
]

export function RegionTabs() {
  const pathname = usePathname()

  return (
    <nav className="no-print flex items-center gap-1 border-b border-line bg-white px-5">
      {TABS.map((tab) => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-1.5 text-[12px] font-medium transition-colors',
              active
                ? 'border-blue-accent text-navy-800'
                : 'border-transparent text-muted hover:text-navy-800',
            )}
          >
            {tab.label}
            <span className="ml-1 text-[10px] font-normal text-muted">{tab.ko}</span>
          </Link>
        )
      })}
    </nav>
  )
}
