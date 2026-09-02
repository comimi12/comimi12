import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardHeader,
  Empty,
  Label,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/ui/primitives'
import { ExportButton } from '@/components/dashboard/export-button'
import { menuTrends } from '@/lib/analytics'
import { getArticles } from '@/lib/repository'
import { MENU_TYPE_LABEL, MENU_TYPE_ORDER } from '@/lib/categories'
import { now, pct } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Menu Trends — Global Foodservice Trend Intelligence' }

export default async function MenuTrendsPage() {
  const articles = await getArticles()
  const rows = menuTrends(articles, now())

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="MENU & PRODUCT TREND"
        title="메뉴 · 식재료 트렌드"
        description="Food · Beverage · Dessert · Alcohol · Ingredient · Cooking Method · Cuisine 축으로 분류합니다. 성장률은 최근 30일 대비 직전 30일 언급량입니다."
        action={<ExportButton resource="menu-trends" />}
      />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4 xl:grid-cols-7">
          {MENU_TYPE_ORDER.map((t) => {
            const count = rows.filter((r) => r.menuType === t).length
            return (
              <div key={t} className="bg-white px-3 py-2">
                <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {MENU_TYPE_LABEL[t]}
                </p>
                <p className="mt-0.5 text-[20px] font-semibold leading-none text-navy-900 tabular">
                  {count}
                </p>
              </div>
            )
          })}
        </div>

        <Card>
          <CardHeader
            title="Menu Trend Table"
            subtitle={`추적 트렌드 ${rows.length}건 · 언급량 순`}
          />
          {rows.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[150px]">Trend Name</Th>
                    <Th className="w-24">Type</Th>
                    <Th className="w-20">Mentions</Th>
                    <Th className="w-24">Growth Rate</Th>
                    <Th className="w-[130px]">Top Countries</Th>
                    <Th className="w-[150px]">Top Brands</Th>
                    <Th>Korea Opportunity</Th>
                    <Th className="w-20">Articles</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.trendName} className="hover:bg-canvas">
                      <Td className="font-semibold text-navy-800">{r.trendName}</Td>
                      <Td>
                        <Label className="border-line text-navy-700">
                          {MENU_TYPE_LABEL[r.menuType]}
                        </Label>
                      </Td>
                      <Td className="tabular">{r.mentions}</Td>
                      <Td className="font-medium text-navy-700 tabular">{pct(r.growthRate)}</Td>
                      <Td className="text-[11px] text-muted">
                        {r.topCountries.length ? r.topCountries.join(', ') : '—'}
                      </Td>
                      <Td className="text-[11px] text-muted">
                        {r.topBrands.length ? r.topBrands.join(', ') : '—'}
                      </Td>
                      <Td className="text-[11.5px] leading-relaxed">{r.koreaOpportunity}</Td>
                      <Td>
                        <Link
                          href={`/news-feed?q=${encodeURIComponent(r.trendName)}&range=ALL`}
                          className="text-[11px] text-blue-accent hover:underline"
                        >
                          {r.articleIds.length}건 →
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
