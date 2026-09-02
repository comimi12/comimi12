'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input, Select } from '@/components/ui/primitives'
import { REGION_ORDER } from '@/lib/categories'
import { PageTranslateButton } from './page-translate'

/** §9 Header — Last Updated · Search · Date Range · Region Filter */
export function Topbar({ lastUpdated, demo }: { lastUpdated: string; demo: boolean }) {
  const router = useRouter()
  const params = useSearchParams()

  function go(next: Record<string, string>) {
    const sp = new URLSearchParams()
    const merged = {
      q: params.get('q') ?? '',
      range: params.get('range') ?? '7D',
      region: params.get('region') ?? 'ALL',
      ...next,
    }
    Object.entries(merged).forEach(([k, v]) => {
      if (v && v !== 'ALL') sp.set(k, v)
    })
    router.push(`/news-feed?${sp.toString()}`)
  }

  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-5">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-bold tracking-tight text-navy-900">
          GLOBAL FOODSERVICE TREND INTELLIGENCE
        </h1>
        <p className="truncate text-[11.5px] text-muted">
          Daily Global Restaurant &amp; Foodservice Intelligence
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PageTranslateButton />
        {demo ? (
          <span className="rounded-sm border border-blue-accent/40 bg-blue-soft px-1.5 py-px text-[10px] font-semibold tracking-wide text-navy-800">
            DEMO DATA
          </span>
        ) : null}

        <div className="hidden text-right lg:block">
          <p className="text-[9.5px] uppercase tracking-wide text-muted">Last Updated</p>
          <p className="text-[11px] font-medium text-navy-800 tabular">{lastUpdated}</p>
        </div>

        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            const value = new FormData(e.currentTarget).get('q')
            go({ q: String(value ?? '') })
          }}
        >
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            name="q"
            defaultValue={params.get('q') ?? ''}
            placeholder="브랜드 · 메뉴 · 국가 · 키워드 검색"
            aria-label="기사 검색"
            className="w-[210px] pl-7"
          />
        </form>

        <Select
          aria-label="기간 필터"
          defaultValue={params.get('range') ?? '7D'}
          onChange={(e) => go({ range: e.target.value })}
        >
          <option value="TODAY">Today</option>
          <option value="7D">7 Days</option>
          <option value="30D">30 Days</option>
          <option value="90D">90 Days</option>
          <option value="ALL">전체</option>
        </Select>

        <Select
          aria-label="지역 필터"
          defaultValue={params.get('region') ?? 'ALL'}
          onChange={(e) => go({ region: e.target.value })}
        >
          <option value="ALL">All Regions</option>
          {REGION_ORDER.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </div>
    </header>
  )
}
