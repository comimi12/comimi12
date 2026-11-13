import type { Metadata, Viewport } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { dataSourceMeta, getArticles, getSources } from '@/lib/repository'
import { hasGlobalArticles } from '@/lib/analytics'
import type { PanelSource } from '@/components/layout/source-panel'
import { formatDateTime, now } from '@/lib/utils'

const SITE_URL = 'https://global-foodservice-trend-dashboard.vercel.app'
const SITE_TITLE = '글로벌 외식 트렌드 인텔리전스'
const SITE_DESC =
  '전 세계 외식산업 뉴스·신메뉴·브랜드·Restaurant Tech·출점 동향을 매일 수집·분석하는 경영진용 인텔리전스 대시보드'

export const metadata: Metadata = {
  // 카카오톡·슬랙 등은 절대경로 og:image 만 읽으므로 metadataBase 가 필요하다.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESC,
  // 스마트폰 '홈 화면에 추가' 시 앱처럼 열리게 한다.
  appleWebApp: { capable: true, title: '외식 트렌드', statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESC,
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESC,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0f2f54',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // DATA_MODE 환경변수가 아니라 실제로 화면에 쓰이는 데이터 기준 —
  // collected.json(매일 수집 실기사)이 있으면 DEMO 가 아니다.
  const demo = dataSourceMeta().isDemo
  const lastUpdated = formatDateTime(now().toISOString())

  // 사이드바 최상단 "수집 출처" 목록 — 실제로 수집되는(RSS 보유) 매체만 보여준다.
  const allSources = await getSources()
  const panelSources: PanelSource[] = allSources
    .filter((s) => s.active && s.rssUrl)
    .map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      region: s.region,
      country: s.country,
      count: s.articleCount,
    }))
  const skippedSources = allSources.filter((s) => s.active && !s.rssUrl).length
  // GLOBAL 소스(Technomic·Euromonitor·Circana)는 RSS 미제공이라 기사가 없다.
  // 빈 탭을 노출하지 않도록, 실제 기사가 생기면 그때 메뉴에 나타난다.
  const showGlobal = hasGlobalArticles(await getArticles())

  return (
    <html lang="ko">
      <body className="bg-white text-ink antialiased">
        {/*
          PC(md 이상): 좌측 사이드바 + 내부 스크롤.
          스마트폰: 문서 자체 스크롤(주소창 자동 숨김) + 상단 고정바 + 하단 탭바.
        */}
        <div className="w-full md:flex md:h-screen md:overflow-hidden">
          <Sidebar
            sources={panelSources}
            skippedSources={skippedSources}
            showGlobal={showGlobal}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense
              fallback={<div className="h-14 shrink-0 border-b border-line bg-white" />}
            >
              <Topbar lastUpdated={lastUpdated} demo={demo} />
            </Suspense>
            <main className="print-full mobile-main min-h-screen min-w-0 flex-1 bg-canvas md:min-h-0 md:overflow-y-auto">
              {children}
            </main>
          </div>
        </div>
        <MobileNav showGlobal={showGlobal} />
      </body>
    </html>
  )
}
