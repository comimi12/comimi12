import { ok } from '@/lib/api'
import { menuTrends } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/trends/menu — Menu & Product Trend (§14) */
export async function GET() {
  const articles = await getArticles()
  return ok(menuTrends(articles, now()))
}
