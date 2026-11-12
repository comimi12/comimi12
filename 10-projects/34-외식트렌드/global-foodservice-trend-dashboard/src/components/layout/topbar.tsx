'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { BarChart3, Search, X } from 'lucide-react'
import { Input, Select } from '@/components/ui/primitives'
import { REGION_ORDER } from '@/lib/categories'
import { PageTranslateButton } from './page-translate'

/** §9 Header — Last Updated · Search · Date Range · Region Filter */
export function Topbar({ lastUpdated, demo }: { lastUpdated: string; demo: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const [searchOpen, setSearchOpen] = useState(false)

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
    <>
    {/* ── 스마트폰 상단바: 제목 · 번역 · 검색 아이콘만 ── */}
    <header className="no-print sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur md:hidden">
      <div className="flex h-12 items-center justify-between gap-2 px-3">
        <Link href="/" className="flex min-w-0 items-center gap-1.5">
          <BarChart3 className="h-4 w-4 shrink-0 text-blue-accent" aria-hidden />
          <span className="min-w-0">
            <span className="block truncate text-[14px] font-bold leading-tight text-navy-900">
              글로벌 외식 트렌드
            </span>
            <span className="block truncate text-[10px] leading-tight text-muted tabular">
              {demo ? 'DEMO DATA · ' : ''}업데이트 {lastUpdated}
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <PageTranslateButton compact />
          <button
            type="button"
            onClick={() => setSearchOpen((v) => !v)}
            aria-label={searchOpen ? '검색 닫기' : '기사 검색'}
            aria-expanded={searchOpen}
            className="flex h-9 w-9 items-center justify-center rounded-full text-navy-800 active:bg-canvas"
          >
            {searchOpen ? <X className="h-5 w-5" aria-hidden /> : <Search className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>
      {searchOpen ? (
        <form
          className="relative px-3 pb-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            const value = new FormData(e.currentTarget).get('q')
            setSearchOpen(false)
            go({ q: String(value ?? '') })
          }}
        >
          <Search
            className="pointer-events-none absolute left-6 top-[18px] h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <Input
            name="q"
            type="search"
            enterKeyHint="search"
            autoFocus
            defaultValue={params.get('q') ?? ''}
            placeholder="브랜드 · 메뉴 · 국가 · 키워드"
            aria-label="기사 검색"
            className="w-full pl-9"
          />
        </form>
      ) : null}
    </header>

    {/* ── PC 상단바 ── */}
    <header className="no-print hidden h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-white px-5 md:flex">
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
    </>
  )
}
