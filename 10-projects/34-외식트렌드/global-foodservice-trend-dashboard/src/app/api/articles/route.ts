import type { NextRequest } from 'next/server'
import { filtersFromSearchParams, ok } from '@/lib/api'
import { filterArticles } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { now } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** GET /api/articles — 필터·검색 (§19, §20) */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const articles = await getArticles()
  const filtered = filterArticles(articles, filtersFromSearchParams(sp), now())

  const limit = Number(sp.get('limit') ?? 200)
  const offset = Number(sp.get('offset') ?? 0)

  return ok(filtered.slice(offset, offset + limit), {
    total: filtered.length,
    limit,
    offset,
  })
}
