"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { getItemRevenueByYear, getItemTrend, ITEMS } from "@/lib/data";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  selectedYear: number | "all";
};

const ITEM_COLORS: Record<string, string> = {
  A: "#003087",
  B: "#1a4fa8",
  C: "#4a7fd4",
  D: "#a8c4e8",
};

export default function ItemAnalysis({ selectedYear }: Props) {
  const displayYear = selectedYear === "all" ? 2026 : selectedYear;
  const items = getItemRevenueByYear(displayYear);
  const totalRevenue = items.reduce((s, i) => s + i.revenue, 0);
  const trendData = getItemTrend();

  const topItem = [...items].sort((a, b) => b.revenue - a.revenue)[0];
  const highestGrowth = [...items]
    .filter((i) => i.change != null)
    .sort((a, b) => (b.change ?? 0) - (a.change ?? 0))[0];

  return (
    <div className="flex flex-col gap-6">
      {/* 항목별 KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {items.map((item) => {
          const pct = Math.round((item.revenue / totalRevenue) * 100);
          const isUp = item.change != null && item.change > 0;
          const isDown = item.change != null && item.change < 0;
          return (
            <div
              key={item.item}
              className="rounded-xl p-4 shadow-sm border flex flex-col gap-1.5"
              style={{ background: "var(--card)", borderColor: "var(--border)" }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                  항목 {item.item}
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "var(--navy-50)", color: "var(--navy-800)" }}
                >
                  {pct}%
                </span>
              </div>
              <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {item.revenue.toLocaleString()}
              </span>
              {item.change != null && (
                <div
                  className="flex items-center gap-1 text-xs font-medium"
                  style={{ color: isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-secondary)" }}
                >
                  {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {isUp ? "+" : ""}{item.change} (전년 대비)
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 차트 1: 항목별 매출 비교 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {displayYear}년 항목별 매출 비교
        </h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart
            data={items.map((i) => ({ 항목: `항목 ${i.item}`, 매출: i.revenue }))}
            barSize={52}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="항목" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              formatter={(v) => [(v as number).toLocaleString(), "매출"]}
            />
            <Bar dataKey="매출" fill="var(--navy-800)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 2: 항목별 4개년 추이 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          항목별 연도별 매출 추이 (2025~2028)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}년`} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              formatter={(v, name) => [(v as number).toLocaleString(), `항목 ${name}`]}
            />
            <Legend formatter={(v) => `항목 ${v}`} />
            {ITEMS.map((item) => (
              <Line
                key={item}
                type="monotone"
                dataKey={item}
                stroke={ITEM_COLORS[item]}
                strokeWidth={2.5}
                dot={{ r: 4, fill: ITEM_COLORS[item] }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* AI 인사이트 */}
        {highestGrowth && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--navy-50)", borderLeft: "3px solid var(--navy-400)", color: "var(--text-primary)" }}
          >
            <span className="font-semibold">인사이트 제안 · </span>
            {displayYear}년 기준 항목 {highestGrowth.item}의 전년 대비 증감(+{highestGrowth.change})이 가장 높습니다.
            비중 확대를 검토해볼 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
