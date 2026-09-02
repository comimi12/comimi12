import { NextResponse } from 'next/server'
import type { ArticleFilters, DateRangeKey, Region, TrendCategory } from './types'
import { dataMode } from './db'

/** 모든 API 응답 공통 봉투 */
export function ok<T>(data: T, extra?: Record<string, unknown>) {
  return NextResponse.json({
    ok: true,
    mode: dataMode(),
    generatedAt: new Date().toISOString(),
    ...extra,
    data,
  })
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

/** 쿼리스트링 → ArticleFilters (§19, §20) */
export function filtersFromSearchParams(sp: URLSearchParams): ArticleFilters {
  const num = (key: string) => (sp.get(key) ? Number(sp.get(key)) : undefined)
  return {
    q: sp.get('q') ?? undefined,
    region: (sp.get('region') as Region | null) ?? 'ALL',
    country: sp.get('country') ?? undefined,
    category: (sp.get('category') as TrendCategory | null) ?? 'ALL',
    brand: sp.get('brand') ?? undefined,
    source: sp.get('source') ?? undefined,
    minScore: num('minScore'),
    range: (sp.get('range') as DateRangeKey | null) ?? 'ALL',
    from: sp.get('from') ?? undefined,
    to: sp.get('to') ?? undefined,
    includeDuplicates: sp.get('dupes') === '1',
  }
}
