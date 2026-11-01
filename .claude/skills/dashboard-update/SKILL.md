---
name: dashboard-update
description: 서비스 리뷰 통합 대시보드(10-projects/13-service-review-dashboard) 갱신. data/reviews 에 넣은 네이버·캐치테이블 월별 파일을 반영하고 data.js·공유파일·공유사이트까지 업데이트. "대시보드 업데이트", "리뷰 대시보드 갱신", "리뷰 대시보드 업데이트", "VOC 대시보드 업데이트", "서비스 리뷰 대시보드", "대시보드 갱신", "자료 넣었어 업데이트", "리뷰 자료 반영" 등을 언급하면 자동 실행.
allowed-tools:
  - Bash
  - Read
---

# 서비스 리뷰 대시보드 업데이트

대상 프로젝트: `10-projects/13-service-review-dashboard` (메모리 [[voc-review-dashboard]] 참조)

## 동작 — ⚠️ 무조건 왼쪽 탭 전부 갱신 (사용자 지시 2026-11-02, 예외 없음)
사용자가 "대시보드 업데이트해줘" 류로 요청하면 리뷰만 반영하고 끝내지 말고 **왼쪽 사이드바 탭 전부**를 아래 순서로 처음부터 하나씩 갱신·점검한다. **확인 질문 없이 바로 진행**([[work-style-auto-proceed]]).

```bash
cd "C:/Users/owner/do-better-workspace-v2/10-projects/13-service-review-dashboard"
# 0) 데이터 파일 점검: 새 NaverReviews_*.xlsx 에 '정확히 250건 + 첫 날짜가 월초 아님' 매장 있으면 상한 걸림
#    → 반영 전 수집 프로그램 '페이지 20'으로 재수집 요청 (메모리 review-collector-page-20)
python voc/voc_scrape.py                 # ③ 고객의 소리
python eck/eck_scrape.py <전월> <당월>    # ⑤ CS · ⑥ QSCS (예: 2026-10 2026-11)
python eck/eck_build.py
python build.py                          # ①②④ 월간회의·실시간·상벌·보고서·모니터링 (data.js) — 데이터 파일 100% 기준
python pos/pos_guests.py                 # POS 고객수 (data/reviews/일자별매출_*.xlsx 있으면 그 값 우선)
python weekly_rank_build.py              # 🏆 주차별 매장 리뷰순위 (방문일자 기준, 주차 합 = 월 리뷰수)
python kpi_build.py                      # 📊 월별 KPI
python campaign_build.py --extract       # ⑦ 캠페인 — 새 달 폴더(교육팀\11. 월별 캠페인_서비스중점업무\26.MM) 있으면 MONTHS 에 먼저 추가
python tab_check.py                      # 전 탭 열어 스크립트 오류·빈 화면 점검 (playwright)
python build_share.py && python deploy_site.py
```
- ②: `ai_notes.js` 당월 TOP3 카드·토픽·뷰별 인사이트를 확정 수치로 재작성(매장별 건수 대조).
- 🎁 인센티브: 분기 원본 PPT("인센티브 대상점포_고객의 소리 유입 매장") 수동 입력 → 새 분기 자료 있으면 `incentive_data.js` 추가, 없으면 "자료 없음" 보고.
- 💬 MOT · 📐 플로어플랜 · 매뉴얼 탭: 고정 자료 — tab_check 로 정상 표시만 확인.
- 마지막에 이 프로젝트 파일만 커밋·푸시(메모리 voc-review-dashboard 자동배포 규칙).
- `update_all.py`(네이버 자동수집 포함)는 오래 걸리고 메모리 부족으로 중단될 수 있음 → 위처럼 단계별 실행이 안전.

## 마무리
- **탭별 결과표**로 보고(탭 · 갱신 내용 · 핵심 수치 · 확인 필요 사항).
- 월별 리뷰 수·불만 수(출처별 네이버/캐치테이블)를 요약 보고.
- 필요시 `python cross_check.py` 로 자동 vs 수동 교차검증, `open-dashboard.cmd` 로 로컬 열기.
- 인코딩 깨짐(콘솔 한글)은 표시 문제일 뿐 — exit code 0 이면 정상.

## 참고
- 매일 09:00 Windows 작업 `ServiceReview_Daily_Update` 가 `update_all.py`를 자동 실행하므로, 파일만 넣고 두면 다음날 자동 반영됨.
- 자격증명·원본데이터는 .gitignore 제외. 상세 절차는 프로젝트 `README.md`.
