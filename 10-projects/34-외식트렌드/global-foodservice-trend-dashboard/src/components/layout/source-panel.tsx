'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Rss } from 'lucide-react'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import type { Region } from '@/lib/types'
import { cn } from '@/lib/utils'

/** 사이드바 최상단 — 지금 어떤 매체에서 기사를 긁어오는지 한눈에 보여준다. */
export interface PanelSource {
  id: string
  name: string
  url: string
  region: Region
  country: string
  count: number
}

/** 사이드바 폭(212px)에 맞춰 긴 매체명만 줄여 쓴다. */
const SHORT_NAME: Record<string, string> = {
  'scmp-food': 'SCMP Food',
  'restaurant-industry-uk': 'Restaurant Industry UK',
  'mercado-consumo': 'Mercado & Consumo',
  nrn: "Nation's Restaurant News",
}

export function SourcePanel({
  sources,
  skipped,
}: {
  sources: PanelSource[]
  skipped: number
}) {
  const [open, setOpen] = useState(true)

  const groups = REGION_ORDER.map((region) => ({
    region,
    items: sources.filter((s) => s.region === region),
  })).filter((g) => g.items.length > 0)

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-1 px-4 py-2 hover:bg-canvas"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <Rss className="h-3 w-3 shrink-0 text-blue-accent" aria-hidden />
          <span className="truncate text-[9.5px] font-semibold tracking-[0.1em] text-muted">
            SOURCES · 수집 출처
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          <span className="rounded bg-blue-soft px-1 py-px text-[9.5px] font-semibold text-blue-accent">
            {sources.length}
          </span>
          <ChevronDown
            className={cn(
              'h-3 w-3 text-muted transition-transform',
              open ? '' : '-rotate-90',
            )}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <div className="max-h-[196px] overflow-y-auto px-2 pb-2">
          {groups.map((g) => (
            <div key={g.region} className="mb-1">
              <p className="px-2 pb-0.5 pt-1 text-[9px] font-semibold tracking-[0.1em] text-muted/70">
                {REGION_LABEL_KO[g.region]}
              </p>
              {g.items.map((s) => (
                <a
                  key={s.id}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${s.name} (${s.country}) — 수집 ${s.count}건`}
                  className="flex items-center justify-between gap-1 rounded px-2 py-[3px] hover:bg-blue-soft/60"
                >
                  <span className="truncate text-[10.5px] leading-tight text-navy-700">
                    {SHORT_NAME[s.id] ?? s.name}
                  </span>
                  <span className="shrink-0 text-[9.5px] tabular-nums text-muted">
                    {s.count}
                  </span>
                </a>
              ))}
            </div>
          ))}

          <p className="px-2 pt-1 text-[9.5px] leading-relaxed text-muted">
            RSS 미제공 {skipped}곳은 수집 제외
          </p>
          <Link
            href="/sources"
            className="block px-2 pt-0.5 text-[9.5px] font-medium text-blue-accent hover:underline"
          >
            소스 전체 보기 →
          </Link>
        </div>
      ) : null}
    </div>
  )
}
