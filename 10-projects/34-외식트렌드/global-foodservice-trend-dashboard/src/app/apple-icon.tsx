import { ImageResponse } from 'next/og'

/** 홈 화면 아이콘 (ImageResponse 기본 폰트에 한글이 없어 영문만 쓴다). */
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b2340',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
          <div style={{ width: 18, height: 26, background: '#7fb0f0' }} />
          <div style={{ width: 18, height: 42, background: '#3d8be6' }} />
          <div style={{ width: 18, height: 60, background: '#0b63ce' }} />
        </div>
        <div style={{ marginTop: 16, fontSize: 30, fontWeight: 700, letterSpacing: 2 }}>
          TREND
        </div>
      </div>
    ),
    size,
  )
}
