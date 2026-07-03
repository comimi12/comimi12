"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import KpiCard from "./KpiCard";
import { stores, calcEbitda, getAnomalyLevel } from "@/lib/data";

type Props = {
  storeId: string;
  onBack?: () => void;
};

export default function DrilldownView({ storeId, onBack }: Props) {
  const store = stores.find((s) => s.id === storeId);
  if (!store) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>매장을 선택해 주세요.</p>;

  const latest = store.monthly[store.monthly.length - 1];
  const prev = store.monthly.length > 1 ? store.monthly[store.monthly.length - 2] : null;
  const ebitda = calcEbitda(latest);
  const prevEbitda = prev ? calcEbitda(prev) : null;
  const ebitdaChange = prevEbitda != null && prevEbitda !== 0 ? ((ebitda - prevEbitda) / Math.abs(prevEbitda)) * 100 : null;

  const monthlyChart = store.monthly.map((m) => ({
    month: `${m.month}월`,
    매출: m.revenue,
    영업이익: m.operatingProfit,
    EBITDA: parseFloat(calcEbitda(m).toFixed(1)),
  }));

  const costChart = store.monthly.map((m) => ({
    month: `${m.month}월`,
    원가율: m.costRate,
    인건비율: m.laborRate,
    임차료율: m.rentRate,
    감가상각비율: m.depreciationRate,
  }));

  const customerChart = store.monthly
    .filter((m) => m.customers > 0)
    .map((m) => ({
      month: `${m.month}월`,
      객수: m.customers,
      객단가: Math.round(m.avgSpend / 1000), // 천원 단위
    }));

  const hasCustomer = customerChart.length > 0;

  // 연속 적자 체크
  const consecutive = store.monthly.filter((m) => m.operatingMargin < 0).length;

  const insights: string[] = [];
  if (latest.laborRate >= 45) insights.push(`인건비율 ${latest.laborRate.toFixed(1)}% — 즉각 검토`);
  if (prev && latest.laborRate - prev.laborRate >= 5) insights.push(`인건비율 전월 대비 +${(latest.laborRate - prev.laborRate).toFixed(1)}%p 급등`);
  if (consecutive >= 3) insights.push(`${consecutive}개월 연속 영업적자 — 구조개선 시급`);
  if (prev && latest.revenue < prev.revenue && latest.costRate > prev.costRate) insights.push(`매출 감소 + 원가율 상승 동시 감지`);
  if (store.improvement1) insights.push(`개선방향: ${store.improvement1}`);

  return (
    <div className="flex flex-col gap-6">
      {/* 뒤로가기 */}
      {onBack && (
        <button
          onClick={onBack}
          className="self-start flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
          style={{ background: "var(--navy-50)", color: "var(--navy-800)", border: "1px solid var(--navy-200)" }}
        >
          ← 실적표로 돌아가기
        </button>
      )}
      {/* 매장 정보 */}
      <div
        className="rounded-xl px-5 py-4 border"
        style={{ background: "var(--navy-50)", borderColor: "var(--navy-200)" }}
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>분류</p>
            <p className="text-sm font-semibold" style={{ color: "var(--navy-800)" }}>{store.category}</p>
          </div>
          {store.leaseExpiry && (
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>임대차 만료</p>
              <p className="text-sm font-semibold" style={{ color: store.leaseExpiry <= "2026-12-31" ? "var(--down)" : "var(--text-primary)" }}>
                {store.leaseExpiry}
              </p>
            </div>
          )}
          {store.improvement1 && (
            <div>
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>개선방향</p>
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                {store.improvement1} / {store.improvement2 || "—"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard
          label="5월 영업이익"
          value={`${latest.operatingProfit > 0 ? "+" : ""}${latest.operatingProfit}백만`}
          sub={prev ? `전월 ${prev.operatingProfit > 0 ? "+" : ""}${prev.operatingProfit}백만` : undefined}
          priority
          level={getAnomalyLevel("operatingMargin", latest.operatingMargin)}
        />
        <KpiCard
          label="5월 영업이익율"
          value={`${latest.operatingMargin.toFixed(1)}%`}
          level={getAnomalyLevel("operatingMargin", latest.operatingMargin)}
        />
        <KpiCard
          label="5월 EBITDA"
          value={`${ebitda.toFixed(1)}백만`}
          sub="영업이익+감가상각"
          change={ebitdaChange}
        />
        {hasCustomer ? (
          <KpiCard
            label="5월 객단가"
            value={latest.avgSpend > 0 ? `${(latest.avgSpend / 1000).toFixed(0)}천원` : "—"}
            sub={latest.customers > 0 ? `객수 ${latest.customers.toLocaleString()}명` : undefined}
          />
        ) : (
          <KpiCard label="5월 인건비율" value={`${latest.laborRate.toFixed(1)}%`} level={getAnomalyLevel("laborRate", latest.laborRate)} />
        )}
      </div>

      {/* 차트 1: 매출 / 영업이익 / EBITDA */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          월별 매출 · 영업이익 · EBITDA 추이 (백만원)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={monthlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="매출" stroke="var(--navy-200)" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="영업이익" stroke="var(--navy-800)" strokeWidth={2.5} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="EBITDA" stroke="var(--navy-400)" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 2: 비율 추이 */}
      <div
        className="rounded-xl p-5 shadow-sm border"
        style={{ background: "var(--card)", borderColor: "var(--border)" }}
      >
        <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
          월별 원가율 · 인건비율 · 임차료율 · 감가상각비율 추이 (%)
        </h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={costChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}%`]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="원가율" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="인건비율" stroke="var(--navy-800)" strokeWidth={2.5} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="임차료율" stroke="var(--warn)" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="감가상각비율" stroke="#a855f7" strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 차트 3: 객수 / 객단가 (데이터 있을 때만) */}
      {hasCustomer && (
        <div
          className="rounded-xl p-5 shadow-sm border"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>
            월별 객수 · 객단가 추이
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={customerChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}천`} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(v, name) => [name === "객단가" ? `${v}천원` : `${(v as number).toLocaleString()}명`, name]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="객수" fill="var(--navy-800)" radius={[3, 3, 0, 0]} maxBarSize={36} />
              <Line yAxisId="right" type="monotone" dataKey="객단가" stroke="var(--warn)" strokeWidth={2} dot={{ r: 4 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 인사이트 */}
      {insights.length > 0 && (
        <div
          className="rounded-xl px-5 py-4 border"
          style={{ background: "var(--navy-50)", borderLeft: "3px solid var(--navy-400)" }}
        >
          <p className="text-sm font-semibold mb-2" style={{ color: "var(--navy-800)" }}>인사이트</p>
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
