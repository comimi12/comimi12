"use client";

import { YEARS } from "@/lib/data";

type Props = {
  selected: number | "all";
  onChange: (v: number | "all") => void;
};

export default function YearFilter({ selected, onChange }: Props) {
  const options: (number | "all")[] = ["all", ...YEARS];

  return (
    <div className="flex gap-2 flex-wrap">
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <button
            key={String(opt)}
            onClick={() => onChange(opt)}
            className="px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border"
            style={{
              background: active ? "var(--navy-800)" : "var(--card)",
              color: active ? "#ffffff" : "var(--text-secondary)",
              borderColor: active ? "var(--navy-800)" : "var(--border)",
            }}
          >
            {opt === "all" ? "전체" : `${opt}년`}
          </button>
        );
      })}
    </div>
  );
}
