import Link from 'next/link'
import type { Kpi } from '@/lib/types'
import { Metric } from '@/components/ui/primitives'

/** §9 — KPI 카드 6개 (§28 너무 큰 카드 사용 금지) */
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line md:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Link
          key={kpi.key}
          href={kpi.href}
          className="group bg-white px-4 py-3 transition-colors hover:bg-blue-soft/40"
          title={kpi.hint}
        >
          <p className="truncate text-[13px] font-semibold leading-tight text-navy-800">
            {kpi.labelKo}
          </p>
          <p className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wide text-muted">
            {kpi.label}
          </p>

          <div className="mt-2.5 flex items-end justify-between gap-2">
            <Metric value={kpi.value} unit={kpi.unit} />
            {kpi.delta != null && kpi.delta !== 0 ? (
              <span className="pb-1 text-[11px] font-semibold text-navy-700 tabular">
                {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 text-[10.5px] leading-tight text-muted">
            {kpi.delta == null || kpi.delta === 0 ? '어제와 동일' : '어제 대비'}
          </p>
        </Link>
      ))}
    </div>
  )
}
