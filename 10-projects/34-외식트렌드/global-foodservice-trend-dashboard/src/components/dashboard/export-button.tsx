'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/primitives'

export type ExportResource =
  | 'articles'
  | 'trend-radar'
  | 'menu-trends'
  | 'brand-watch'
  | 'restaurant-tech'
  | 'expansion'
  | 'sources'

/** §30 — CSV / Excel Export */
export function ExportButton({
  resource,
  query = '',
}: {
  resource: ExportResource
  query?: string
}) {
  const base = `/api/export?resource=${resource}${query ? `&${query}` : ''}`
  return (
    <div className="flex items-center gap-1.5">
      <a href={`${base}&format=csv`} download>
        <Button>
          <Download className="h-3 w-3" aria-hidden />
          CSV
        </Button>
      </a>
      <a href={`${base}&format=xls`} download>
        <Button>
          <Download className="h-3 w-3" aria-hidden />
          Excel
        </Button>
      </a>
    </div>
  )
}
