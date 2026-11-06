# -*- coding: utf-8 -*-
"""
네이버 차단 해제를 느긋하게 기다렸다가, 풀리면 7월 재수집 → 빌드 → 배포까지 자동 실행.

앞선 시도의 교훈을 반영:
  - 단발성 200(한 번만 뚫리는 것)을 "해제"로 오판하지 않도록 **연속 3회 성공**을 요구
  - 1시간에 요청 1건만 보내 차단을 자극하지 않음
  - 자식 프로세스 출력을 줄 단위로 즉시 로그에 흘려보냄(중간 상황 확인 가능)
  - 수확이 기준 미달이면 "GUI 수동 추출 필요" 판정을 남김

사용:
  python -u watch_unblock.py                    # 기본: 60분 간격, 최대 7일
  python -u watch_unblock.py --gap 3600 --max-days 7
"""
import sys, io, os, json, time, base64, subprocess, importlib.util, shutil, tempfile
from datetime import datetime

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_PATH = os.path.join(HERE, "_logs", "watch_unblock.log")
CUTOFF = "2026-07-01"
OUT_CSV = os.path.join(HERE, "data", "reviews", f"naver_collected_{datetime.now():%Y%m%d}c.csv")
CONFIRM_N = 3        # 연속 성공 요구 횟수
CONFIRM_GAP = 90     # 확인 사이 간격(초)
MIN_ROWS = 2000      # 이만큼도 못 모으면 GUI 수동 추출 필요로 판정


def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_nv():
    cfg = json.load(open(os.path.join(HERE, "collect_config.json"), encoding="utf-8"))
    src = os.path.join(cfg["macro_dir"], "_internal", "naver_review_api_0_3.py")
    tmp = os.path.join(tempfile.gettempdir(), "nv_watch.py")
    shutil.copyfile(src, tmp)
    spec = importlib.util.spec_from_file_location("nv_watch", tmp)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    registry = json.load(open(os.path.join(cfg["macro_dir"], "store_registry.json"), encoding="utf-8"))
    return mod, [s for s in registry["naver"] if s.get("enabled")]


def probe(nv, business_id):
    j = json.dumps({"arg": str(business_id), "type": "restaurant", "source": "place"},
                   separators=(",", ":"), ensure_ascii=False)
    h = nv.DEFAULT_HEADERS.copy()
    h["x-wtm-graphql"] = base64.b64encode(j.encode()).decode().rstrip("=")
    h["referer"] = f"https://m.place.naver.com/restaurant/{business_id}/review/visitor"
    try:
        r = requests.post(nv.URL, headers=h,
                          data=json.dumps(nv.make_payload(business_id, None, after=None, size=10)),
                          timeout=30)
        return r.status_code
    except requests.RequestException as e:
        return f"NET/{type(e).__name__}"


def stream(cmd, title):
    """자식 프로세스 출력을 줄 단위로 즉시 로그에 반영."""
    log(f"▶ {title}")
    p = subprocess.Popen(cmd, cwd=HERE, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                         text=True, encoding="utf-8", errors="replace", bufsize=1)
    for ln in p.stdout:
        ln = ln.rstrip()
        if ln:
            log(f"   | {ln}")
    p.wait()
    ok = p.returncode == 0
    log(("✓ " if ok else "✗ ") + f"{title} (exit {p.returncode})")
    return ok


def main():
    args = sys.argv[1:]
    gap, max_days = 3600, 7.0
    i = 0
    while i < len(args):
        if args[i] == "--gap":
            i += 1; gap = int(args[i])
        elif args[i] == "--max-days":
            i += 1; max_days = float(args[i])
        i += 1

    log("=" * 60)
    log(f"차단 해제 감시 시작 (확인간격 {gap//60}분, 연속 {CONFIRM_N}회 성공 시 수집, 최대 {max_days}일)")
    nv, stores = load_nv()
    deadline = time.time() + max_days * 86400
    rounds = 0

    while True:
        rounds += 1
        # 서로 다른 매장으로 연속 확인 — 특정 매장만 열려있는 경우를 걸러냄
        streak, codes = 0, []
        for k in range(CONFIRM_N):
            code = probe(nv, stores[k % len(stores)]["code"])
            codes.append(str(code))
            if code == 200:
                streak += 1
            else:
                break
            if k < CONFIRM_N - 1:
                time.sleep(CONFIRM_GAP)
        log(f"확인 #{rounds}: {' → '.join(codes)}  (연속성공 {streak}/{CONFIRM_N})")

        if streak >= CONFIRM_N:
            log("★ 차단 해제 확정 → 7월 재수집 시작")
            break

        if time.time() > deadline:
            log("=" * 60)
            log(f"✗ {max_days}일간 차단이 풀리지 않음 → **매크로 GUI 수동 추출이 필요합니다**")
            log("  AI매장리뷰_V0.1.exe 실행 → 매장목록_네이버_84개.txt / 기준일자 2026-07-01 /")
            log("  QPS 0.3 / x-wtm-graphql·쿠키를 브라우저에서 새로 복사해 입력")
            return 2
        time.sleep(gap)

    # 재수집 → 빌드 → 배포
    if not stream([sys.executable, "-u", "collect_v2.py", CUTOFF, "--pages", "30", "--out", OUT_CSV],
                  "84개 매장 7월 재수집"):
        log("✗ 재수집 실패 → 빌드 생략(기존 data.js 유지)")
        return 1

    n = 0
    if os.path.exists(OUT_CSV):
        with open(OUT_CSV, encoding="utf-8-sig") as f:
            n = max(0, sum(1 for _ in f) - 1)
    log(f"수집 결과: {n}건")
    if n < MIN_ROWS:
        log(f"⚠ 기대치(6월 일평균 185건 기준 약 5,700건)에 크게 못 미침 → **GUI 수동 추출 권장**")
        log("  그래도 수집분은 반영합니다(현재보다는 정확).")

    for cmd, title in [(["build.py"], "data.js 재빌드"),
                       (["build_share.py"], "공유 단일파일 생성"),
                       (["deploy_site.py"], "공유 사이트 배포")]:
        if not stream([sys.executable, "-u"] + cmd, title):
            return 1

    log("★ 전체 완료 — https://comimi12.github.io/slnc-review-dashboard/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
