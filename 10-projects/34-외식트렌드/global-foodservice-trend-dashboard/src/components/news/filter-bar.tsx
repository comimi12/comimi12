'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui/primitives'
import { CATEGORY_LABEL, CATEGORY_ORDER, REGION_ORDER } from '@/lib/categories'
import { cn } from '@/lib/utils'

/** §20 — 필수 필터: Date · Region · Country · Category · Brand · Score · Source */
export function FilterBar({
  countries,
  brands,
  sources,
}: {
  countries: string[]
  brands: string[]
  sources: string[]
}) {
  const router = useRouter()
  const params = useSearchParams()

  function set(key: string, value: string) {
    const sp = new URLSearchParams(params.toString())
    if (!value || value === 'ALL') sp.delete(key)
    else sp.set(key, value)
    router.push(`/news-feed?${sp.toString()}`)
  }

  const get = (key: string, fallback = 'ALL') => params.get(key) ?? fallback
  const range = get('range', '7D')
  const [more, setMore] = useState(false)
  // 상세 필터 중 몇 개가 걸려 있는지 — 접혀 있어도 알 수 있게 숫자로 보여준다.
  const extraCount = ['country', 'category', 'brand', 'source', 'minScore', 'dupes'].filter(
    (k) => params.get(k) && params.get(k) !== '0',
  ).length

  return (
    <div className="no-print grid grid-cols-2 items-end gap-x-2 gap-y-2 border-b border-line bg-white px-3 py-2.5 md:flex md:flex-wrap md:gap-x-3 md:px-5">
      <Field label="검색" className="col-span-2 md:col-span-1">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            set('q', String(new FormData(e.currentTarget).get('q') ?? ''))
          }}
        >
          <Input
            name="q"
            key={params.get('q') ?? ''}
            defaultValue={params.get('q') ?? ''}
            type="search"
            enterKeyHint="search"
            placeholder="브랜드 · 메뉴 · 국가 · 키워드"
            className="w-full md:w-[200px]"
          />
        </form>
      </Field>

      <Field label="Date">
        <Select value={range} onChange={(e) => set('range', e.target.value)}>
          <option value="TODAY">Today</option>
          <option value="7D">7 Days</option>
          <option value="30D">30 Days</option>
          <option value="90D">90 Days</option>
          <option value="CUSTOM">Custom</option>
          <option value="ALL">전체</option>
        </Select>
      </Field>

      {range === 'CUSTOM' ? (
        <>
          <Field label="From">
            <Input
              type="date"
              value={get('from', '')}
              onChange={(e) => set('from', e.target.value)}
              className="w-full md:w-[130px]"
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={get('to', '')}
              onChange={(e) => set('to', e.target.value)}
              className="w-full md:w-[130px]"
            />
          </Field>
        </>
      ) : null}

      <Field label="Region">
        <Select value={get('region')} onChange={(e) => set('region', e.target.value)}>
          <option value="ALL">전체</option>
          {REGION_ORDER.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </Select>
      </Field>

      {/* 스마트폰: 상세 필터는 접어둔다 */}
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className="col-span-2 flex h-9 items-center justify-center gap-1.5 rounded-md border border-line text-[13px] font-medium text-navy-800 md:hidden"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        상세 필터{extraCount ? ` (${extraCount})` : ''}
        <ChevronDown className={cn('h-4 w-4 transition-transform', more ? 'rotate-180' : '')} aria-hidden />
      </button>

      <div className={cn('col-span-2 grid-cols-2 gap-2 md:contents', more ? 'grid' : 'hidden')}>
      <Field label="Country">
        <Select value={get('country')} onChange={(e) => set('country', e.target.value)}>
          <option value="ALL">전체</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Category">
        <Select value={get('category')} onChange={(e) => set('category', e.target.value)}>
          <option value="ALL">전체</option>
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Brand">
        <Select value={get('brand')} onChange={(e) => set('brand', e.target.value)}>
          <option value="ALL">전체</option>
          {brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Source">
        <Select value={get('source')} onChange={(e) => set('source', e.target.value)}>
          <option value="ALL">전체</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Score">
        <Select value={get('minScore', '0')} onChange={(e) => set('minScore', e.target.value)}>
          <option value="0">전체</option>
          <option value="90">MUST KNOW (90+)</option>
          <option value="80">HIGH 이상 (80+)</option>
          <option value="70">WATCH 이상 (70+)</option>
          <option value="60">REFERENCE 이상 (60+)</option>
        </Select>
      </Field>

      <Field label="중복">
        <Select
          value={params.get('dupes') === '1' ? '1' : '0'}
          onChange={(e) => set('dupes', e.target.value === '1' ? '1' : '')}
        >
          <option value="0">대표 기사만</option>
          <option value="1">중복 포함</option>
        </Select>
      </Field>

      <Button onClick={() => router.push('/news-feed')} className="mb-px h-9 justify-center md:h-7">
        <RotateCcw className="h-3 w-3" aria-hidden />
        초기화
      </Button>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
  className,
}: {
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-0.5', className)}>
      <span className="text-[9.5px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
      {children}
    </label>
  )
}
