import { ok } from '@/lib/api'
import { brandMentionRanking, brandWatch } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'

export const dynamic = 'force-dynamic'

/** GET /api/brands — Brand Watch (§15) */
export async function GET() {
  const articles = await getArticles()
  return ok({
    rows: brandWatch(articles),
    ranking: brandMentionRanking(articles, 20),
  })
}
