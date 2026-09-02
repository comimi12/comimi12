import { PageHeader } from '@/components/layout/page-header'
import { Card, CardBody, CardHeader, Label, Table, TableWrap, Td, Th } from '@/components/ui/primitives'
import { SCORE_WEIGHTS } from '@/lib/scoring'
import { DUPLICATE_THRESHOLD } from '@/lib/dedupe'
import { CATEGORY_LABEL, CATEGORY_ORDER } from '@/lib/categories'
import { RADAR_KEYWORDS, WATCHLIST_BRANDS } from '@/lib/radar-keywords'
import { TIER_SCORE } from '@/lib/sources'
import { dataMode } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Settings — Global Foodservice Trend Intelligence' }

export default function SettingsPage() {
  const mode = dataMode()

  const env = [
    { key: 'DATA_MODE', value: mode, note: 'demo = 내장 샘플 / live = DB + AI' },
    {
      key: 'DATABASE_URL',
      value: process.env.DATABASE_URL ? '설정됨' : '미설정',
      note: 'PostgreSQL (Supabase 권장)',
    },
    { key: 'AI_PROVIDER', value: process.env.AI_PROVIDER ?? 'none', note: 'claude | openai | none' },
    {
      key: 'ANTHROPIC_API_KEY',
      value: process.env.ANTHROPIC_API_KEY ? '설정됨' : '미설정',
      note: 'Claude API 키',
    },
    {
      key: 'OPENAI_API_KEY',
      value: process.env.OPENAI_API_KEY ? '설정됨' : '미설정',
      note: 'OpenAI API 키',
    },
    {
      key: 'NEWSAPI_KEY',
      value: process.env.NEWSAPI_KEY ? '설정됨' : '미설정',
      note: 'RSS 보조 수집용 (선택)',
    },
    {
      key: 'CRON_SECRET',
      value: process.env.CRON_SECRET ? '설정됨' : '미설정',
      note: '/api/cron/daily 인증 토큰',
    },
  ]

  return (
    <div className="min-h-full">
      <PageHeader
        eyebrow="SETTINGS"
        title="시스템 설정"
        description="스코어링 가중치, 중복 판정 기준, 신뢰도 Tier, 추적 키워드·브랜드, 환경 변수 상태를 확인합니다. 값 변경은 소스 파일과 .env 에서 관리합니다."
      />

      <div className="grid grid-cols-1 gap-3 p-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="실행 모드" subtitle="현재 데이터 소스" />
          <CardBody>
            <div className="flex items-center gap-2">
              <Label
                className={
                  mode === 'live'
                    ? 'border-navy-800 bg-navy-800 text-white'
                    : 'border-blue-accent/40 bg-blue-soft text-navy-800'
                }
              >
                {mode.toUpperCase()}
              </Label>
              <span className="text-[11.5px] text-muted">
                {mode === 'demo'
                  ? '내장 합성 데이터셋으로 동작 중입니다. DB·AI 키 없이 전 화면을 확인할 수 있습니다.'
                  : 'PostgreSQL 에서 기사를 읽고 있습니다.'}
              </span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="환경 변수" subtitle=".env / .env.example" />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th className="w-[170px]">Key</Th>
                  <Th className="w-24">상태</Th>
                  <Th>설명</Th>
                </tr>
              </thead>
              <tbody>
                {env.map((e) => (
                  <tr key={e.key}>
                    <Td className="font-mono text-[11px] text-navy-800">{e.key}</Td>
                    <Td className="text-[11px] font-medium text-navy-700">{e.value}</Td>
                    <Td className="text-[11px] text-muted">{e.note}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </Card>

        <Card>
          <CardHeader title="Trend Score 가중치" subtitle="src/lib/scoring.ts" />
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>항목</Th>
                  <Th className="w-24">가중치</Th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(SCORE_WEIGHTS).map(([k, v]) => (
                  <tr key={k}>
                    <Td className="text-[11.5px]">{k}</Td>
                    <Td className="tabular">{Math.round(v * 100)}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
          <CardBody className="border-t border-line">
            <p className="text-[11px] leading-relaxed text-muted">
              라벨 기준 — 90+ MUST KNOW · 80+ HIGH · 70+ WATCH · 60+ REFERENCE · 59 이하 LOW
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="중복 판정 · 신뢰도" subtitle="src/lib/dedupe.ts · src/lib/sources.ts" />
          <CardBody className="space-y-2">
            <p className="text-[11.5px] text-ink">
              중복 판정 임계값{' '}
              <span className="font-semibold text-navy-800">{DUPLICATE_THRESHOLD}</span> — 제목
              유사도 40% · 키워드 25% · 브랜드 20% · 본문 15% 가중 합, 발행일 ±2일 이내에서만 비교.
            </p>
            <p className="text-[11.5px] text-ink">
              예외 유지 규칙 — 서로 다른 지역의 영향 분석 / 새로운 수치 추가 / 다른 기업의 대응 사례
              / 후속 기사.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {Object.entries(TIER_SCORE).map(([tier, score]) => (
                <Label key={tier} className="border-line text-navy-700">
                  TIER {tier} = {score}
                </Label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Trend Radar 추적 키워드"
            subtitle={`${RADAR_KEYWORDS.length}개 · src/lib/radar-keywords.ts`}
          />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {RADAR_KEYWORDS.map((k) => (
                <Label key={k.keyword} className="border-line text-navy-700">
                  {k.keyword} · {k.labelKo}
                </Label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Brand Watchlist"
            subtitle={`${WATCHLIST_BRANDS.length}개 · src/lib/radar-keywords.ts`}
          />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {WATCHLIST_BRANDS.map((b) => (
                <Label key={b} className="border-line text-navy-700">
                  {b}
                </Label>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="분류 체계" subtitle={`${CATEGORY_ORDER.length}개 카테고리`} />
          <CardBody>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORY_ORDER.map((c) => (
                <Label key={c} className="border-line text-navy-700">
                  {CATEGORY_LABEL[c]}
                  <span className="ml-1 font-mono text-[9px] text-muted">{c}</span>
                </Label>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
