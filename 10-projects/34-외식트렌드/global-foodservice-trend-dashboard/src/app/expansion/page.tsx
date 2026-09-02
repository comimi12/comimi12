import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardBody,
  CardHeader,
  Empty,
  Label,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { ExpansionCountryChart } from '@/components/charts'
import { ExportButton } from '@/components/dashboard/export-button'
import { expansionCountryRanking, expansionRows } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { EXPANSION_TYPE_LABEL } from '@/lib/categories'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Expansion — Global Foodservice Trend Intelligence' }

const OWNERSHIP_LABEL = { FRANCHISE: '프랜차이즈', DIRECT: '직영', JV: '합작' } as const

export default async function ExpansionPage() {
  const articles = await getArticles()
  const rows = expansionRows(articles)
  const ranking = expansionCountryRanking(articles, 10)

  const totalStores = rows.reduce((sum, r) => sum + (r.storeCount ?? 0), 0)
  const newMarkets = rows.filter(
    (r) => r.expansionType === 'NEW_MARKET_ENTRY' || r.expansionType === 'MASTER_FRANCHISE',
  ).length

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="EXPANSION & FRANCHISE"
        title="해외 진출 · 프랜차이즈 동향"
        description="발표된 출점·진출 건을 브랜드, 본사 국가, 진출 국가, 도시, 점포 수, 확장 유형, 운영 형태로 정리합니다."
        action={<ExportButton resource="expansion" />}
      />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {[
            { label: '발표 건수', value: rows.length },
            { label: '신규 시장 진입', value: newMarkets },
            { label: '집계 점포 수', value: totalStores },
            { label: '진출 국가 수', value: ranking.length },
          ].map((s) => (
            <div key={s.label} className="bg-white px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {s.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-navy-900 tabular">
                {s.value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader title="Expansion Country Ranking" subtitle="진출 국가별 발표 건수" />
            <CardBody>
              {ranking.length === 0 ? <Empty /> : <ExpansionCountryChart data={ranking} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="진출 국가 분포"
              subtitle="World Map 시각화는 지도 데이터 연결 후 활성화 (README 참고)"
            />
            <CardBody>
              {ranking.length === 0 ? (
                <Empty />
              ) : (
                <div className="grid grid-cols-3 gap-px bg-line sm:grid-cols-5">
                  {ranking.map((c) => {
                    const max = ranking[0].count || 1
                    const intensity = c.count / max
                    return (
                      <div
                        key={c.country}
                        className="bg-white px-2 py-2.5 text-center"
                        style={{
                          backgroundColor: `rgba(11, 99, 206, ${0.06 + intensity * 0.28})`,
                        }}
                      >
                        <p className="text-[13px] font-bold text-navy-900">{c.country}</p>
                        <p className="text-[11px] text-muted tabular">{c.count}건</p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader
            title="Expansion & Franchise Table"
            subtitle={`발표 ${rows.length}건 · 최신순`}
          />
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[170px]">Brand</Th>
                    <Th className="w-20">HQ Country</Th>
                    <Th className="w-24">Expansion Country</Th>
                    <Th className="w-24">City</Th>
                    <Th className="w-20">Store Count</Th>
                    <Th className="w-[130px]">Expansion Type</Th>
                    <Th className="w-24">Franchise / Direct</Th>
                    <Th className="w-24">Announcement</Th>
                    <Th>Source</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.articleId} className="hover:bg-canvas">
                      <Td className="font-semibold text-navy-800">{r.brand}</Td>
                      <Td className="text-[11px] text-muted">{r.hqCountry}</Td>
                      <Td className="font-medium text-navy-700">{r.expansionCountry}</Td>
                      <Td className="text-[11.5px]">{r.city}</Td>
                      <Td className="tabular">{r.storeCount ?? '—'}</Td>
                      <Td>
                        <Label className="border-line text-navy-700">
                          {EXPANSION_TYPE_LABEL[r.expansionType]}
                        </Label>
                      </Td>
                      <Td className="text-[11px] text-muted">{OWNERSHIP_LABEL[r.ownership]}</Td>
                      <Td className="whitespace-nowrap text-[11px] text-muted">
                        {formatDate(r.announcementDate)}
                      </Td>
                      <Td>
                        <Link
                          href={`/article/${r.articleId}`}
                          className="text-[11.5px] text-navy-800 hover:text-blue-accent"
                        >
                          {r.source}
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
