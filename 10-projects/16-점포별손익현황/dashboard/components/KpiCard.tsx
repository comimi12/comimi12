"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  change?: number | null;
  priority?: boolean;
  level?: "danger" | "warn" | "ok";
};

export default function KpiCard({ label, value, sub, change, priority, level }: Props) {
  const bg = priority
    ? "var(--navy-800)"
    : level === "danger"
    ? "#fee2e2"
    : level === "warn"
    ? "#fef3c7"
    : "var(--card)";

  const textColor = priority ? "#fff" : "var(--text-primary)";
  const subColor = priority ? "rgba(255,255,255,0.7)" : "var(--text-secondary)";

  return (
    <div
      className="rounded-xl p-5 shadow-sm border flex flex-col gap-1"
      style={{ background: bg, borderColor: level === "danger" ? "#fca5a5" : level === "warn" ? "#fcd34d" : "var(--border)" }}
    >
      <p className="text-xs font-medium" style={{ color: priority ? "rgba(255,255,255,0.8)" : "var(--text-secondary)" }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: textColor }}>
        {value}
      </p>
      {change != null && (
        <p className="text-xs flex items-center gap-1" style={{ color: priority ? "rgba(255,255,255,0.8)" : change >= 0 ? "var(--up)" : "var(--down)" }}>
          {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {change >= 0 ? "+" : ""}{change.toFixed(1)}%
        </p>
      )}
      {sub && (
        <p className="text-xs" style={{ color: subColor }}>
          {sub}
        </p>
      )}
    </div>
  );
}
