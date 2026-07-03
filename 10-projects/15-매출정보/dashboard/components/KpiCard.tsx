"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
  changeLabel?: string;
  priority?: boolean;
};

export default function KpiCard({ label, value, sub, change, changeLabel, priority }: Props) {
  const isUp = change != null && change > 0;
  const isDown = change != null && change < 0;

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-2 shadow-sm border"
      style={{
        background: priority ? "var(--navy-800)" : "var(--card)",
        borderColor: priority ? "var(--navy-700)" : "var(--border)",
        color: priority ? "#ffffff" : "var(--text-primary)",
      }}
    >
      <span
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: priority ? "var(--navy-200)" : "var(--text-secondary)" }}
      >
        {label}
      </span>
      <span className="text-3xl font-bold leading-tight">{value}</span>
      {sub && (
        <span className="text-sm" style={{ color: priority ? "var(--navy-200)" : "var(--text-secondary)" }}>
          {sub}
        </span>
      )}
      {change != null && (
        <div
          className="flex items-center gap-1 text-sm font-medium mt-1"
          style={{ color: isUp ? "var(--up)" : isDown ? "var(--down)" : "var(--text-secondary)" }}
        >
          {isUp ? <TrendingUp size={14} /> : isDown ? <TrendingDown size={14} /> : <Minus size={14} />}
          <span>
            {isUp ? "+" : ""}{change}% {changeLabel ?? "전년 대비"}
          </span>
        </div>
      )}
    </div>
  );
}
