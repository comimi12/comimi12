/**
 * §23 — RSS 우선 수집.
 * 외부 XML 파서를 추가하지 않고 RSS 2.0 / Atom 을 모두 다루는 관용 파서.
 */

export interface FeedItem {
  title: string
  link: string
  publishedAt: string
  summary: string
}

const TAG = (name: string) =>
  new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i')

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
}

export function decodeXml(input: string): string {
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
}

export function stripHtml(input: string): string {
  return decodeXml(input)
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pick(block: string, ...names: string[]): string {
  for (const name of names) {
    const m = block.match(TAG(name))
    if (m) return decodeXml(m[1]).trim()
  }
  return ''
}

/** Atom 의 <link href="..."/> 형태까지 처리 */
function pickLink(block: string): string {
  const plain = pick(block, 'link')
  if (plain && !plain.startsWith('<')) return plain
  const href = block.match(/<link[^>]*\srel=["']alternate["'][^>]*\shref=["']([^"']+)["']/i)
  if (href) return decodeXml(href[1])
  const any = block.match(/<link[^>]*\shref=["']([^"']+)["']/i)
  return any ? decodeXml(any[1]) : ''
}

function toIso(raw: string): string {
  if (!raw) return new Date().toISOString()
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString()
}

export function parseFeed(xml: string, limit = 25): FeedItem[] {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ??
    []

  return blocks.slice(0, limit).map((block) => ({
    title: stripHtml(pick(block, 'title')),
    link: pickLink(block),
    publishedAt: toIso(pick(block, 'pubDate', 'published', 'updated', 'dc:date')),
    summary: stripHtml(
      pick(block, 'content:encoded', 'description', 'summary', 'content'),
    ).slice(0, 4000),
  }))
}

export interface FetchResult {
  ok: boolean
  items: FeedItem[]
  message?: string
}

export async function fetchFeed(url: string): Promise<FetchResult> {
  const timeout = Number(process.env.COLLECT_TIMEOUT_MS ?? 15000)
  const limit = Number(process.env.COLLECT_MAX_PER_SOURCE ?? 25)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent':
          process.env.COLLECT_USER_AGENT ?? 'GlobalFoodserviceTrendBot/1.0',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
    })
    if (!res.ok) {
      return { ok: false, items: [], message: `HTTP ${res.status}` }
    }
    const xml = await res.text()
    const items = parseFeed(xml, limit)
    return items.length > 0
      ? { ok: true, items }
      : { ok: false, items: [], message: '피드에서 항목을 찾지 못했습니다.' }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, items: [], message }
  } finally {
    clearTimeout(timer)
  }
}

/** 기사 URL 을 안정적인 해시로 (재수집 시 upsert 키) */
export async function urlHash(url: string): Promise<string> {
  const data = new TextEncoder().encode(url.trim().toLowerCase())
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
