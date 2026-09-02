import { ok } from '@/lib/api'
import { expansionCountryRanking, expansionRows } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'

export const dynamic = 'force-dynamic'

/** GET /api/expansion — Expansion & Franchise (§17) */
export async function GET() {
  const articles = await getArticles()
  return ok({
    rows: expansionRows(articles),
    countryRanking: expansionCountryRanking(articles, 20),
  })
}
