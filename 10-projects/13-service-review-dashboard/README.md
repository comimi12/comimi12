# 서비스 리뷰 통합 대시보드 (삼천리 SL&C)

네이버·캐치테이블 리뷰 + SL&C 자체 채널 "고객의 소리"를 **매월** 통합해
브랜드/매장 건전성, TOP3 불만 매장 액션, 크리티컬 접수, 불만 토픽을 한 화면에서 본다.

5개 브랜드(**Chai·호우섬·서리재·이타마에·정육점**) · 84개 지점 · 경영 보고용(월 1회).

## 빠르게 보기

**`open-dashboard.cmd` 더블클릭** (또는 `dashboard.html` 직접 열기). 서버 불필요.

| 탭 | 내용 |
|----|------|
| ① 브랜드 리뷰 종합 | 브랜드별 리뷰수/칭찬/불만/**불만율**(전월 대비), 매장 랭킹 |
| ② 불만 매장 개선 방안 | 불만 건수 상위 매장 + AI 불만요약·개선방안·실행계획(부서별). **기간 지정 조회**(예: 1~5월) |
| ③ SL&C 고객의 소리 | 크리티컬 건 + **불만 리뷰 상세**(요약·개선방안). **기간 조회**·개인정보 마스킹 |
| ④ 매장 검색·드릴다운 | 매장 검색 → 월별 리뷰수·칭찬·불만·불만율 + 불만 리뷰 상세 |
| ⑤ CS 체크리스트 일일점검현황 | **ECK 코드60 연동** — 매장×일자 점검 완료 히트맵·점검률. **기간 조회**(단월=일자 히트맵 / 기간=매장×월 점검률) |
| ⑥ QSCS 캠페인 이체크폼 등록현황 | **ECK 코드59 연동** — 매장별 캠페인 교육일지 등록 여부·등록률. **기간 조회**(단월=등록/미등록 / 기간=매장×월 등록) |

> ⑤⑥은 외부 시스템(ECK/Solbitech) 연동 데이터입니다. 아래 **ECK 연동** 섹션 참조.

---

## 📅 매월 업데이트 (핵심)

> 데이터는 **스크립트(수치) + Claude Code(질적 분석)** 가 함께 만든다. API 키·비용 없음.

1. **월별 리뷰 엑셀을 CSV로 추출** (DRM 보안 파일도 OK)
   ```powershell
   cd 10-projects\13-service-review-dashboard
   .\extract_xlsx.ps1 "C:\...\review_2026년 6월 리뷰 결과.xlsx"
   ```
   → `data/reviews/`에 CSV 저장. (`리뷰원본`/`업로드리뷰원본` 시트 자동 인식, Excel을 통해 DRM 복호화)
   - SL&C 고객의 소리(.xls)는 `data/voc/`에 그대로 넣으면 됨.
2. **Claude Code에 "대시보드 업데이트해줘"** → Claude가:
   - `python build.py` 실행 → 정제·집계 → `data.js` + `ai_input.json`
   - `ai_input.json`을 읽고 → TOP3 요약·개선대책·완료방법·토픽·인사이트를 `ai_notes.js`에 작성
3. **`open-dashboard.cmd` 더블클릭** → 갱신 확인.

### 직접 실행(수치만 갱신)
```powershell
python build.py        # data/reviews 의 모든 월별 CSV를 읽어 data.js 갱신
```
> `build.py`만 돌리면 ②④의 **AI 텍스트 요약**은 지난달 내용으로 남는다. 요약까지 갱신하려면 2번(Claude에 요청).

### 동작 방식 (자동 처리)
- **여러 월 누적**: `data/reviews/`의 **모든 CSV를 읽어 합산**. 월별 파일을 계속 쌓으면 됨.
- **양식 2종 자동 인식**: 구양식(`리뷰유형` 긍정/부정/중립) + 신양식(`리뷰감성(Gemini)`). 감성은 파일의 사전분류를 그대로 사용.
- **중복 제거**: 월별 파일이 겹쳐도 (매장·날짜·내용) 동일 리뷰는 1건으로.
- **캐치테이블 보충**: 프로그램 파일에 캐치테이블이 없는 월은 `merged_reviews_*.csv`의 캐치테이블로 자동 합산(평점→감성). → **merged 파일을 `data/reviews/`에서 지우지 말 것.**
- **부분 월 자동 제외**: 파일 경계로 생기는 소량 월(중앙값의 25% 미만)은 현재월/집계에서 제외.
- **신규 오픈 매장**: 그 달 리뷰가 1건이라도 들어오면 자동 포함(매장명 코드 C/H/S/I/J로 분류). 별도 등록 불필요.

---

## 🔄 전체 자동 갱신 (매일 09:00) — update_all.py

Windows 작업 **`ServiceReview_Daily_Update`** 가 매일 09:00 `run-daily.cmd` 실행 → ①②③④⑤⑥ 전부 갱신 + 당월 분석 엑셀 생성.

```powershell
python update_all.py                 # 전체 갱신 한 번에 (VOC→ECK→리뷰→build→share)
python update_all.py --catchtable    # 캐치테이블 리뷰도 시도(selenium+쿠키 필요)
python export_monthly.py 2026-06     # 특정 월 분석 엑셀(exports/)
```

| 소스 | 스크립트 | 뷰 | 자동화 |
|---|---|---|---|
| 네이버 리뷰 | `collect.py` | ①②④ | ✅ 무로그인 |
| 고객의 소리(VOC) | `voc/voc_scrape.py` | ③ | ✅ 자동 로그인(slnc.co.kr) · **평문 다운로드라 DRM 우회** |
| ECK CS·QSCS | `eck/eck_scrape.py` | ⑤⑥ | ✅ 자동 로그인(RSA) |
| 캐치테이블 | `collect.py --catchtable` | ②(보충) | ⚠ selenium+쿠키 필요(아래) |

- 로그: `_logs/update_YYYY-MM-DD.log`
- 작업 삭제: `schtasks /Delete /TN "ServiceReview_Daily_Update" /F`
- 작업 확인: `schtasks /Query /TN "ServiceReview_Daily_Update"`

### 🌐 공유 사이트 (GitHub Pages)
- 공개 URL: **https://comimi12.github.io/slnc-review-dashboard/** (저장소 `comimi12/slnc-review-dashboard`, 공개)
- `deploy_site.py`: `dashboard-share.html` → 사이트 `index.html` 푸시(변경 시에만). update_all 마지막 단계에서 매일 자동 재배포.
- ⚠️ **완전 공개** 선택됨 — VOC 고객 내용·실행계획 포함. URL 아는 누구나 접근·검색 노출 가능.

### 🔁 교차 검증 (cross_check.py)
매크로 원본 CSV를 `data/reviews/`에 넣으면 자동 수집분(`naver_collected_*`)과 월별 대조: `python cross_check.py`. (자동은 당월 중심 수집이라 과거월은 수동이 정답 — build.py가 합쳐 중복제거)

### 월별 다운로드 (export_monthly.py)
`exports/매장리뷰분석_YYYY-MM.xlsx` — **8시트**: 요약(+추이 그래프)·매장별(+불만율 차트)·브랜드별·불만리뷰 원본·개선방안/실행계획·VOC·CS체크리스트·QSCS. 매일 당월분 갱신, 과거월 파일은 보관됨. 임의 월: `python export_monthly.py 2026-05`.

### ⚠️ 캐치테이블 (자동화 미완)
캐치테이블은 매크로의 쿠키(`catchtable_session.env`)로 동작하는데 만료되면 매크로에서 재로그인해 갱신해야 한다. 완전 자동 로그인은 로그인 방식(이메일/SMS) 확인이 필요해 **현재 일일 갱신엔 미포함(네이버만)**. 포함하려면 `pip install selenium chardet` + 유효 쿠키 후 `--catchtable`. 4~6월 캐치테이블은 기존 `merged_reviews_*.csv`로 이미 반영됨.

## 🤖 리뷰 자동 수집 (collect.py) — View 1·2

`AI매장리뷰_V0.1.exe`(캐치테이블·네이버 리뷰 분석 매크로)를 **클릭하지 않고**, 그 안의 수집기 소스를 헤드리스로 호출해 리뷰 원본을 자동 수집한다.

```powershell
cd 10-projects\13-service-review-dashboard
python collect.py                  # 네이버 이번 달 수집 → data/reviews → build.py (View 1·2 갱신)
python collect.py 2026-06-01       # 기준일자(이 날짜 이상 방문 리뷰)
python collect.py --no-build       # 수집만(빌드 생략)
python collect.py --catchtable     # 캐치테이블도 (pip install selenium chardet + 유효 쿠키 필요)
```

- **네이버**: 플레이스 GraphQL API로 **로그인 없이** 수집(검증됨). 83개 매장 → `data/reviews/naver_collected_*.csv`(양식 A, 채널=네이버) → build.py가 자동 인식·집계·중복제거.
- **캐치테이블**: Selenium 기반(옵션). `catchtable_session.env` 쿠키가 만료되면 매크로에서 재로그인해 갱신 필요. 결과는 `merged_reviews_*.csv`(보충 양식)로 저장.
- 매크로 폴더 경로 = `collect_config.json`(git 제외)의 `macro_dir`. 매장목록은 매크로의 `store_registry.json` 사용.
- 수집기 소스(.py)는 매크로 `_internal`에 있으며(파이썬 3.13 번들), 실행 시 임시폴더로 복사해 현재 파이썬으로 임포트(바이너리 충돌 회피).
- **⚠️ DRM 주의**: VOC(View 3) 원본 `.xls`는 DRM(DRMONE) 잠김이라 자동화 컨텍스트에선 복호화가 안 붙을 수 있음 → build.py는 이때 **기존 data.js의 VOC를 보존**하고 리뷰(View 1·2)만 갱신. VOC까지 갱신하려면 DRM이 해제되는 대화형 환경에서 `python build.py` 실행.

## 🔗 ECK 연동 (⑤ CS 체크리스트 / ⑥ QSCS 교육일지)

외부 시스템 **ECK(Solbitech SLNC, `eck.solbitech.com`)** 에 자동 로그인해 점포점검 리포트를 수집한다.
대시보드는 정적 HTML이라 브라우저에서 직접 접속하지 못하므로 **Playwright가 로그인→Excel 내보내기→파싱→`eck_data.js`** 구조로 동작한다.

```powershell
cd 10-projects\13-service-review-dashboard
python eck\eck_scrape.py 2026-01 2026-06   # ECK 로그인 → 코드60·59 Excel 기간 전체 다운로드 (data/eck/)
python eck\eck_build.py                      # data/eck 의 모든 월 파싱 → eck_data.js (월별 구조)
open-dashboard.cmd                           # ⑤⑥ 탭에서 확인
```
> 단월만: `python eck\eck_scrape.py 2026-06`. 특정 리포트만: `... 2026-06 cs`(또는 `qscs`). `eck_build.py`는 인자 없이 `data/eck/`의 모든 cs_*/qscs_* 를 자동 집계.

- **코드 60 [서비스] CS 체크리스트 월별 점검현황** → ⑤. 매장×일자(1~31) O(완료)/빈칸. 점검률은 **경과일(어제까지)** 기준, 오늘은 "진행중". 기간 조회 시 **매장×월 점검률**.
- **코드 59 [QSCS] 통합캠페인 교육일지 현황** → ⑥. 교육일지를 **등록한 매장만** 목록에 존재 → CS 매장 명단과 대조해 미등록 산출. 기간 조회 시 **매장×월 등록 현황**.
- **자격증명**: `eck/eck_config.json`(아이디/비번) — **git 제외**. 노출 주의.
- **Playwright 필요**: `pip install playwright && playwright install chromium` (이미 설치됨).
- 로그인 폼은 RSA 암호화 → 사이트의 `#loginSubmit` 버튼 클릭으로 처리(스크립트 자동).

## 구성

| 파일 | 역할 | git |
|------|------|-----|
| `extract_xlsx.ps1` | 월별 리뷰 엑셀(DRM 포함)→CSV 추출 | ✅ |
| `build.py` | 정제·집계 엔진 → `data.js` + `ai_input.json` | ✅ |
| `ai_notes.js` | Claude가 작성하는 질적 분석(요약·대책·토픽·인사이트) | ✅ |
| `dashboard.html` | 대시보드 UI (5개 탭) | ✅ |
| `logo.png` | 삼천리 SL&C 로고 | ✅ |
| `open-dashboard.cmd` | 대시보드 열기 | ✅ |
| `dashboard-prd.md` | 설계 PRD | ✅ |
| `data/reviews/`, `data/voc/` | 월간 원본 (**VOC에 개인정보 포함 → git 제외**) | ❌ |
| `data.js`, `ai_input.json` | 생성물 (git 제외) | ❌ |
| `echarts.min.js` | 차트 라이브러리 (오프라인 로컬 벤더) | ✅ |

---

## ⚠️ 데이터 신뢰성

- **칭찬/불만/중립(=긍정/부정/중립)은 원본 월별 파일의 사전분류 값**입니다(1·2월=`리뷰유형`, 3월~=`리뷰감성(Gemini)`). 보충 캐치테이블만 평점 기반으로 분류. 대시보드가 새로 추정하지 않습니다.
- 리뷰 대부분이 **네이버 영수증 리뷰(이벤트성·긍정 편향)**라 불만율이 낮게 나옵니다 → **절대 수치보다 월간 추이·매장 간 비교**로 해석하세요.
- **표본 10건 미만 매장**은 불만율이 크게 튈 수 있어(단건 영향) TOP3 랭킹에서 제외하고, 검색·표에는 `표본N` 표시로 노출합니다.
- **부분 월 제외**: 파일 경계로 생기는 소량 월은 자동 제외(중앙값 25% 미만). 임계 조정은 `build.py`의 `thr`.
- **SL&C 개인정보**(작성자·연락처)는 마스킹되어 표시됩니다. 원본은 git에 올리지 않습니다.
- 표시 기간은 **최근 6개월**(데이터에 있는 월 기준).

## 데이터 출처
- **리뷰(네이버)**: 매월 `AI매장리뷰분석프로그램` 출력 엑셀 → `extract_xlsx.ps1`로 CSV화. 매장명=브랜드코드(C/H/S/I/J).지점명. 양식 2종(`리뷰원본`/`업로드리뷰원본`) 자동 인식.
- **리뷰(캐치테이블)**: 1~3월은 프로그램 파일에 포함. 4월~ 프로그램 파일에 없어 `merged_reviews_*.csv`의 캐치테이블로 보충(평점→감성).
- **SL&C 고객의 소리**: 자체 관리자 내보내기 `customer_list_*.xls` (HTML 테이블) — 구분(칭찬/불만족/의견)·문의유형·답변상태 포함. "의견"은 "기타"로 매핑.
