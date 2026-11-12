import type { MetadataRoute } from 'next'

/** 스마트폰 '홈 화면에 추가' 시 앱처럼(주소창 없이) 열린다. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '글로벌 외식 트렌드 인텔리전스',
    short_name: '외식 트렌드',
    description: '전 세계 외식산업 뉴스를 매일 요약하는 브리프',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0f2f54',
    lang: 'ko',
    icons: [
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  }
}
