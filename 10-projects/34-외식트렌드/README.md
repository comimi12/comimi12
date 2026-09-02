# 34 · 글로벌 외식 트렌드 대시보드

전 세계 외식산업 뉴스·메뉴·브랜드·Restaurant Tech·출점 동향을 매일 수집·분석하는
경영진용 인텔리전스 대시보드 프로젝트.

## 구성

| 항목 | 위치 |
|---|---|
| 애플리케이션 | `global-foodservice-trend-dashboard/` |
| 상세 문서 | `global-foodservice-trend-dashboard/README.md` |
| 요구사항 원본 | `요구사항-원본-프롬프트.md` |

## 바로 실행

```bash
cd global-foodservice-trend-dashboard
npm install
cp .env.example .env
npm run dev          # http://localhost:3000
```

기본값이 DEMO 모드라 DB·API 키 없이 모든 화면이 동작한다.
실데이터 수집(PostgreSQL + AI 분석)은 앱 README의 4~7장 참조.

## 현재 상태 (2026-09-02)

- Phase 1~4 구현 완료 — 14개 화면, 15개 API, 수집 파이프라인, 스케줄러
- 빌드·타입체크·lint 통과, 전 라우트 200 확인
- 수집 파이프라인 실검증: 공개 RSS 11개 소스에서 225건 수집 성공
- DEMO 데이터 69건은 합성 데이터이며 대외 인용 금지 (앱 README 9장)

## 남은 과제

- RSS 미제공 10개 소스(Technomic·Euromonitor·Circana·JF협회 등) HTML 어댑터
- `/expansion` World Map 시각화 (현재는 국가 랭킹 차트 + 강도 그리드)
- 실데이터 전환 시 Supabase 연결 및 최초 마이그레이션·시드
