# -*- coding: utf-8 -*-
"""
전체 대시보드 1회 갱신 (매일 09:00 스케줄용).
  1) VOC      : voc/voc_scrape.py        → 고객의 소리 (View 3)
  2) ECK      : eck/eck_scrape.py + eck_build.py → CS·QSCS (View 5·6)
  3) 리뷰     : collect_v2.py             → 네이버 (View 1·2·4). --catchtable 시 collect.py 추가 실행
  4) build.py : data.js (리뷰+VOC)
  5) build_share.py : dashboard-share.html

각 단계는 독립 실행 — 한 소스가 실패해도 나머지는 진행. 로그는 _logs/update_YYYY-MM-DD.log.

사용:
  python update_all.py                 # 전체(네이버 리뷰 + ECK 당월 + VOC)
  python update_all.py --catchtable    # 캐치테이블 리뷰도 시도
  python update_all.py --no-share      # 공유파일 생성 생략
"""
import sys, io, os, subprocess, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
PY = sys.executable
LOGDIR = os.path.join(HERE, "_logs"); os.makedirs(LOGDIR, exist_ok=True)
LOGFILE = os.path.join(LOGDIR, f"update_{datetime.date.today():%Y-%m-%d}.log")
CATCHTABLE = "--catchtable" in sys.argv
SHARE = "--no-share" not in sys.argv
MONTH = datetime.date.today().strftime("%Y-%m")
MONTH_START = datetime.date.today().strftime("%Y-%m-01")
# ECK는 전월도 함께 재수집한다. 당월만 받으면 (a) 월말일 점검이 그날 오전 스냅샷에 고정되고
# (b) PC가 꺼져 스케줄을 건너뛴 날이 영구 구멍으로 남는다. 전월 재수집으로 자동 복구.
_pm = datetime.date.today().replace(day=1) - datetime.timedelta(days=1)
PREV_MONTH = _pm.strftime("%Y-%m")
# Windows: 자식 프로세스가 콘솔 창을 새로 띄우지 않게 (팝업 갱신 시 창 깜빡임 방지)
CREATE_NO_WINDOW = 0x08000000 if os.name == "nt" else 0


def log(msg):
    line = f"[{datetime.datetime.now():%H:%M:%S}] {msg}"
    print(line)
    with open(LOGFILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def step(name, args, cwd=HERE, timeout=900):
    log(f"▶ {name}: {' '.join(os.path.basename(a) if a.endswith('.py') else a for a in args)}")
    try:
        r = subprocess.run([PY] + args, cwd=cwd, timeout=timeout,
                           capture_output=True, text=True, encoding="utf-8", errors="replace",
                           creationflags=CREATE_NO_WINDOW)
        tail = "\n".join((r.stdout or "").strip().splitlines()[-3:])
        if r.returncode == 0:
            log(f"  ✅ {name} 완료. {tail}")
            return True
        log(f"  ❌ {name} 실패(exit {r.returncode}). {tail}\n  stderr: {(r.stderr or '').strip()[-300:]}")
    except subprocess.TimeoutExpired:
        log(f"  ⏱ {name} 타임아웃")
    except Exception as e:
        log(f"  ❌ {name} 예외: {type(e).__name__} {e}")
    return False


def main():
    log(f"===== 전체 갱신 시작 (month={MONTH}, catchtable={CATCHTABLE}) =====")
    # 1) VOC (View 3) — 사이트 직접 다운로드(평문, DRM 우회)
    step("VOC 수집", [os.path.join("voc", "voc_scrape.py")])
    # 2) ECK (View 5·6) — 전월+당월 수집 후 전체월 집계
    step("ECK 수집", [os.path.join("eck", "eck_scrape.py"), PREV_MONTH, MONTH])
    step("ECK 집계", [os.path.join("eck", "eck_build.py")])
    # 3) 리뷰 (View 1·2·4) — 네이버 당월. 빌드는 마지막에 1회.
    #    2026-06-24 이후 네이버가 collect.py 를 405 로 차단(하드코딩 x-wtm-graphql + 1.2 QPS).
    #    → collect_v2.py 사용: 매장별 토큰 생성 + 요청간격 4초 + 405/429 짧은 백오프(5/15/40s).
    #    자체 시간예산 45분(DEADLINE_MIN)이 아래 timeout=3600 보다 먼저 발동해 항상 정상 종료.
    #    남은 매장은 다음날 순환으로 이어받는다. naver_cookie.txt 있으면 차단↓.
    step("리뷰 수집", ["collect_v2.py", MONTH_START, "--pages", "15"], timeout=3600)
    if CATCHTABLE:
        # 캐치테이블은 아직 collect.py 경로만 지원(selenium+쿠키).
        # collect.py 는 네이버도 함께 긁으므로 --catchtable 을 쓸 때만 실행한다.
        step("캐치테이블 수집", ["collect.py", MONTH_START, "--no-build", "--catchtable"], timeout=1800)
    # 4) build → data.js (리뷰 + VOC). VOC DRM이면 기존값 보존
    step("build (data.js)", ["build.py"])
    # ※ KPI(kpi_build)는 일일 갱신 안 함 — 매월 5일 KPI_Monthly_Grade(run-kpi.cmd)가 전월 확정.
    # 5) 공유파일 + 공유 사이트(GitHub Pages) 재배포
    if SHARE:
        step("공유파일", ["build_share.py"])
        step("사이트 배포", ["deploy_site.py"])
    log("===== 전체 갱신 종료 =====\n")


if __name__ == "__main__":
    main()
