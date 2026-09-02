'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import { cn } from '@/lib/utils'

/** §11 — Region Dashboard 4개 탭 */
export function RegionTabs() {
  const pathname = usePathname()

  return (
    <nav className="no-print flex items-center gap-1 border-b border-line bg-white px-5">
      {REGION_ORDER.map((region) => {
        const href = `/${region.toLowerCase()}`
        const active = pathname === href
        return (
          <Link
            key={region}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              '-mb-px border-b-2 px-3 py-1.5 text-[12px] font-medium transition-colors',
              active
                ? 'border-blue-accent text-navy-800'
                : 'border-transparent text-muted hover:text-navy-800',
            )}
          >
            {region}
            <span className="ml-1 text-[10px] font-normal text-muted">
              {REGION_LABEL_KO[region]}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
