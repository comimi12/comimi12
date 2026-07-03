"use client";

import { useState } from "react";
import YearlySummary from "@/components/YearlySummary";
import ItemAnalysis from "@/components/ItemAnalysis";
import YearFilter from "@/components/YearFilter";
import { BarChart2, TrendingUp } from "lucide-react";

type View = "summary" | "item";

export default function DashboardPage() {
  const [view, setView] = useState<View>("summary");
  const [selectedYear, setSelectedYear] = useState<number | "all">("all");

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* 헤더 */}
      <header
        className="px-8 py-4 flex items-center justify-between shadow-sm"
        style={{ background: "var(--navy-800)" }}
      >
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">매출 보고 대시보드</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--navy-200)" }}>
            데이터 기준: 2025 ~ 2028 · 출처: 15-매출정보/매출정보 Excel
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "var(--navy-700)", color: "var(--navy-200)" }}>
          경영진 보고용
        </span>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* 탭 + 필터 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* 탭 */}
          <div
            className="flex rounded-lg p-1 gap-1"
            style={{ background: "var(--card)", border: "1px solid var(--border)" }}
          >
            <button
              onClick={() => setView("summary")}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: view === "summary" ? "var(--navy-800)" : "transparent",
                color: view === "summary" ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              <BarChart2 size={15} />
              연도별 총괄
            </button>
            <button
              onClick={() => setView("item")}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer"
              style={{
                background: view === "item" ? "var(--navy-800)" : "transparent",
                color: view === "item" ? "#ffffff" : "var(--text-secondary)",
              }}
            >
              <TrendingUp size={15} />
              항목별 분석
            </button>
          </div>

          {/* 연도 필터 */}
          <YearFilter selected={selectedYear} onChange={setSelectedYear} />
        </div>

        {/* 뷰 콘텐츠 */}
        {view === "summary" ? (
          <YearlySummary selectedYear={selectedYear} />
        ) : (
          <ItemAnalysis selectedYear={selectedYear} />
        )}
      </main>

      <footer
        className="text-center py-3 text-xs"
        style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}
      >
        매출 보고 대시보드 · 월 1회 갱신 · 내부 경영 보고용
      </footer>
    </div>
  );
}
