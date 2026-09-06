/**
 * 카카오톡·슬랙·문자 등에 링크를 붙여넣을 때 보이는 카드 썸네일.
 * ImageResponse 기본 폰트는 한글 글리프가 없으므로 이미지 안에는 영문만 넣고,
 * 한국어 설명은 metadata.description(카드 본문 텍스트)에서 처리한다.
 */
import { ImageResponse } from 'next/og'

export const alt = 'Global Foodservice Trend Intelligence'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#0b2340',
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 24,
              letterSpacing: 6,
              color: '#7fb0f0',
            }}
          >
            <div style={{ width: 56, height: 4, background: '#0b63ce' }} />
            DAILY INTELLIGENCE
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 76,
              lineHeight: 1.12,
              fontWeight: 700,
              color: '#ffffff',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>GLOBAL FOODSERVICE</span>
            <span>TREND INTELLIGENCE</span>
          </div>
          <div style={{ marginTop: 24, fontSize: 30, color: '#c7d8ee' }}>
            News · Menu · Brand · Restaurant Tech · Expansion
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: 24,
            color: '#8fa8c6',
          }}
        >
          <span>Updated every day 09:00 KST</span>
          <span style={{ color: '#ffffff' }}>global-foodservice-trend-dashboard.vercel.app</span>
        </div>
      </div>
    ),
    size,
  )
}
