"use client";

import { stores, calcEbitda, getAnomalyLevel, Category } from "@/lib/data";

type KpiRow = {
  key: string;
  label: string;
  unit: "million" | "percent" | "count" | "won";
  getValue: (m: {
    revenue: number; operatingProfit: number; operatingMargin: number;
    costRate: number; laborRate: number; rentRate: number;
    depreciationRate: number; otherRate: number; ordinaryMargin: number;
    customers: number; avgSpend: number;
  }) => number;
  threshold?: { warn: number; danger: number; direction: "high" | "low" };
};

const KPI_ROWS: KpiRow[] = [
  {
    key: "revenue", label: "매출", unit: "million",
    getValue: (m) => m.revenue,
  },
  {
    key: "operatingProfit", label: "영업이익", unit: "million",
    getValue: (m) => m.operatingProfit,
    threshold: { warn: 0, danger: -10, direction: "low" },
  },
  {
    key: "operatingMargin", label: "영업이익율", unit: "percent",
    getValue: (m) => m.operatingMargin,
    threshold: { warn: 0, danger: -5, direction: "low" },
  },
  {
    key: "ebitda", label: "EBITDA", unit: "million",
    getValue: (m) => {
      const ebitda = m.operatingProfit + (m.revenue * m.depreciationRate) / 100;
      return parseFloat(ebitda.toFixed(1));
    },
  },
  {
    key: "costRate", label: "원가율", unit: "percent",
    getValue: (m) => m.costRate,
    threshold: { warn: 23, danger: 25, direction: "high" },
  },
  {
    key: "laborRate", label: "인건비율", unit: "percent",
    getValue: (m) => m.laborRate,
    threshold: { warn: 40, danger: 45, direction: "high" },
  },
  {
    key: "rentRate", label: "임차관리비율", unit: "percent",
    getValue: (m) => m.rentRate,
    threshold: { warn: 15, danger: 20, direction: "high" },
  },
  {
    key: "depreciationRate", label: "감가상각비율", unit: "percent",
    getValue: (m) => m.depreciationRate,
  },
  {
    key: "otherRate", label: "기타경비율", unit: "percent",
    getValue: (m) => m.otherRate,
  },
  {
    key: "ordinaryMargin", label: "경상이익율", unit: "percent",
    getValue: (m) => m.ordinaryMargin,
    threshold: { warn: 0, danger: -5, direction: "low" },
  },
  {
    key: "customers", label: "객수", unit: "count",
    getValue: (m) => m.customers,
  },
  {
    key: "avgSpend", label: "객단가", unit: "won",
    getValue: (m) => m.avgSpend,
  },
];

function fmt(value: number, unit: KpiRow["unit"]): string {
  if (unit === "million") return value === 0 ? "—" : `${value > 0 ? "" : ""}${value}`;
  if (unit === "percent") return value === 0 ? "0%" : `${value.toFixed(1)}%`;
  if (unit === "count") return value === 0 ? "—" : value.toLocaleString();
  if (unit === "won") return value === 0 ? "—" : `${Math.round(value / 1000).toLocaleString()}천`;
  return String(value);
}

function getCellColor(
  value: number,
  threshold: KpiRow["threshold"]
): string {
  if (!threshold) return "inherit";
  const { warn, danger, direction } = threshold;
  if (direction === "low") {
    if (value <= danger) return "var(--down)";
    if (value <= warn) return "var(--warn)";
    return "var(--up)";
  } else {
    if (value >= danger) return "var(--down)";
    if (value >= warn) return "var(--warn)";
    return "inherit";
  }
}

function getCellBg(value: number, threshold: KpiRow["threshold"]): string {
  if (!threshold) return "transparent";
  const { warn, danger, direction } = threshold;
  if (direction === "low") {
    if (value <= danger) return "#fee2e2";
    if (value <= warn) return "#fef3c7";
    return "transparent";
  } else {
    if (value >= danger) return "#fee2e2";
    if (value >= warn) return "#fef3c7";
    return "transparent";
  }
}

const CATEGORY_ORDER: Category[] = ["BLACK", "DINING", "UCD", "JUCD", "ND", "CD"];
const MONTHS = [1, 2, 3, 4, 5] as const;

type Props = {
  selectedCategory: Category | "all";
  onStoreClick?: (storeId: string) => void;
};

export default function ReportTable({ selectedCategory, onStoreClick }: Props) {
  const filteredStores = stores.filter(
    (s) => selectedCategory === "all" || s.category === selectedCategory
  );

  const sorted = [...filteredStores].sort(
    (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
  );

  const colW = "68px";
  const labelW = "90px";
  const storeW = "88px";
  const catW = "48px";

  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm" style={{ background: "var(--card)", borderColor: "var(--border)" }}>
      <table className="text-xs border-collapse" style={{ minWidth: 900, color: "var(--text-primary)" }}>
        <thead>
          <tr style={{ background: "var(--navy-800)", color: "#fff" }}>
            <th
              className="sticky left-0 z-20 text-left px-2 py-2.5 font-semibold"
              style={{ background: "var(--navy-800)", width: catW, minWidth: catW }}
            >
              분류
            </th>
            <th
              className="sticky text-left px-2 py-2.5 font-semibold"
              style={{ background: "var(--navy-800)", left: catW, width: storeW, minWidth: storeW }}
            >
              매장명
            </th>
            <th
              className="sticky text-left px-2 py-2.5 font-semibold"
              style={{ background: "var(--navy-800)", left: `calc(${catW} + ${storeW})`, width: labelW, minWidth: labelW }}
            >
              P&L 항목
            </th>
            {MONTHS.map((m) => (
              <th key={m} className="text-right px-2 py-2.5 font-semibold" style={{ width: colW, minWidth: colW }}>
                {m}월
              </th>
            ))}
            <th className="text-right px-2 py-2.5 font-semibold" style={{ width: colW, minWidth: colW, background: "var(--navy-700)" }}>
              1-5월 누계
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((store, si) => {
            const isLast = si === sorted.length - 1;
            const isNewCat =
              si === 0 || sorted[si - 1].category !== store.category;

            return KPI_ROWS.map((kpi, ki) => {
              const isFirst = ki === 0;
              const isLastKpi = ki === KPI_ROWS.length - 1;
              const rowBorder = isLastKpi && !isLast ? "2px solid var(--navy-200)" : "1px solid var(--border)";

              // 누계 계산
              const cumValue = store.monthly.reduce((sum, m) => sum + kpi.getValue(m), 0);
              const cumDisplay =
                kpi.unit === "percent"
                  ? store.monthly.length > 0
                    ? fmt(store.monthly.reduce((sum, m) => sum + kpi.getValue(m), 0) / store.monthly.length, "percent")
                    : "—"
                  : fmt(cumValue, kpi.unit);

              return (
                <tr
                  key={`${store.id}-${kpi.key}`}
                  style={{ borderBottom: rowBorder }}
                >
                  {/* 분류 */}
                  <td
                    className="sticky left-0 z-10 px-2 py-1.5 font-semibold"
                    style={{
                      background: isFirst ? (isNewCat ? "var(--navy-50)" : "var(--card)") : "var(--card)",
                      width: catW,
                      borderRight: "1px solid var(--border)",
                      color: "var(--navy-800)",
                      verticalAlign: "top",
                    }}
                  >
                    {isFirst && isNewCat ? store.category : ""}
                  </td>

                  {/* 매장명 */}
                  <td
                    className="sticky px-2 py-1.5 font-medium"
                    style={{
                      background: "var(--card)",
                      left: catW,
                      width: storeW,
                      borderRight: "1px solid var(--border)",
                      verticalAlign: "top",
                      cursor: isFirst && onStoreClick ? "pointer" : "default",
                    }}
                    onClick={() => isFirst && onStoreClick && onStoreClick(store.id)}
                  >
                    {isFirst ? (
                      <span>
                        <span
                          className="block"
                          style={{
                            color: onStoreClick ? "var(--navy-700)" : "inherit",
                            textDecoration: onStoreClick ? "underline" : "none",
                            textDecorationColor: "var(--navy-400)",
                            textUnderlineOffset: "2px",
                          }}
                        >
                          {store.name}
                        </span>
                        {store.leaseExpiry && (
                          <span
                            className="block text-[10px] mt-0.5"
                            style={{ color: store.leaseExpiry <= "2026-12-31" ? "var(--down)" : "var(--text-secondary)" }}
                          >
                            만료: {store.leaseExpiry}
                          </span>
                        )}
                        {store.improvement1 && (
                          <span className="block text-[9px] mt-0.5" style={{ color: "var(--navy-600)" }}>
                            ▶ {store.improvement1}
                          </span>
                        )}
                      </span>
                    ) : (
                      ""
                    )}
                  </td>

                  {/* P&L 항목명 */}
                  <td
                    className="sticky px-2 py-1.5"
                    style={{
                      background: "var(--card)",
                      left: `calc(${catW} + ${storeW})`,
                      width: labelW,
                      borderRight: "2px solid var(--border)",
                      color: "var(--text-secondary)",
                      fontWeight: kpi.key === "operatingMargin" || kpi.key === "revenue" ? 600 : 400,
                    }}
                  >
                    {kpi.label}
                  </td>

                  {/* 월별 데이터 */}
                  {MONTHS.map((month) => {
                    const m = store.monthly.find((x) => x.month === month);
                    const val = m ? kpi.getValue(m) : null;
                    const bg = val != null && kpi.threshold ? getCellBg(val, kpi.threshold) : "transparent";
                    const color = val != null && kpi.threshold ? getCellColor(val, kpi.threshold) : "var(--text-primary)";

                    return (
                      <td
                        key={month}
                        className="text-right px-2 py-1.5 tabular-nums"
                        style={{
                          background: bg,
                          color,
                          fontWeight: kpi.key === "operatingMargin" || kpi.key === "operatingProfit" ? 600 : 400,
                        }}
                      >
                        {val != null ? fmt(val, kpi.unit) : "—"}
                      </td>
                    );
                  })}

                  {/* 누계 */}
                  <td
                    className="text-right px-2 py-1.5 tabular-nums font-semibold"
                    style={{ background: "var(--navy-50)", color: "var(--navy-800)" }}
                  >
                    {cumDisplay}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
