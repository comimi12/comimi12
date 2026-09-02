import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { dataMode } from '@/lib/db'
import { formatDateTime, now } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Global Foodservice Trend Intelligence',
  description:
    '전 세계 외식산업 뉴스·신메뉴·브랜드·Restaurant Tech·출점 동향을 매일 수집·분석하는 경영진용 인텔리전스 대시보드',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const demo = dataMode() === 'demo'
  const lastUpdated = formatDateTime(now().toISOString())

  return (
    <html lang="ko">
      <body className="bg-white text-ink antialiased">
        <div className="flex h-screen w-full overflow-hidden">
          <Sidebar />
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
