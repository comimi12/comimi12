import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Reference "now" for the app. Overridable so demo data stays meaningful. */
export function now(): Date {
  const fixed = process.env.NEXT_PUBLIC_DEMO_TODAY
  return fixed ? new Date(`${fixed}T09:00:00+09:00`) : new Date()
}

export function toDateKey(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toISOString().slice(0, 10)
}

export function daysAgo(iso: string, from: Date = now()): number {
  const ms = from.getTime() - new Date(iso).getTime()
  return Math.floor(ms / 86_400_000)
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

export function relativeTime(iso: string, from: Date = now()): string {
  const diff = from.getTime() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return '방금'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  return formatDate(iso)
}

export function pct(n: number, digits = 0): string {
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(digits)}%`
}

export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr))
}

export function countBy<T>(arr: T[], key: (t: T) => string): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, item) => {
    const k = key(item)
    acc[k] = (acc[k] ?? 0) + 1
    return acc
  }, {})
}

export function topN(record: Record<string, number>, n: number): [string, number][] {
  return Object.entries(record)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
}

/** Simple token-set similarity used by the duplicate detector (§7). */
export function jaccard(a: string, b: string): number {
  const norm = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
    )
  const sa = norm(a)
  const sb = norm(b)
  if (sa.size === 0 || sb.size === 0) return 0
  let inter = 0
  sa.forEach((w) => {
    if (sb.has(w)) inter += 1
  })
  return inter / (sa.size + sb.size - inter)
}

const STOPWORDS = new Set([
  'the','and','for','with','from','that','this','are','has','have','its','into','after','over','new','says','will','more','than','amid','was','were','you','out','how','why','who','all','但','및','the',
])
