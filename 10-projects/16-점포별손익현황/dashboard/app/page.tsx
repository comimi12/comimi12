"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { stores, MONTHS, CATEGORIES, KPI_LABELS, KpiKey, Category } from "@/lib/data";
import AlertBell from "@/components/AlertBell";

const OverviewView = dynamic(() => import("@/components/OverviewView"), { ssr: false });
const DrilldownView = dynamic(() => import("@/components/DrilldownView"), { ssr: false });
const CompareView = dynamic(() => import("@/components/CompareView"), { ssr: false });
const ReportTable = dynamic(() => import("@/components/ReportTable"), { ssr: false });

type View = "overview" | "drilldown" | "compare" | "report";

const KPI_OPTIONS: KpiKey[] = [
  "operatingMargin",
  "revenue",
  "operatingProfit",
  "ebitda",
  "costRate",
  "laborRate",
  "rentRate",
  "depreciationRate",
  "customers",
  "avgSpend",
];

export default function Page() {
  const [view, setView] = useState<View>("report");
  const [prevView, setPrevView] = useState<View | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(5);
  const [selectedStore, setSelectedStore] = useState<string>(stores[0].id);
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">("all");
  const [selectedKpi, setSelectedKpi] = useState<KpiKey>("operatingMargin");

  const tabs: { key: View; label: string }[] = [
    { key: "report", label: "실적표 (PDF형식)" },
    { key: "overview", label: "전체 요약" },
    { key: "drilldown", label: "매장 드릴다운" },
    { key: "compare", label: "KPI 비교" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      {/* 헤더 */}
      <header
        className="sticky top-0 z-40 px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--navy-800)", boxShadow: "0 2px 8px rgba(0,48,135,0.25)" }}
      >
        <div>
          <h1 className="text-base font-bold text-white">점포별 손익현황</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
            Chai797 브랜드 · 2026년 1~5월 · 단위: 백만원
          </p>
        </div>
        <AlertBell />
      </header>

      {/* 탭 + 필터 */}
      <div
        className="sticky top-14 z-30 px-6 py-3 flex flex-wrap gap-3 items-center justify-between"
        style={{ background: "var(--card)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex gap-1 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => { setView(t.key); setPrevView(null); }}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: view === t.key ? "var(--navy-800)" : "transparent",
                color: view === t.key ? "#fff" : "var(--text-secondary)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* 월 선택 (실적표/전체요약/비교) */}
          {view !== "drilldown" && view !== "report" && (
            <div className="flex gap-1">
              {MONTHS.map((m) => (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                  style={{
                    background: selectedMonth === m ? "var(--navy-800)" : "var(--bg)",
                    color: selectedMonth === m ? "#fff" : "var(--text-secondary)",
                  }}
                >
                  {m}월
                </button>
              ))}
            </div>
          )}

          {/* 매장 선택 (드릴다운) */}
          {view === "drilldown" && (
            <select
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.category}] {s.name}
                </option>
              ))}
            </select>
          )}

          {/* 분류 필터 (실적표/전체요약/KPI비교) */}
          {view !== "drilldown" && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as Category | "all")}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              <option value="all">전체 분류</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

          {/* KPI 선택 (비교 뷰) */}
          {view === "compare" && (
            <select
              value={selectedKpi}
              onChange={(e) => setSelectedKpi(e.target.value as KpiKey)}
              className="rounded-lg border px-3 py-1.5 text-xs"
              style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text-primary)" }}
            >
              {KPI_OPTIONS.map((k) => (
                <option key={k} value={k}>{KPI_LABELS[k]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* 콘텐츠 */}
      <main className="px-4 py-6 max-w-screen-2xl mx-auto">
        {view === "report" && (
          <ReportTable
            selectedCategory={selectedCategory}
            onStoreClick={(storeId) => {
              setSelectedStore(storeId);
              setPrevView("report");
              setView("drilldown");
            }}
          />
        )}
        {view === "overview" && (
          <OverviewView selectedMonth={selectedMonth} selectedCategory={selectedCategory} />
        )}
        {view === "drilldown" && (
          <DrilldownView
            storeId={selectedStore}
            onBack={prevView === "report" ? () => { setPrevView(null); setView("report"); } : undefined}
          />
        )}
        {view === "compare" && (
          <CompareView
            selectedMonth={selectedMonth}
            selectedKpi={selectedKpi}
            selectedCategory={selectedCategory}
          />
        )}
      </main>

      <footer className="px-6 py-4 text-center text-xs" style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}>
        출처: (5월누계)점포별 월별 실적표 v0(260624).pdf + 매장부문 기준정보 v3.xlsx · 갱신: 2026-06-24
      </footer>
    </div>
  );
}
