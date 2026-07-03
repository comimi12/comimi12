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
import KpiCard from "./KpiCard";
import { getYearlyTotals, getYoyChange, YEARS } from "@/lib/data";

type Props = {
  selectedYear: number | "all";
};

export default function YearlySummary({ selectedYear }: Props) {
  const totals = getYearlyTotals();
  const grandTotal = totals.reduce((s, t) => s + t.total, 0);

  const displayYear = selectedYear === "all" ? 2026 : selectedYear;
  const current = totals.find((t) => t.year === displayYear);
  const yoy = getYoyChange(displayYear);

  const barData =
    selectedYear === "all"
      ? totals.map((t) => ({ year: `${t.year}년`, 매출: t.total }))
      : totals
          .filter((t) => t.year === selectedYear)
          .map((t) => ({ year: `${t.year}년`, 매출: t.total }));

  const rateData = YEARS.slice(1).map((year) => {
    const r = getYoyChange(year);
    return { year: `${year}년`, 증감률: r?.rate ?? 0 };
  });

  const insightRate = rateData.map((d) => d.증감률);
  const isDeclineTrend =
    insightRate.length >= 2 &&
    insightRate.every((v, i) => i === 0 || v < insightRate[i - 1]);

  return (
    <div className="flex flex-col gap-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={`${displayYear}년 총 매출`}
          value={(current?.total ?? 0).toLocaleString()}
          sub="출처: 매출정보 Excel"
          change={yoy?.rate ?? null}
          priority
        />
        <KpiCard
          label="전년 대비 증감액"
          value={yoy ? `${yoy.change > 0 ? "+" : ""}${yoy.change.toLocaleString()}` : "—"}
          sub={`${displayYear - 1}년 → ${displayYear}년`}
          change={yoy?.rate ?? null}
        />
        <KpiCard
          label="4개년 누적 합계"
          value={grandTotal.toLocaleString()}
          sub="2025 ~ 2028"
        />
      </div>

      {/* 차트 1: 연도별 총 매출 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          연도별 총 매출 비교
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={selectedYear === "all" ? totals.map((t) => ({ year: `${t.year}년`, 매출: t.total })) : barData} barSize={48}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              formatter={(v) => [(v as number).toLocaleString(), "매출"]}
            />
            <Bar dataKey="매출" fill="var(--navy-800)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 2: 전년 대비 증감률 추이 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          전년 대비 증감률 추이
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={rateData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="year" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }}
              formatter={(v) => [`${v}%`, "증감률"]}
            />
            <Line type="monotone" dataKey="증감률" stroke="var(--navy-400)" strokeWidth={2.5} dot={{ r: 5, fill: "var(--navy-800)" }} />
          </LineChart>
        </ResponsiveContainer>

        {/* AI 인사이트 */}
        {isDeclineTrend && (
          <div
            className="mt-4 rounded-lg px-4 py-3 text-sm"
            style={{ background: "var(--navy-50)", borderLeft: "3px solid var(--navy-400)", color: "var(--text-primary)" }}
          >
            <span className="font-semibold">인사이트 제안 · </span>
            매출 성장률이 3년 연속 감소 추세입니다 ({rateData.map((d) => `${d.증감률}%`).join(" → ")}). 성장 동력 점검이 필요할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}
