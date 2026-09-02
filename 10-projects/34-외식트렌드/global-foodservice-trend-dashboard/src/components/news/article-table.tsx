import type { NewsArticle } from '@/lib/types'
import { Empty, Table, TableWrap, Td, Th } from '@/components/ui/primitives'
import { ActionTag, CategoryTag, Headline, ScoreTag, TierTag } from './bits'
import { formatDate, relativeTime } from '@/lib/utils'

/** §10 — Today's Global Trend TOP 10 표 */
export function TopTable({
  articles,
  showRank = true,
}: {
  articles: NewsArticle[]
  showRank?: boolean
}) {
  if (articles.length === 0) return <Empty />
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            {showRank ? <Th className="w-12 text-center">순위</Th> : null}
            <Th className="w-[92px]">지역</Th>
            <Th className="w-[190px]">핵심 트렌드</Th>
            <Th className="w-[118px]">브랜드</Th>
            <Th>헤드라인</Th>
            <Th className="w-[110px]">카테고리</Th>
            <Th className="w-[126px]">중요도</Th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => (
            <tr key={a.id}>
              {showRank ? (
                <Td className="text-center align-middle">
                  <span
                    className={
                      i < 3
                        ? 'inline-flex h-6 w-6 items-center justify-center rounded-sm bg-navy-800 text-[12px] font-bold text-white'
                        : 'inline-flex h-6 w-6 items-center justify-center text-[13px] font-semibold text-muted'
                    }
                  >
                    {i + 1}
                  </span>
                </Td>
              ) : null}
              <Td>
                <span className="block text-[12px] font-semibold text-navy-800">{a.region}</span>
                {a.country ? (
                  <span className="block text-[11px] text-muted">{a.country}</span>
                ) : null}
              </Td>
              <Td className="text-[12.5px] leading-snug text-ink">{a.trend}</Td>
              <Td className="text-[11.5px] leading-snug text-muted">
                {a.brands.length ? a.brands.join(', ') : '—'}
              </Td>
              <Td>
                <Headline article={a} />
              </Td>
              <Td>
                <CategoryTag article={a} />
              </Td>
              <Td>
                <ScoreTag score={a.totalScore} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  )
}

/** 전체 Feed / 지역 Feed 공용 표 */
export function FeedTable({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return <Empty>조건에 맞는 기사가 없습니다.</Empty>
  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th className="w-[98px]">발행일</Th>
            <Th className="w-[92px]">지역</Th>
            <Th>헤드라인</Th>
            <Th className="w-[110px]">카테고리</Th>
            <Th className="w-[160px]">출처</Th>
            <Th className="w-[112px]">적용 가능성</Th>
            <Th className="w-[126px]">중요도</Th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id}>
              <Td className="whitespace-nowrap">
                <span className="block text-[12px] text-ink">{formatDate(a.publishedAt)}</span>
                <span className="block text-[10.5px] text-muted">
                  {relativeTime(a.publishedAt)}
                </span>
              </Td>
              <Td>
                <span className="block text-[12px] font-semibold text-navy-800">{a.region}</span>
                {a.country ? (
                  <span className="block text-[11px] text-muted">{a.country}</span>
                ) : null}
              </Td>
              <Td>
                <Headline article={a} />
                {a.brands.length ? (
                  <span className="mt-1 block text-[11px] text-muted">
                    {a.brands.join(' · ')}
                  </span>
                ) : null}
              </Td>
              <Td>
                <CategoryTag article={a} />
              </Td>
              <Td>
                <span className="block text-[11.5px] leading-snug text-ink">{a.source}</span>
                <span className="mt-1 block">
                  <TierTag source={a.source} />
                </span>
              </Td>
              <Td>
                <ActionTag action={a.recommendedAction} />
              </Td>
              <Td>
                <ScoreTag score={a.totalScore} />
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </TableWrap>
  )
}

/** 지역 대시보드용 컴팩트 리스트 */
export function CompactList({ articles }: { articles: NewsArticle[] }) {
  if (articles.length === 0) return <Empty />
  return (
    <ul className="divide-y divide-line">
      {articles.map((a, i) => (
        <li key={a.id} className="flex items-start gap-3 px-4 py-3 hover:bg-blue-soft/40">
          <span className="mt-0.5 w-4 shrink-0 text-[12px] font-bold text-blue-accent tabular">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <Headline article={a} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ScoreTag score={a.totalScore} />
            <span className="text-[10.5px] text-muted">{relativeTime(a.publishedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
