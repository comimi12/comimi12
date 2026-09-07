import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { dataMode } from '@/lib/db'
import { getSources } from '@/lib/repository'
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = dataMode() === 'demo'
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

  return (
    <html lang="ko">
      <body className="bg-white text-ink antialiased">
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar sources={panelSources} skippedSources={skippedSources} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Suspense
              fallback={<div className="h-14 shrink-0 border-b border-line bg-white" />}
            >
              <Topbar lastUpdated={lastUpdated} demo={demo} />
            </Suspense>
            <main className="print-full min-w-0 flex-1 overflow-y-auto bg-canvas">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
