# GLOBAL FOODSERVICE TREND INTELLIGENCE

전 세계 외식산업의 뉴스·신메뉴·신규 브랜드·소비자 트렌드·Restaurant Tech·출점/M&A를 매일 수집·분석하는
경영진용 인텔리전스 대시보드.

> 목표는 뉴스를 많이 보여주는 것이 아니라, **"오늘 외식기업 경영진이 무엇을 알아야 하는가"** 를
> 첫 화면에서 3분 안에 판단할 수 있게 하는 것이다.

대상 사용자: 외식기업 본사 기획 · 운영 · 교육 · 해외사업 담당자

---

## 1. 설치 방법

요구 사항: **Node.js 20 이상** (개발 확인 버전 24.x), npm 10 이상.

```bash
cd global-foodservice-trend-dashboard
npm install
cp .env.example .env        # Windows PowerShell: Copy-Item .env.example .env
```

`.env` 는 기본값이 **DEMO 모드**라 DB나 API 키 없이 바로 실행된다.

---

## 2. 실행 방법

```bash
npm run dev        # 개발 서버 → http://localhost:3000
npm run build      # 프로덕션 빌드
npm start          # 프로덕션 서버
npm run typecheck  # TypeScript 검사
npm run lint       # ESLint
```

### 화면 구성

| 경로 | 화면 | 내용 |
|---|---|---|
| `/` | Dashboard | KPI 6개 → TOP 10 → Trend Radar → 지역 스냅샷 → 차트 |
| `/daily-brief` | Daily Brief | 경영진 브리핑(지역별 TOP 3 + 글로벌 2). PDF 저장 가능 |
| `/global` `/asia` `/europe` `/americas` | Region Dashboard | TOP 5 · 키워드 · 브랜드 · 카테고리 분포 · 최근 피드 |
| `/trend-radar` | Trend Radar | 30일 급상승 키워드, 7일/30일 성장률, 지역 분포 |
| `/menu-trends` | Menu Trend | Food/Beverage/Dessert/Ingredient/Cuisine 등 축별 분석 |
| `/brand-watch` | Brand Watch | 워치리스트 브랜드 활동 매트릭스 |
| `/restaurant-tech` | Restaurant Tech | 기술별 도입 기업·브랜드·목적·기대효과 |
| `/expansion` | Expansion | 브랜드·본사국가·진출국가·점포수·확장유형 표 |
| `/news-feed` | News Feed | 전체 검색 + 7종 필터 |
| `/article/[id]` | 뉴스 상세 | 3줄 요약 · Why It Matters · Korea Implication · 점수 구성 |
| `/sources` | Sources Admin | 소스별 RSS 여부·Tier·수집 성공 여부 |
| `/settings` | Settings | 가중치·중복 임계값·추적 키워드·환경변수 상태 |

### API

모든 화면 데이터는 REST API로도 조회할 수 있다.

```
GET  /api/articles?q=&region=&country=&category=&brand=&source=&minScore=&range=&dupes=
GET  /api/articles/:id
GET  /api/kpis                # KPI 6개 + TOP 10
GET  /api/brief               # Executive Daily Brief
GET  /api/trends/keywords     # Trend Radar
GET  /api/trends/menu         # Menu Trend
GET  /api/brands              # Brand Watch
GET  /api/tech                # Restaurant Tech
GET  /api/expansion           # Expansion / Franchise
GET  /api/sources             # Source Registry
GET  /api/export?resource=<articles|trend-radar|menu-trends|brand-watch|restaurant-tech|expansion|sources>&format=<csv|xls>
POST /api/collect             # 수집 파이프라인 수동 실행  body: {"dryRun": true}
GET  /api/cron/daily          # 스케줄러 진입점 (Bearer CRON_SECRET)
```

---

## 3. 환경 변수

`.env.example` 참조. 주요 항목:

| 변수 | 기본값 | 설명 |
|---|---|---|
| `DATA_MODE` | `demo` | `demo` = 내장 샘플 데이터 / `live` = PostgreSQL |
| `NEXT_PUBLIC_DEMO_TODAY` | `2026-09-02` | 데모 데이터의 "오늘" 기준일. 비우면 실제 today |
| `DATABASE_URL` | — | PostgreSQL 접속 문자열 (Supabase 권장) |
| `AI_PROVIDER` | `claude` | `claude` \| `openai` \| `none` |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | — / `claude-opus-5` | Claude API |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | — / `gpt-4.1-mini` | OpenAI API |
| `NEWSAPI_KEY` | — | RSS 보조 수집용(선택) |
| `COLLECT_TIMEOUT_MS` / `COLLECT_MAX_PER_SOURCE` | `15000` / `25` | 수집 타임아웃·소스당 최대 건수 |
| `CRON_SECRET` | `change-me` | `/api/cron/daily` 인증 토큰 |

`/settings` 화면에서 현재 설정 상태를 확인할 수 있다.

---

## 4. Database Setup

DEMO 모드에서는 DB가 필요 없다. 실데이터를 축적하려면:

```bash
# 1) .env 설정
DATA_MODE=live
DATABASE_URL="postgresql://user:pw@host:5432/foodservice_trends?schema=public"

# 2) Prisma Client 생성 + 스키마 반영
npm run db:generate
npm run db:migrate          # 최초: 마이그레이션 생성 및 적용
# 배포 환경에서는  npm run db:deploy

# 3) 소스·워치리스트·레이더 키워드 시드
npm run db:seed

npm run db:studio           # 데이터 확인 (선택)
```

### 스키마 개요 (`prisma/schema.prisma`)

`Source` · `Article` · `Brand` · `Keyword` · `ArticleBrand` · `ArticleKeyword` ·
`KeywordDailyStat` · `ExpansionRecord` · `TechRecord` · `MenuRecord` ·
`DailyBrief` · `CollectionRun` · `CrawlEvent`

`Article` 에는 `publishedDate` / `publishedMonth` / `publishedYear` 비정규화 컬럼과 인덱스가 있어
**최소 3년 보존 + YoY·월별·브랜드·식재료·기술 도입·프랜차이즈 확장 분석**이 가능하다.

Supabase를 쓸 경우 Connection Pooling URL을 `DATABASE_URL`,
Direct URL을 `DIRECT_URL` 에 넣는다.

---

## 5. AI API Setup

기사 분석은 `src/lib/ai/` 에서 **provider 추상화**로 처리된다.

```bash
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-opus-5
```

또는

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

- 프롬프트: `src/lib/ai/prompt.ts` (§25 구조 그대로)
- 출력 스키마: `src/lib/ai/schema.ts` (zod → structured output으로 강제)
- **키가 없거나 `AI_PROVIDER=none` 이면 규칙 기반 분석기로 폴백**한다.
  이 폴백은 요약문을 창작하지 않고 원문 문장을 인용하며, 카테고리는 키워드 규칙으로 분류한다.
- 신뢰도 점수는 AI 판단이 아니라 **소스 Tier**가 결정한다(`src/lib/scoring.ts`의 `resolveReliability`).
  AI 값은 Tier 점수 ±5점 범위에서만 보정된다.

---

## 6. News API / RSS Setup

수집은 **RSS 우선**이다. 소스 목록은 `src/lib/sources.ts` 한 곳에서 관리한다.

```bash
npm run collect:dry   # 수집·분석만 실행, DB 쓰기 없음 (설정 검증용)
npm run collect       # 수집 + DB 저장 (DATA_MODE=live 필요)
```

현재 21개 소스 중 **11개가 공개 RSS를 제공**하며 나머지 10개는 RSS가 없다.
RSS 미제공 소스는 `/sources` 화면에 사유가 표시되고 수집에서 건너뛴다.

| 상태 | 소스 |
|---|---|
| RSS 수집 | QSR Media Asia, SCMP Food, Restaurant Online, The Caterer, Restaurant Industry UK, Restaurant Business, Restaurant Dive, NRN, QSR Magazine, FSR Magazine, Mercado & Consumo |
| RSS 없음 | Technomic, Euromonitor, Circana, Foodlink Japan, Hot Pepper 外食総研, JF Association, MCA Insight, HOTREC, NRA, Restaurants Canada |

RSS 없는 소스를 붙이려면 `src/lib/collect/` 에 소스별 HTML 어댑터를 추가하고
`collectFromSources()` 에서 호출하면 된다. 반환 타입만 `FeedItem` 을 맞추면 나머지 파이프라인은 그대로 동작한다.

`NEWSAPI_KEY` 는 보조 수집용 자리표시자이며 현재 파이프라인은 RSS만 사용한다.

### 파이프라인 단계 (`src/lib/collect/pipeline.ts`)

Source Check → Collection → Duplicate Detection → AI Summarization → Translation →
Categorization → Scoring → Keyword Extraction → Database Insert → Dashboard Refresh →
Daily Executive Brief Generation

---

## 7. Cron Setup

기본 스케줄은 **매일 06:00 KST = 21:00 UTC**.

### Vercel Cron

`vercel.json` 에 이미 등록돼 있다.

```json
{ "crons": [{ "path": "/api/cron/daily", "schedule": "0 21 * * *" }] }
```

Vercel 프로젝트 환경변수에 `CRON_SECRET` 을 설정한다.

### GitHub Actions

`.github/workflows/daily-collect.yml` 이 같은 시각에 배포된 앱의 엔드포인트를 호출한다.
리포지토리 Secrets에 다음을 등록한다.

- `APP_URL` — 예: `https://your-app.vercel.app`
- `CRON_SECRET` — 앱과 동일한 값

### 수동 실행

```bash
curl -X POST https://your-app.vercel.app/api/collect \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "content-type: application/json" \
  -d '{"dryRun": true}'
```

---

## 8. Deployment

### Vercel (권장)

1. 리포지토리 연결 → Framework: Next.js (자동 감지)
2. 환경변수 등록: `DATA_MODE=live`, `DATABASE_URL`, `DIRECT_URL`, `AI_PROVIDER`,
   `ANTHROPIC_API_KEY`(또는 `OPENAI_API_KEY`), `CRON_SECRET`
3. Build Command에 Prisma 생성을 포함한다:
   `prisma generate && next build`
4. 최초 배포 후 마이그레이션·시드 적용:
   `npm run db:deploy && npm run db:seed`
5. `vercel.json` 의 Cron이 자동 등록된다.

### 자체 호스팅

```bash
npm ci
npx prisma generate
npm run build
npm start          # 기본 포트 3000
```

Node 20+ 런타임과 PostgreSQL 접근이 필요하다. Cron은 시스템 crontab에서
`curl -H "Authorization: Bearer $CRON_SECRET" $APP_URL/api/cron/daily` 를 호출하면 된다.

---

## 9. DEMO 데이터에 대한 고지

`DATA_MODE=demo` 에서 보이는 기사 69건은 **실제 보도 기사가 아니라 화면 검증용 합성 데이터**다.

- 실존 브랜드명을 사용하지만 기사 내용·수치는 이 프로젝트에서 작성한 것이다.
- 그래서 존재하지 않는 기사 URL을 만들지 않고, `articleUrl` 은 **출처 사이트 홈**으로 연결된다.
- 상단에 `DEMO DATA` 배지, 대시보드와 상세 화면에 고지 문구가 항상 표시된다.
- 이 데이터를 대외 자료로 인용하면 안 된다. 실데이터는 `DATA_MODE=live` + 수집 파이프라인으로 채운다.

지역 비중은 ASIA 32% / EUROPE 25% / AMERICAS 35% / GLOBAL 9% 로 구성했고,
중복 판정 로직 확인용으로 같은 사건을 다룬 기사 쌍 2건이 포함돼 있다.

---

## 10. 설계 메모

### 스코어링 (`src/lib/scoring.ts`)

```
Total = Business Impact 30% + Novelty 25% + Market Scale 20%
      + Source Reliability 15% + Korea Relevance 10%
```

라벨: 90+ `MUST KNOW` · 80+ `HIGH` · 70+ `WATCH` · 60+ `REFERENCE` · 59↓ `LOW`
색상 배지가 아니라 **텍스트 라벨**로 표기한다.

TOP 10 순위는 원점수를 훼손하지 않도록 별도 `rankingScore` 로 계산한다
(총점 + 신선도 감쇠 + 지역 가중 + 한국 적용 가능성).

### 중복 판정 (`src/lib/dedupe.ts`)

발행일 ±2일 이내에서만 비교하며
`제목 35% + 키워드 30% + 브랜드 20% + 본문 15%` 가중합이 `0.55` 이상이면 같은 사건으로 본다.
대표 기사는 신뢰도 → 총점 → 발행시각 순으로 1건만 남는다.

다음 경우에는 유사해도 **별도 기사로 유지**한다.
서로 다른 지역의 영향 분석 / 새로운 수치 추가 / 다른 기업의 대응 사례 / 후속 기사.

### 신뢰도 Tier (`src/lib/sources.ts`)

Tier 1 리서치·협회 1차 자료 · Tier 2 산업 전문 매체 · Tier 3 기타 산업 미디어 · Tier 4 출처 불명.
**Tier 4는 메인 대시보드에 노출되지 않는다.**

### 추적 대상 편집

- Trend Radar 키워드 · Brand 워치리스트 → `src/lib/radar-keywords.ts`
- 수집 소스 · Tier → `src/lib/sources.ts`
- 카테고리 표시명 → `src/lib/categories.ts`

---

## 11. 알려진 제약

- **World Map 시각화 미적용.** `/expansion` 은 국가별 랭킹 차트와 강도 표시 그리드로 대체했다.
  지도를 넣으려면 지도 라이브러리와 topojson 데이터를 추가해야 한다.
- **RSS 미제공 10개 소스 미수집.** 소스별 HTML 어댑터가 필요하다(위 6장 참조).
- `npm audit` 에 Prisma CLI의 전이 의존성(`mysql2`, `deepmerge-ts`) 관련 경고가 남아 있다.
  개발 의존성이며 런타임(PostgreSQL) 경로에는 사용되지 않는다.
- Excel Export는 Excel이 여는 XML Spreadsheet 형식이다(바이너리 `.xlsx` 아님).
  Daily Brief PDF는 브라우저 인쇄(→ PDF로 저장)를 사용한다.

---

## 12. 기술 스택

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Recharts · Radix UI ·
Prisma 6 + PostgreSQL · Anthropic / OpenAI SDK · Vercel Cron / GitHub Actions
