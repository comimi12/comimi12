import Link from 'next/link'
import type { Kpi } from '@/lib/types'
import { Metric } from '@/components/ui/primitives'

/** §9 — KPI 카드 6개 (§28 너무 큰 카드 사용 금지) */
export function KpiCards({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-line bg-line xl:grid-cols-6">
      {kpis.map((kpi) => (
        <Link
          key={kpi.key}
          href={kpi.href}
          className="group bg-white px-3 py-2.5 transition-colors hover:bg-blue-soft/40 md:px-4 md:py-3"
          title={kpi.hint}
        >
          <p className="truncate text-[12px] font-semibold leading-tight text-navy-800 md:text-[13px]">
            {kpi.labelKo}
          </p>
          <p className="mt-0.5 hidden truncate text-[10px] font-medium uppercase tracking-wide text-muted md:block">
            {kpi.label}
          </p>

          <div className="mt-1.5 flex items-end md:mt-2.5 justify-between gap-2">
            <Metric value={kpi.value} unit={kpi.unit} />
            {kpi.delta != null && kpi.delta !== 0 ? (
              <span className="pb-1 text-[11px] font-semibold text-navy-700 tabular">
                {kpi.delta > 0 ? '▲' : '▼'} {Math.abs(kpi.delta)}
              </span>
            ) : null}
          </div>

          <p className="mt-1.5 hidden text-[10.5px] leading-tight text-muted md:block">
            {kpi.delta == null || kpi.delta === 0 ? '어제와 동일' : '어제 대비'}
          </p>
        </Link>
      ))}
    </div>
  )
}
