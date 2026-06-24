@echo off
REM View 5·6 전용 일일 갱신: ECK(CS 체크리스트·QSCS) 수집 → eck_data.js → 공유파일 → 사이트 배포
REM 무거운 리뷰 수집과 분리해 매일 안정적으로 ECK만 갱신 (08:30)
cd /d "%~dp0"
set PY="C:\Users\owner\AppData\Local\Programs\Python\Python312\python.exe"
%PY% eck\eck_scrape.py
%PY% eck\eck_build.py
%PY% build_share.py
%PY% deploy_site.py
exit /b 0
