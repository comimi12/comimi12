@echo off
REM 월별 KPI 확정: 매월 5일 실행 — 전월 서비스 등급 확정 산출(리뷰+캐치테이블+VOC) → 공유파일 → 사이트 배포
REM 등급 = 리뷰 대비 불만율 순 S3/A4/B(나머지)/C4/D4. 1~5월은 취합 엑셀, 6월~ 자동 산출.
cd /d "%~dp0"
set PY="C:\Users\owner\AppData\Local\Programs\Python\Python312\python.exe"
%PY% kpi_build.py
%PY% build_share.py
%PY% deploy_site.py
exit /b 0
