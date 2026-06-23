@echo off
REM 매일 09:00 자동 실행: 전체 대시보드 갱신 + 당월 분석 엑셀 생성
cd /d "%~dp0"
set PY="C:\Users\owner\AppData\Local\Programs\Python\Python312\python.exe"
%PY% update_all.py
%PY% export_monthly.py
exit /b 0
