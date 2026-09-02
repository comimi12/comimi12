import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import { Card, CardHeader, Empty, Table, TableWrap, Td, Th } from '@/components/ui/primitives'
import { ExportButton } from '@/components/dashboard/export-button'
import { techRows } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { TECH_LABEL, TECH_ORDER } from '@/lib/categories'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Restaurant Tech — Global Foodservice Trend Intelligence' }

export default async function RestaurantTechPage() {
  const articles = await getArticles()
  const rows = techRows(articles)

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="RESTAURANT TECH"
        title="레스토랑 기술 도입 동향"
        description="AI 주문·수요예측·로보틱스·POS·CRM·로열티·예약·배달·주방 자동화·재고·인력관리 11개 축으로 도입 기업, 브랜드, 목적, 기대효과를 추적합니다."
        action={<ExportButton resource="restaurant-tech" />}
      />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-3 gap-px border border-line bg-line md:grid-cols-6 xl:grid-cols-11">
          {TECH_ORDER.map((t) => {
            const count = rows.filter((r) => r.techCategory === t).length
            return (
              <div key={t} className="bg-white px-2.5 py-2">
                <p className="truncate text-[9.5px] font-semibold uppercase tracking-wide text-muted">
                  {TECH_LABEL[t]}
                </p>
                <p className="mt-0.5 text-[18px] font-semibold leading-none text-navy-900 tabular">
                  {count}
                </p>
              </div>
            )
          })}
        </div>

        <Card>
          <CardHeader
            title="Technology Adoption Table"
            subtitle={`도입 사례 ${rows.length}건 · 최신순`}
          />
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[130px]">기술</Th>
                    <Th className="w-[160px]">기업 (벤더)</Th>
                    <Th className="w-[150px]">도입 브랜드</Th>
                    <Th className="w-24">지역</Th>
                    <Th className="w-[190px]">도입 목적</Th>
                    <Th className="w-[190px]">기대효과</Th>
                    <Th>관련 뉴스</Th>
                    <Th className="w-20">발행</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.articleId} className="hover:bg-canvas">
                      <Td className="font-semibold text-navy-800">
                        {TECH_LABEL[r.techCategory]}
                      </Td>
                      <Td className="text-[11.5px]">{r.vendor}</Td>
                      <Td className="text-[11.5px]">{r.adopterBrand}</Td>
                      <Td className="text-[11px] text-muted">
                        {r.region}
                        {r.country ? ` · ${r.country}` : ''}
                      </Td>
                      <Td className="text-[11.5px] leading-relaxed">{r.purpose}</Td>
                      <Td className="text-[11.5px] leading-relaxed">{r.expectedEffect}</Td>
                      <Td>
                        <Link
                          href={`/article/${r.articleId}`}
                          className="text-[11.5px] font-medium text-navy-800 hover:text-blue-accent"
                        >
                          {r.headlineKo}
                        </Link>
                      </Td>
                      <Td className="whitespace-nowrap text-[11px] text-muted">
                        {formatDate(r.publishedAt)}
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
