import { ok } from '@/lib/api'
import { buildDailyBrief } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/brief — Executive Daily Brief (§18) */
export async function GET() {
  const articles = await getArticles()
  return ok(buildDailyBrief(articles, now()))
}
