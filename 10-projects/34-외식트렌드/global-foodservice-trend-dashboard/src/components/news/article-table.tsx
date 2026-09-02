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
            {showRank ? <Th className="w-10">Rank</Th> : null}
            <Th className="w-20">Region</Th>
            <Th className="w-[190px]">Trend</Th>
            <Th className="w-28">Brand</Th>
            <Th>Headline</Th>
            <Th className="w-28">Category</Th>
            <Th className="w-[110px]">Score</Th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => (
            <tr key={a.id} className="hover:bg-canvas">
              {showRank ? (
                <Td className="font-semibold text-navy-700">{String(i + 1).padStart(2, '0')}</Td>
              ) : null}
              <Td className="text-[11px] font-medium text-navy-700">
                {a.region}
                <span className="ml-1 text-muted">{a.country}</span>
              </Td>
              <Td className="text-[11.5px] text-ink">{a.trend}</Td>
              <Td className="text-[11px] text-muted">
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
            <Th className="w-[92px]">발행</Th>
            <Th className="w-20">Region</Th>
            <Th>Headline</Th>
            <Th className="w-28">Category</Th>
            <Th className="w-[150px]">Source</Th>
            <Th className="w-[104px]">적용 가능성</Th>
            <Th className="w-[110px]">Score</Th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a) => (
            <tr key={a.id} className="hover:bg-canvas">
              <Td className="whitespace-nowrap text-[11px] text-muted">
                {formatDate(a.publishedAt)}
                <span className="block text-[10px] text-muted/70">
                  {relativeTime(a.publishedAt)}
                </span>
              </Td>
              <Td className="text-[11px] font-medium text-navy-700">
                {a.region}
                <span className="ml-1 text-muted">{a.country}</span>
              </Td>
              <Td>
                <Headline article={a} />
                {a.brands.length ? (
                  <span className="mt-0.5 block text-[10.5px] text-muted">
                    {a.brands.join(' · ')}
                  </span>
                ) : null}
              </Td>
              <Td>
                <CategoryTag article={a} />
              </Td>
              <Td className="text-[11px] text-muted">
                {a.source}
                <span className="mt-0.5 block">
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
      {articles.map((a) => (
        <li key={a.id} className="flex items-start gap-3 px-4 py-2 hover:bg-canvas">
          <div className="min-w-0 flex-1">
            <Headline article={a} />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <ScoreTag score={a.totalScore} />
            <span className="text-[10px] text-muted">{relativeTime(a.publishedAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  )
}
