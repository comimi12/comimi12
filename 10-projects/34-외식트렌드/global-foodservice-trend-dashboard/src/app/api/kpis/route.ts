import { ok } from '@/lib/api'
import { computeKpis, todayTop } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/kpis — KPI 카드 6개 + TOP 10 (§9, §10) */
export async function GET() {
  const articles = await getArticles()
  const reference = now()
  return ok({
    kpis: computeKpis(articles, reference),
    top10: todayTop(articles, 10, reference),
  })
}
