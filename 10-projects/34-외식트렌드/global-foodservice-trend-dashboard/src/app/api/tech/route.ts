import { ok } from '@/lib/api'
import { techRows } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'

export const dynamic = 'force-dynamic'

/** GET /api/tech — Restaurant Tech (§16) */
export async function GET() {
  const articles = await getArticles()
  return ok(techRows(articles))
}
