---
name: dashboard-update
description: 서비스 리뷰 통합 대시보드(10-projects/13-service-review-dashboard) 갱신. data/reviews 에 넣은 네이버·캐치테이블 월별 파일을 반영하고 data.js·공유파일·공유사이트까지 업데이트. "대시보드 업데이트", "리뷰 대시보드 갱신", "리뷰 대시보드 업데이트", "VOC 대시보드 업데이트", "서비스 리뷰 대시보드", "대시보드 갱신", "자료 넣었어 업데이트", "리뷰 자료 반영" 등을 언급하면 자동 실행.
allowed-tools:
  - Bash
  - Read
---

# 서비스 리뷰 대시보드 업데이트

대상 프로젝트: `10-projects/13-service-review-dashboard` (메모리 [[voc-review-dashboard]] 참조)

## 동작
사용자가 "대시보드 업데이트해줘" 류로 요청하면(보통 `data/reviews/`에 새 월 네이버·캐치테이블 CSV를 넣은 뒤) 아래를 실행한다. **확인 질문 없이 바로 진행**([[work-style-auto-proceed]]).

### 기본(넣은 파일 반영 + 사이트 배포) — 가장 흔함
```bash
cd "C:/Users/owner/do-better-workspace-v2/10-projects/13-service-review-dashboard"
python build.py          # data/reviews + data/voc → data.js (리뷰+VOC). 프로그램 파일 있는 달은 프로그램 100%, 자동수집은 보충. 캐치테이블 포함·중복제거.
python build_share.py    # dashboard-share.html (공유 단일파일)
python deploy_site.py    # 공유 사이트 재배포 → https://comimi12.github.io/slnc-review-dashboard/
```

### 전체 새로고침(외부 소스까지 다시 수집) — "전체 갱신/싹 다시" 요청 시
```bash
python update_all.py     # 네이버 자동수집 + VOC(slnc 로그인) + ECK(CS·QSCS) + build + share + 사이트 배포
```

## 마무리
- 실행 후 월별 리뷰 수·불만 수(출처별 네이버/캐치테이블)를 요약 보고.
- 필요시 `python cross_check.py` 로 자동 vs 수동 교차검증, `open-dashboard.cmd` 로 로컬 열기.
- 인코딩 깨짐(콘솔 한글)은 표시 문제일 뿐 — exit code 0 이면 정상.

## 참고
- 매일 09:00 Windows 작업 `ServiceReview_Daily_Update` 가 `update_all.py`를 자동 실행하므로, 파일만 넣고 두면 다음날 자동 반영됨.
- 자격증명·원본데이터는 .gitignore 제외. 상세 절차는 프로젝트 `README.md`.
