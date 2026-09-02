import { ok } from '@/lib/api'
import { keywordTimeline, keywordTrends } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/trends/keywords — Trend Radar (§13) */
export async function GET() {
  const articles = await getArticles()
  const reference = now()
  return ok({
    keywords: keywordTrends(articles, reference),
    timeline: keywordTimeline(articles, reference),
  })
}
