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
import KpiCard from "./KpiCard";
import {
  stores,
  Category,
  getAnomalyLevel,
  getTotalByMonth,
  THRESHOLDS,
} from "@/lib/data";

type Props = {
  selectedMonth: number;
  selectedCategory: Category | "all";
};

export default function OverviewView({ selectedMonth, selectedCategory }: Props) {
  const filtered = stores.filter(
    (s) => selectedCategory === "all" || s.category === selectedCategory
  );

  const storeMonthData = filtered.map((s) => {
    const m = s.monthly.find((x) => x.month === selectedMonth)!;
    return { store: s, m };
  });

  const totalRevenue = storeMonthData.reduce((sum, { m }) => sum + m.revenue, 0);
  const totalProfit = storeMonthData.reduce((sum, { m }) => sum + m.operatingProfit, 0);
  const avgMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // 이전 달 비교
  const prevMonth = selectedMonth > 1 ? selectedMonth - 1 : null;
  const prevData = prevMonth
    ? filtered.map((s) => s.monthly.find((x) => x.month === prevMonth)!)
    : null;
  const prevProfit = prevData ? prevData.reduce((s, m) => s + m.operatingProfit, 0) : null;
  const profitChange = prevProfit != null ? totalProfit - prevProfit : null;
  const profitChangeRate = prevProfit != null && prevProfit !== 0 ? ((totalProfit - prevProfit) / Math.abs(prevProfit)) * 100 : null;

  // 이상 매장 수
  const anomalyCount = storeMonthData.filter(
    ({ m }) =>
      m.laborRate >= THRESHOLDS.laborRate.danger ||
      m.operatingMargin <= THRESHOLDS.operatingMargin.danger ||
      m.costRate >= THRESHOLDS.costRate.danger
  ).length;

  // 차트 데이터 (영업이익율 순)
  const chartData = storeMonthData
    .map(({ store, m }) => ({
      name: store.name.replace("점", "").replace("잠실롯데", "잠실\n롯데"),
      margin: parseFloat(m.operatingMargin.toFixed(1)),
      profit: m.operatingProfit,
      labor: m.laborRate,
      cost: m.costRate,
    }))
    .sort((a, b) => b.margin - a.margin);

  const insights: string[] = [];
  storeMonthData.forEach(({ store, m }) => {
    if (m.laborRate >= THRESHOLDS.laborRate.danger)
      insights.push(`${store.name} 인건비율 ${m.laborRate.toFixed(1)}% — 즉각 검토 필요`);
    if (m.operatingMargin <= THRESHOLDS.operatingMargin.danger)
      insights.push(`${store.name} 영업이익율 ${m.operatingMargin.toFixed(1)}% — 적자 매장`);
  });

  return (
    <div className="flex flex-col gap-6">
      {/* KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label={`${selectedMonth}월 총 영업이익`}
          value={`${totalProfit > 0 ? "+" : ""}${totalProfit}백만`}
          sub={profitChange != null ? `전월 대비 ${profitChange > 0 ? "+" : ""}${profitChange}백만` : undefined}
          change={profitChangeRate}
          priority
        />
        <KpiCard
          label={`${selectedMonth}월 영업이익율`}
          value={`${avgMargin.toFixed(1)}%`}
          sub="전체 합계 기준"
          level={getAnomalyLevel("operatingMargin", avgMargin)}
        />
        <KpiCard
          label={`${selectedMonth}월 총 매출`}
          value={`${totalRevenue.toLocaleString()}백만`}
          sub={`${filtered.length}개 매장 합계`}
        />
        <KpiCard
          label="이상 매장 수"
          value={`${anomalyCount}개`}
          sub="인건비>45% or 적자"
          level={anomalyCount > 0 ? "danger" : "ok"}
        />
      </div>

      {/* 차트: 영업이익율 순위 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {selectedMonth}월 매장별 영업이익율 순위
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}%`, "영업이익율"]}
            />
            <ReferenceLine y={0} stroke="var(--border)" strokeWidth={1} />
            <Bar dataKey="margin" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={
                    d.margin <= THRESHOLDS.operatingMargin.danger
                      ? "var(--down)"
                      : d.margin <= THRESHOLDS.operatingMargin.warn
                      ? "var(--warn)"
                      : "var(--navy-800)"
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 차트: 인건비율 + 원가율 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          {selectedMonth}월 원가율 · 인건비율 (이상 탐지)
        </h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} margin={{ bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v, name) => [`${v}%`, name === "cost" ? "원가율" : "인건비율"]}
            />
            <ReferenceLine y={45} stroke="var(--down)" strokeDasharray="4 2" label={{ value: "인건비 위험(45%)", fontSize: 10, fill: "var(--down)", position: "right" }} />
            <ReferenceLine y={25} stroke="var(--warn)" strokeDasharray="4 2" label={{ value: "원가 위험(25%)", fontSize: 10, fill: "var(--warn)", position: "right" }} />
            <Bar dataKey="cost" name="cost" fill="var(--navy-400)" radius={[2, 2, 0, 0]} maxBarSize={20} />
            <Bar dataKey="labor" name="labor" fill="var(--navy-800)" radius={[2, 2, 0, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--navy-400)" }} />
            원가율
          </span>
          <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: "var(--navy-800)" }} />
            인건비율
          </span>
        </div>
      </div>

      {/* 인사이트 */}
      {insights.length > 0 && (
        <div
          className="rounded-xl px-5 py-4 border"
          style={{ background: "#fff5f5", borderColor: "#fca5a5" }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--down)" }}>
            이상 탐지 ({insights.length}건)
          </p>
          {insights.map((ins, i) => (
            <p key={i} className="text-xs mb-1" style={{ color: "var(--text-primary)" }}>
              • {ins}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
