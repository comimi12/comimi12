# 15-daily-sales — 일자별 매출 대시보드

신세계 CloudPOS에서 일자별매출보고를 다운로드하여 대시보드로 시각화합니다.

## 폴더 구조

```
15-daily-sales/
├── dashboard/
│   └── index.html          # 대시보드 (브라우저로 열기)
├── data/                   # 원본 데이터 (gitignore)
├── .env                    # 로그인 정보 (gitignore — 절대 공유 금지)
├── auto-download.js        # 자동 다운로드 + 대시보드 갱신
├── build-dashboard.js      # 엑셀 → 대시보드 변환
├── setup-scheduler.ps1     # 작업 스케줄러 등록
└── analyze.js              # 데이터 구조 분석용
```

## 사용 방법

### 1. 수동 실행 (엑셀 다운받은 후)
```bash
node build-dashboard.js "C:\Users\user\Downloads\일자별매출보고(가로)_XXXXXX.xlsx"
```
→ `dashboard/index.html` 열기

### 2. 자동화 설정 (매일 09:00)
1. `setup-scheduler.ps1` 마우스 우클릭 → "PowerShell로 실행"
2. 이후 매일 9시에 자동 다운로드 + 대시보드 갱신

### 3. 수동 자동화 실행
```bash
node auto-download.js
```

## 대시보드 지표

| 지표 | 설명 |
|------|------|
| 순매출 | 오늘 실제 매출 (POS 집계) |
| 계획 | 오늘 목표 매출 |
| 전년 | 작년 같은 날 매출 |
| 달성률 | 순매출 / 계획 × 100 |

## 브랜드 목록
- **CHAI797** — 커피/카페 (가장 많은 매장)
- **호우섬/살롱드호우섬** — 레스토랑
- **서리재** — 레스토랑
- **이타마에** — 일식
- **정육점** — 정육
- **SL&C** — 본사 식품/케이터링
