import Link from 'next/link'
import { PageHeader } from '@/components/layout/page-header'
import {
  Card,
  CardBody,
  CardHeader,
  Empty,
  Label,
  SectionTitle,
} from '@/components/ui/primitives'
import { ExportButton } from '@/components/dashboard/export-button'
import { getArticles, getSources } from '@/lib/repository'
import { REGION_LABEL_KO, REGION_ORDER } from '@/lib/categories'
import { formatDate, relativeTime } from '@/lib/utils'
import type { NewsArticle, SourceRecord } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: '수집 출처 — Global Foodservice Trend Intelligence',
  description: '이 대시보드가 매일 기사를 가져오는 매체 목록과 매체별 최근 수집 기사',
}

const TIER_NOTE: Record<number, string> = {
  1: '리서치 · 협회 1차 자료',
  2: '산업 전문 매체',
  3: '기타 산업 미디어',
  4: '출처 불명 — 미노출',
}

/** 매체 카드 — 어떤 곳인지, 몇 건 가져왔는지, 실제로 어떤 기사가 왔는지까지 보여준다. */
function SourceCard({ source, articles }: { source: SourceRecord; articles: NewsArticle[] }) {
  const recent = articles.slice(0, 3)
  const host = source.url.replace(/^https?:\/\//, '').replace(/\/$/, '')

  return (
    <Card className="flex flex-col">
      <CardHeader
        title={
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-accent hover:underline"
          >
            {source.name}
          </a>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>{host}</span>
            <span className="text-muted/50">·</span>
            <span>{source.country}</span>
            <span className="text-muted/50">·</span>
            <span>{TIER_NOTE[source.reliabilityTier]}</span>
          </span>
        }
        action={
          <div className="text-right">
            <p className="text-[17px] font-bold leading-none text-navy-900 tabular">
              {articles.length}
            </p>
            <p className="mt-1 text-[10px] text-muted">건 보관</p>
          </div>
        }
      />
      <CardBody className="flex flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="border-blue-accent/40 bg-blue-soft text-navy-800">RSS 자동 수집</Label>
          <Label className="border-line text-navy-700">TIER {source.reliabilityTier}</Label>
          <span className="text-[10.5px] text-muted">
            최근 수집 {source.lastSuccessAt ? relativeTime(source.lastSuccessAt) : '이력 없음'}
          </span>
        </div>

        {recent.length === 0 ? (
          <p className="text-[11.5px] text-muted">최근 45일 내 보관된 기사가 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {recent.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className="mt-[3px] shrink-0 text-[10px] tabular text-muted">
                  {formatDate(a.publishedAt)}
                </span>
                <Link
                  href={`/article/${a.id}`}
                  className="line-clamp-2 text-[11.5px] leading-snug text-navy-800 hover:text-blue-accent hover:underline"
                >
                  {a.titleKo || a.title}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Link
          href={`/news-feed?source=${encodeURIComponent(source.name)}`}
          className="mt-auto pt-1 text-[11px] font-medium text-blue-accent hover:underline"
        >
          이 매체 기사 전체 보기 →
        </Link>
      </CardBody>
    </Card>
  )
}

export default async function CollectionPage() {
  const [sources, articles] = await Promise.all([getSources(), getArticles()])

  const collected = sources.filter((s) => s.active && s.rssUrl)
  const skipped = sources.filter((s) => s.active && !s.rssUrl)

  // 기사와 소스는 name 으로 연결된다(repository.sourcesFromArticles 와 같은 규칙).
  const bySource = new Map<string, NewsArticle[]>()
  articles.forEach((a) => {
    const list = bySource.get(a.source)
    if (list) list.push(a)
    else bySource.set(a.source, [a])
  })
  const sorted = (name: string) =>
    (bySource.get(name) ?? [])
      .slice()
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())

  const lastCollected = collected
    .map((s) => s.lastSuccessAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .pop()

  const groups = REGION_ORDER.map((region) => ({
    region,
    items: collected.filter((s) => s.region === region),
  })).filter((g) => g.items.length > 0)

  const tiles = [
    { label: '수집 매체', value: String(collected.length), unit: '곳' },
    { label: '보관 기사', value: String(articles.length), unit: '건' },
    { label: '마지막 수집', value: lastCollected ? relativeTime(lastCollected) : '—', unit: '' },
    { label: '미수집 매체', value: String(skipped.length), unit: '곳' },
  ]

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="DATA · COLLECTION SOURCES"
        title="수집 출처"
        description="이 대시보드의 기사가 어디서 발췌되는지 보여줍니다. 매체명을 누르면 원 매체 사이트로, 기사 제목을 누르면 해당 기사 분석 화면으로 이동합니다."
        action={<ExportButton resource="sources" />}
      />

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="bg-white px-3.5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                {t.label}
              </p>
              <p className="mt-1 text-[22px] font-semibold leading-none text-navy-900 tabular">
                {t.value}
                {t.unit ? (
                  <span className="ml-1 text-[11px] font-normal text-muted">{t.unit}</span>
                ) : null}
              </p>
            </div>
          ))}
        </div>

        <p className="rounded-sm border border-line bg-canvas px-3 py-2 text-[11.5px] leading-relaxed text-navy-700">
          매일 09:00 KST 에 아래 매체의 공개 RSS 를 수집한 뒤 중복 제거 · 요약 · 분류 · 점수화를
          거쳐 대시보드에 반영합니다. 보관 주기는 최근 45일이며, 그 이전 기사는 목록에서 빠집니다.
        </p>

        {groups.map((g) => (
          <div key={g.region} className="space-y-2">
            <SectionTitle
              step={String(g.items.length).padStart(2, '0')}
              title={g.region}
              ko={`${REGION_LABEL_KO[g.region]} · ${g.items.length}곳`}
            />
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {g.items.map((s) => (
                <SourceCard key={s.id} source={s} articles={sorted(s.name)} />
              ))}
            </div>
          </div>
        ))}

        <Card>
          <CardHeader
            title="현재 수집하지 않는 매체"
            subtitle={`${skipped.length}곳 — 공개 RSS 를 제공하지 않아 자동 수집에서 제외돼 있습니다. 붙이려면 매체별 HTML 어댑터가 필요합니다.`}
          />
          {skipped.length === 0 ? (
            <Empty />
          ) : (
            <CardBody className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {skipped.map((s) => (
                <div key={s.id} className="border border-line px-3 py-2">
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] font-semibold text-navy-800 hover:text-blue-accent hover:underline"
                  >
                    {s.name}
                  </a>
                  <p className="mt-0.5 text-[10.5px] text-muted">
                    {REGION_LABEL_KO[s.region]} · {s.country} · TIER {s.reliabilityTier}
                  </p>
                  <p className="mt-1 text-[10.5px] leading-tight text-muted">
                    {s.note ?? 'RSS 미제공'}
                  </p>
                </div>
              ))}
            </CardBody>
          )}
        </Card>

        <p className="text-[10.5px] leading-relaxed text-muted">
          Tier · 수집 이력 · RSS 주소 등 관리자용 상세 표는{' '}
          <Link href="/sources" className="font-medium text-blue-accent hover:underline">
            소스 관리
          </Link>{' '}
          화면에 있습니다.
        </p>
      </div>
    </div>
  )
}
