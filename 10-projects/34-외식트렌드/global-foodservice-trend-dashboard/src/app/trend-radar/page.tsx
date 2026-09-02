import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader, Empty, Table, TableWrap, Td, Th } from '@/components/ui/primitives'
import { KeywordTimelineChart } from '@/components/charts'
import { ExportButton } from '@/components/dashboard/export-button'
import { keywordTimeline, keywordTrends } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { REGION_ORDER } from '@/lib/categories'
import { now, pct } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Trend Radar — Global Foodservice Trend Intelligence' }

export default async function TrendRadarPage() {
  const articles = await getArticles()
  const reference = now()
  const rows = keywordTrends(articles, reference)
  const timeline = keywordTimeline(articles, reference)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="TREND RADAR"
        title="최근 30일 급상승 키워드"
        description="키워드별 언급량과 증감. 성장률은 직전 동일 기간 대비."
        action={<ExportButton resource="trend-radar" />}
      />

      <div className="space-y-3 p-4">
        <Card>
          <CardHeader title="키워드 언급량 추이" subtitle="상위 5개 키워드, 주간 언급량" />
          <CardBody>
            <KeywordTimelineChart keys={timeline.keys} rows={timeline.rows} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Keyword Radar"
            subtitle={`추적 키워드 ${rows.length}개 · 7일 성장률 순`}
          />
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[180px]">Keyword</Th>
                    <Th className="w-24">Mention (30D)</Th>
                    <Th className="w-24">Mention (7D)</Th>
                    <Th className="w-24">7 Day Growth</Th>
                    <Th className="w-24">30 Day Growth</Th>
                    <Th className="w-[210px]">Region Distribution</Th>
                    <Th>Top Brands</Th>
                    <Th className="w-16">기사</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <tr key={k.keyword} className="hover:bg-canvas">
                      <Td>
                        <span className="font-semibold text-navy-800">{k.keyword}</span>
                        <span className="ml-1 text-[10.5px] text-muted">{k.labelKo}</span>
                      </Td>
                      <Td className="tabular">{k.mentions30d}</Td>
                      <Td className="tabular">{k.mentions7d}</Td>
                      <Td className="font-medium text-navy-700 tabular">{pct(k.growth7d)}</Td>
                      <Td className="font-medium text-navy-700 tabular">{pct(k.growth30d)}</Td>
                      <Td>
                        <div className="flex items-center gap-1">
                          {REGION_ORDER.map((r) => {
                            const total = Math.max(1, k.mentions30d)
                            const w = Math.round((k.regionDistribution[r] / total) * 100)
                            return (
                              <span
                                key={r}
                                title={`${r} ${k.regionDistribution[r]}건`}
                                className="flex-1"
                              >
                                <span className="mb-0.5 block text-[9px] text-muted">{r[0]}</span>
                                <span className="block h-1.5 w-full bg-line">
                                  <span
                                    className="block h-1.5 bg-blue-accent"
                                    style={{ width: `${w}%` }}
                                  />
                                </span>
                              </span>
                            )
                          })}
                        </div>
                      </Td>
                      <Td className="text-[11px] text-muted">
                        {k.topBrands.length ? k.topBrands.join(', ') : '—'}
                      </Td>
                      <Td>
                        <Link
                          href={`/news-feed?q=${encodeURIComponent(k.keyword)}&range=30D`}
                          className="text-[11px] text-blue-accent hover:underline"
                        >
                          {k.articleIds.length}건 →
                        </Link>
                      </Td>
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
