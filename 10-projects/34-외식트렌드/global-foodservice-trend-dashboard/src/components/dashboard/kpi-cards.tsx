import Link from 'next/link'
import type { Kpi } from '@/lib/types'
import { Metric } from '@/components/ui/primitives'

/** §9 — KPI 카드 6개 (§28 너무 큰 카드 사용 금지) */
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Link
          key={kpi.key}
          href={kpi.href}
          className="group bg-white px-3.5 py-2.5 transition-colors hover:bg-blue-soft/40"
        >
          <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
            {kpi.label}
          </p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <Metric value={kpi.value} unit={kpi.unit} />
            {kpi.delta != null && kpi.delta !== 0 ? (
              <span className="pb-0.5 text-[10.5px] font-medium text-navy-700 tabular">
                {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}
              </span>
            ) : (
              <span className="pb-0.5 text-[10.5px] text-muted/60">—</span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-muted">{kpi.hint}</p>
        </Link>
      ))}
    </div>
  )
}
