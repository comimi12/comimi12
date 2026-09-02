'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

/** §8 최소한의 색상 — 네이비/블루 단일 계열 */
export const SERIES = ['#0F2F54', '#0B63CE', '#2C4A7C', '#5E8FCB', '#A9C4E6']

const AXIS = { fontSize: 10, fill: '#5b6b7f' }
const GRID = '#e3e8ef'

const tooltipStyle = {
  fontSize: 11,
  borderRadius: 4,
  border: '1px solid #e3e8ef',
  boxShadow: '0 2px 8px rgba(15,47,84,.08)',
} as const

/** §22-1 Region별 기사량 */
export function RegionBarChart({ data }: { data: { region: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="region" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}건`, '기사']} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[i % SERIES.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** §22-2 Category별 기사량 */
export function CategoryBarChart({ data }: { data: { label: string; count: number }[] }) {
  const height = Math.max(200, data.length * 20 + 20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={96}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}건`, '기사']} />
        <Bar dataKey="count" fill="#0B63CE" radius={[0, 2, 2, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** §22-3 30일 Trend Keyword 변화 */
export function KeywordTimelineChart({
  keys,
  rows,
}: {
  keys: string[]
  rows: Record<string, string | number>[]
}) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={rows} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="bucket" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 10 }} iconSize={8} />
        {keys.map((k, i) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            stroke={SERIES[i % SERIES.length]}
            strokeWidth={1.8}
            dot={{ r: 2 }}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** §22-4 Brand Mention Ranking */
export function BrandRankingChart({ data }: { data: { brand: string; count: number }[] }) {
  const height = Math.max(200, data.length * 22 + 20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="brand"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={132}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}건`, '언급']} />
        <Bar dataKey="count" fill="#0F2F54" radius={[0, 2, 2, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** §22-5 Trend Score Distribution */
export function ScoreDistributionChart({
  data,
}: {
  data: { label: string; count: number }[]
}) {
  return (
    <ResponsiveContainer width="100%" height={190}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ ...AXIS, fontSize: 9 }}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          interval={0}
        />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}건`, '기사']} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={SERIES[Math.min(i, SERIES.length - 1)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** §22-6 Expansion Country Ranking */
export function ExpansionCountryChart({
  data,
}: {
  data: { country: string; count: number }[]
}) {
  const height = Math.max(180, data.length * 22 + 20)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={AXIS} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="country"
          tick={AXIS}
          tickLine={false}
          axisLine={{ stroke: GRID }}
          width={48}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}건`, '발표']} />
        <Bar dataKey="count" fill="#2C4A7C" radius={[0, 2, 2, 0]} maxBarSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}
