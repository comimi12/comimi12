"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { stores, Category, KpiKey, KPI_LABELS, getKpiValue } from "@/lib/data";

type Props = {
  selectedMonth: number;
  selectedKpi: KpiKey;
  selectedCategory: Category | "all";
};

const RATE_KEYS: KpiKey[] = ["operatingMargin", "costRate", "laborRate", "rentRate", "depreciationRate", "otherRate"];

export default function CompareView({ selectedMonth, selectedKpi, selectedCategory }: Props) {
  const filtered = stores.filter(
    (s) => selectedCategory === "all" || s.category === selectedCategory
  );

  const chartData = filtered
    .map((s) => {
      const m = s.monthly.find((x) => x.month === selectedMonth)!;
      const val = getKpiValue(m, selectedKpi);
      return {
        name: s.name.replace("점", ""),
        category: s.category,
        value: parseFloat(val.toFixed(1)),
      };
    })
    .sort((a, b) => b.value - a.value);

  const isRate = RATE_KEYS.includes(selectedKpi);
  const avg = chartData.reduce((s, d) => s + d.value, 0) / (chartData.length || 1);

  // 분류별 평균
  const catAvgMap: Record<string, number> = {};
  const cats = [...new Set(filtered.map((s) => s.category))];
  for (const cat of cats) {
    const items = filtered.filter((s) => s.category === cat).map((s) => {
      const m = s.monthly.find((x) => x.month === selectedMonth)!;
      return getKpiValue(m, selectedKpi);
    });
    catAvgMap[cat] = items.reduce((s, v) => s + v, 0) / items.length;
  }

  const catData = cats.map((cat) => ({
    name: cat,
    value: parseFloat(catAvgMap[cat].toFixed(1)),
  })).sort((a, b) => b.value - a.value);

  const COLORS = ["var(--navy-900)", "var(--navy-800)", "var(--navy-700)", "var(--navy-600)", "var(--navy-400)", "var(--navy-200)"];

  return (
    <div className="flex flex-col gap-6">
      {/* 차트 1: 전 매장 비교 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
          {selectedMonth}월 · {KPI_LABELS[selectedKpi]} — 전 매장 비교
        </h3>
        <p className="text-xs mb-4" style={{ color: "var(--text-secondary)" }}>
          전체 평균: {avg.toFixed(1)}{isRate ? "%" : ""}
        </p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-40}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => isRate ? `${v}%` : `${v}`}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}${isRate ? "%" : ""}`, KPI_LABELS[selectedKpi]]}
            />
            <ReferenceLine y={avg} stroke="var(--navy-400)" strokeDasharray="5 3" label={{ value: `평균 ${avg.toFixed(1)}${isRate ? "%" : ""}`, fontSize: 10, fill: "var(--navy-600)", position: "right" }} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={36}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    selectedKpi === "operatingMargin" && d.value < 0
                      ? "var(--down)"
                      : selectedKpi === "operatingMargin" && d.value < 5
                      ? "var(--warn)"
                      : "var(--navy-800)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 2: 분류별 평균 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          분류별 평균 {KPI_LABELS[selectedKpi]}
        </h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={catData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => isRate ? `${v}%` : `${v}`}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}${isRate ? "%" : ""}`, "평균"]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={60}>
              {catData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 순위표 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
          {selectedMonth}월 전 매장 순위표
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ color: "var(--text-primary)" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid var(--border)" }}>
                <th className="text-left pb-2 pr-3 font-semibold">순위</th>
                <th className="text-left pb-2 pr-3 font-semibold">매장명</th>
                <th className="text-left pb-2 pr-3 font-semibold">분류</th>
                <th className="text-right pb-2 font-semibold">{KPI_LABELS[selectedKpi]}</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((d, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td className="py-1.5 pr-3 font-bold" style={{ color: i === 0 ? "var(--navy-800)" : "var(--text-secondary)" }}>
                    {i + 1}
                  </td>
                  <td className="py-1.5 pr-3">{d.name}</td>
                  <td className="py-1.5 pr-3" style={{ color: "var(--text-secondary)" }}>{d.category}</td>
                  <td
                    className="py-1.5 text-right font-semibold"
                    style={{
                      color:
                        selectedKpi === "operatingMargin" && d.value < 0
                          ? "var(--down)"
                          : selectedKpi === "operatingMargin" && d.value >= 15
                          ? "var(--up)"
                          : "var(--text-primary)",
                    }}
                  >
                    {d.value}{isRate ? "%" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
