import { fail, ok } from '@/lib/api'
import { getArticleById, getArticles } from '@/lib/repository'
import { relatedInGroup } from '@/lib/dedupe'

export const dynamic = 'force-dynamic'

/** GET /api/articles/:id — 상세 + 관련 기사 (§21) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const article = await getArticleById(id)
  if (!article) return fail('기사를 찾을 수 없습니다.', 404)

  const all = await getArticles()
  return ok({
    article,
    sameEvent: relatedInGroup(article, all),
    related: all
      .filter(
        (a) =>
          a.id !== article.id &&
          !a.isDuplicate &&
          a.keywords.some((k) => article.keywords.includes(k)),
      )
      .slice(0, 6),
  })
}
