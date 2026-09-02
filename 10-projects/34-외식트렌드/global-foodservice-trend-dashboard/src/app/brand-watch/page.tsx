import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader, Empty, Table, TableWrap, Td, Th } from '@/components/ui/primitives'
import { BrandRankingChart } from '@/components/charts'
import { ExportButton } from '@/components/dashboard/export-button'
import { brandMentionRanking, brandWatch } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { WATCHLIST_BRANDS } from '@/lib/radar-keywords'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Brand Watch — Global Foodservice Trend Intelligence' }

export default async function BrandWatchPage() {
  const articles = await getArticles()
  const rows = brandWatch(articles)
  const ranking = brandMentionRanking(articles, 10)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="BRAND WATCH"
        title="주요 브랜드 활동 추적"
        description="워치리스트 브랜드의 뉴스량과 활동 유형 집계."
        action={<ExportButton resource="brand-watch" />}
      />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.6fr]">
          <Card>
            <CardHeader title="Brand Mention Ranking" subtitle="언급 건수 상위 10" />
            <CardBody>
              {ranking.length === 0 ? <Empty /> : <BrandRankingChart data={ranking} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Watchlist"
              subtitle={`상시 추적 ${WATCHLIST_BRANDS.length}개`}
            />
            <CardBody>
              <div className="flex flex-wrap gap-1.5">
                {WATCHLIST_BRANDS.map((b) => {
                  const row = rows.find((r) => r.brand === b)
                  const active = (row?.newsCount ?? 0) > 0
                  return (
                    <Link
                      key={b}
                      href={`/news-feed?brand=${encodeURIComponent(b)}&range=ALL`}
                      className={
                        active
                          ? 'rounded-sm border border-blue-accent/40 bg-blue-soft px-2 py-1 text-[11px] font-medium text-navy-800 hover:border-blue-accent'
                          : 'rounded-sm border border-line px-2 py-1 text-[11px] text-muted hover:border-navy-700'
                      }
                    >
                      {b}
                      <span className="ml-1 tabular">{row?.newsCount ?? 0}</span>
                    </Link>
                  )
                })}
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-muted">
                워치리스트는 <code className="font-mono">src/lib/radar-keywords.ts</code> 의{' '}
                <code className="font-mono">WATCHLIST_BRANDS</code> 에서 관리합니다. LIVE 모드에서는{' '}
                <code className="font-mono">Brand.watchlist</code> 컬럼으로 이관됩니다.
              </p>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Brand Activity Matrix" subtitle="뉴스 건수 순" />
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[200px]">Brand</Th>
                    <Th className="w-20">News Count</Th>
                    <Th className="w-24">New Markets</Th>
                    <Th className="w-20">New Stores</Th>
                    <Th className="w-20">New Menu</Th>
                    <Th className="w-20">Franchise</Th>
                    <Th className="w-20">Investment</Th>
                    <Th className="w-16">M&amp;A</Th>
                    <Th className="w-20">Technology</Th>
                    <Th className="w-20">Top Score</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.brand} className="hover:bg-canvas">
                      <Td>
                        <Link
                          href={`/news-feed?brand=${encodeURIComponent(r.brand)}&range=ALL`}
                          className="font-semibold text-navy-800 hover:text-blue-accent"
                        >
                          {r.brand}
                        </Link>
                      </Td>
                      <Td className="font-medium tabular">{r.newsCount}</Td>
                      <Td className="tabular">{r.newMarkets || '—'}</Td>
                      <Td className="tabular">{r.newStores || '—'}</Td>
                      <Td className="tabular">{r.newMenu || '—'}</Td>
                      <Td className="tabular">{r.franchise || '—'}</Td>
                      <Td className="tabular">{r.investment || '—'}</Td>
                      <Td className="tabular">{r.mAndA || '—'}</Td>
                      <Td className="tabular">{r.technology || '—'}</Td>
                      <Td className="tabular">{r.topScore || '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  )
}
