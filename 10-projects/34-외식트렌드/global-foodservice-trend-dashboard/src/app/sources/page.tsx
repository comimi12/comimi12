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
import { getSources } from '@/lib/repository'
import { REGION_ORDER } from '@/lib/categories'
import { dataMode } from '@/lib/db'
import { formatDateTime, now, relativeTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Sources — Global Foodservice Trend Intelligence' }

const TIER_NOTE: Record<number, string> = {
  1: '리서치·협회 1차 자료',
  2: '산업 전문 매체',
  3: '기타 산업 미디어',
  4: '일반 블로그 / 출처 불명 — 메인 대시보드 미노출',
}

export default async function SourcesPage() {
  const sources = await getSources()
  // 렌더 중 impure 호출을 피하기 위해 기준 시각을 한 번만 계산한다.
  const staleCutoff = now().getTime() - 2 * 86_400_000

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="ADMIN · SOURCES"
        title="수집 소스 관리"
        description="소스별 RSS 여부, 신뢰도 Tier, 수집 현황. Tier 4는 메인 대시보드에서 제외."
        action={<ExportButton resource="sources" />}
      />

      <div className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {REGION_ORDER.map((r) => {
            const mine = sources.filter((s) => s.region === r)
            return (
              <div key={r} className="bg-white px-3.5 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  {r}
                </p>
                <p className="mt-1 text-[22px] font-semibold leading-none text-navy-900 tabular">
                  {mine.length}
                </p>
                <p className="mt-1 text-[10px] text-muted">
                  RSS {mine.filter((s) => s.rssUrl).length} · 활성{' '}
                  {mine.filter((s) => s.active).length}
                </p>
              </div>
            )
          })}
        </div>

        {dataMode() === 'demo' ? (
          <p className="rounded-sm border border-blue-accent/30 bg-blue-soft px-3 py-1.5 text-[11px] text-navy-800">
            DEMO 모드에서는 수집 이력이 합성값입니다. LIVE 모드에서는{' '}
            <code className="font-mono">CrawlEvent</code> 테이블의 실제 수집 결과가 표시됩니다.
          </p>
        ) : null}

        <Card>
          <CardHeader title="Source Registry" subtitle={`${sources.length}개 소스`} />
          {sources.length === 0 ? (
            <Empty />
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th className="w-[210px]">Source Name</Th>
                    <Th className="w-20">Region</Th>
                    <Th className="w-16">Country</Th>
                    <Th className="w-[190px]">URL</Th>
                    <Th className="w-16">RSS</Th>
                    <Th className="w-[150px]">Reliability Tier</Th>
                    <Th className="w-16">상태</Th>
                    <Th className="w-[110px]">Last Crawled</Th>
                    <Th className="w-[110px]">Last Success</Th>
                    <Th className="w-16">Articles</Th>
                  </tr>
                </thead>
                <tbody>
                  {sources.map((s) => {
                    const stale =
                      s.lastSuccessAt != null &&
                      new Date(s.lastSuccessAt).getTime() < staleCutoff
                    return (
                      <tr key={s.id} className="hover:bg-canvas">
                        <Td>
                          <span className="font-semibold text-navy-800">{s.name}</span>
                          {s.note ? (
                            <span className="mt-0.5 block text-[10.5px] leading-tight text-muted">
                              {s.note}
                            </span>
                          ) : null}
                        </Td>
                        <Td className="text-[11px] font-medium text-navy-700">{s.region}</Td>
                        <Td className="text-[11px] text-muted">{s.country}</Td>
                        <Td>
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block truncate text-[11px] text-blue-accent hover:underline"
                          >
                            {s.url.replace(/^https?:\/\//, '')}
                          </a>
                        </Td>
                        <Td>
                          {s.rssUrl ? (
                            <Label className="border-blue-accent/40 bg-blue-soft text-navy-800">
                              RSS
                            </Label>
                          ) : (
                            <Label className="border-line text-muted">HTML</Label>
                          )}
                        </Td>
                        <Td>
                          <Label
                            className={
                              s.reliabilityTier === 1
                                ? 'border-navy-800 bg-navy-800 text-white'
                                : 'border-line text-navy-700'
                            }
                          >
                            TIER {s.reliabilityTier}
                          </Label>
                          <span className="mt-0.5 block text-[10px] leading-tight text-muted">
                            {TIER_NOTE[s.reliabilityTier]}
                          </span>
                        </Td>
                        <Td>
                          <Label
                            className={
                              s.active
                                ? 'border-line text-navy-700'
                                : 'border-line text-muted/60'
                            }
                          >
                            {s.active ? 'ACTIVE' : 'INACTIVE'}
                          </Label>
                        </Td>
                        <Td className="text-[10.5px] text-muted">
                          {s.lastCrawledAt ? formatDateTime(s.lastCrawledAt) : '—'}
                        </Td>
                        <Td
                          className={
                            stale
                              ? 'text-[10.5px] font-medium text-navy-800'
                              : 'text-[10.5px] text-muted'
                          }
                        >
                          {s.lastSuccessAt ? relativeTime(s.lastSuccessAt) : '수집 이력 없음'}
                          {stale ? (
                            <span className="mt-0.5 block text-[10px] text-muted">
                              48시간 이상 미수집
                            </span>
                          ) : null}
                        </Td>
                        <Td className="tabular">{s.articleCount}</Td>
                      </tr>
                    )
                  })}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Card>
      </div>
    </div>
  )
}
