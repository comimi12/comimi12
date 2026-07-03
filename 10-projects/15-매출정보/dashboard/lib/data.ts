export type SalesRecord = {
  item: string;
  year: number;
  revenue: number;
};

export const salesData: SalesRecord[] = [
  { item: 'A', year: 2025, revenue: 100 },
  { item: 'A', year: 2026, revenue: 150 },
  { item: 'A', year: 2027, revenue: 200 },
  { item: 'A', year: 2028, revenue: 250 },
  { item: 'B', year: 2025, revenue: 110 },
  { item: 'B', year: 2026, revenue: 160 },
  { item: 'B', year: 2027, revenue: 210 },
  { item: 'B', year: 2028, revenue: 260 },
  { item: 'C', year: 2025, revenue: 120 },
  { item: 'C', year: 2026, revenue: 170 },
  { item: 'C', year: 2027, revenue: 220 },
  { item: 'C', year: 2028, revenue: 270 },
  { item: 'D', year: 2025, revenue: 130 },
  { item: 'D', year: 2026, revenue: 180 },
  { item: 'D', year: 2027, revenue: 230 },
  { item: 'D', year: 2028, revenue: 280 },
];

export const YEARS = [2025, 2026, 2027, 2028] as const;
export const ITEMS = ['A', 'B', 'C', 'D'] as const;

export function getYearlyTotals() {
  return YEARS.map((year) => {
    const total = salesData
      .filter((d) => d.year === year)
      .reduce((sum, d) => sum + d.revenue, 0);
    return { year, total };
  });
}

export function getYoyChange(year: number) {
  const totals = getYearlyTotals();
  const current = totals.find((t) => t.year === year);
  const prev = totals.find((t) => t.year === year - 1);
  if (!current || !prev) return null;
  const change = current.total - prev.total;
  const rate = Math.round((change / prev.total) * 100);
  return { change, rate };
}

export function getItemRevenueByYear(year: number) {
  return ITEMS.map((item) => {
    const current = salesData.find((d) => d.item === item && d.year === year);
    const prev = salesData.find((d) => d.item === item && d.year === year - 1);
    const revenue = current?.revenue ?? 0;
    const change = prev ? revenue - prev.revenue : null;
    return { item, revenue, change };
  });
}

export function getItemTrend() {
  return YEARS.map((year) => {
    const row: Record<string, number | string> = { year: String(year) };
    ITEMS.forEach((item) => {
      const d = salesData.find((s) => s.item === item && s.year === year);
      row[item] = d?.revenue ?? 0;
    });
    return row;
  });
}
