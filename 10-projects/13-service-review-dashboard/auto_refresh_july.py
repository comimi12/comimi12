# -*- coding: utf-8 -*-
"""
7월 리뷰 무인 재수집 → 재빌드 → 재배포.

네이버가 우리 IP를 일시 차단한 상태라 곧바로는 수집이 안 된다.
이 스크립트는 사람 개입 없이:
  1) 차단이 풀릴 때까지 가벼운 요청 1건으로 주기적 확인(기본 10분 간격, 최대 12시간)
  2) 풀리면 collect_v2.py 로 84개 매장 7월 전체 재수집
  3) build.py → build_share.py → deploy_site.py 까지 실행

모든 진행상황은 _logs/auto_refresh_july.log 에 즉시 기록된다(중간 확인 가능).

사용:
  python auto_refresh_july.py
  python auto_refresh_july.py --probe-gap 600 --max-wait-h 12
"""
import sys, io, os, json, time, base64, subprocess, importlib.util, shutil, tempfile
from datetime import datetime

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
LOG_DIR = os.path.join(HERE, "_logs")
LOG_PATH = os.path.join(LOG_DIR, "auto_refresh_july.log")
CUTOFF = "2026-07-01"
OUT_CSV = os.path.join(HERE, "data", "reviews", "naver_recollect_202607.csv")


def log(msg):
    line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] {msg}"
    print(line)
    os.makedirs(LOG_DIR, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def load_nv():
    cfg = json.load(open(os.path.join(HERE, "collect_config.json"), encoding="utf-8"))
    src = os.path.join(cfg["macro_dir"], "_internal", "naver_review_api_0_3.py")
    tmp = os.path.join(tempfile.gettempdir(), "nv_auto.py")
    shutil.copyfile(src, tmp)
    spec = importlib.util.spec_from_file_location("nv_auto", tmp)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    registry = json.load(open(os.path.join(cfg["macro_dir"], "store_registry.json"), encoding="utf-8"))
    return mod, registry


def probe(nv, business_id):
    """가벼운 단건 요청으로 차단 해제 여부 확인. 200 이면 해제."""
    j = json.dumps({"arg": str(business_id), "type": "restaurant", "source": "place"},
                   separators=(",", ":"), ensure_ascii=False)
    h = nv.DEFAULT_HEADERS.copy()
    h["x-wtm-graphql"] = base64.b64encode(j.encode()).decode().rstrip("=")
    h["referer"] = f"https://m.place.naver.com/restaurant/{business_id}/review/visitor"
    payload = nv.make_payload(business_id, None, after=None, size=10)
    try:
        r = requests.post(nv.URL, headers=h, data=json.dumps(payload), timeout=30)
    except requests.RequestException as e:
        return None, f"네트워크오류 {type(e).__name__}"
    return r.status_code, ""


def run(cmd, title):
    log(f"▶ {title}: {' '.join(cmd)}")
    p = subprocess.run(cmd, cwd=HERE, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    for ln in (p.stdout or "").splitlines():
        log(f"   | {ln}")
    if p.returncode != 0:
        for ln in (p.stderr or "").splitlines()[-20:]:
            log(f"   ! {ln}")
        log(f"✗ {title} 실패 (exit {p.returncode})")
        return False
    log(f"✓ {title} 완료")
    return True


def main():
    args = sys.argv[1:]
    probe_gap, max_wait_h = 600, 12
    i = 0
    while i < len(args):
        if args[i] == "--probe-gap":
            i += 1; probe_gap = int(args[i])
        elif args[i] == "--max-wait-h":
            i += 1; max_wait_h = float(args[i])
        i += 1

    log("=" * 60)
    log(f"7월 무인 재수집 시작 (확인간격 {probe_gap}s, 최대대기 {max_wait_h}h)")
    nv, registry = load_nv()
    stores = [s for s in registry["naver"] if s.get("enabled")]
    probe_id = stores[0]["code"]

    # 1) 차단 해제 대기
    deadline = time.time() + max_wait_h * 3600
    attempt = 0
    while True:
        attempt += 1
        code, note = probe(nv, probe_id)
        log(f"차단확인 #{attempt}: HTTP {code} {note}")
        if code == 200:
            log("차단 해제 확인 → 재수집 시작")
            break
        if time.time() > deadline:
            log(f"✗ {max_wait_h}시간 내 차단이 풀리지 않음 → 중단")
            log("  대안: 매크로 GUI에서 새 x-wtm-graphql/쿠키를 넣고 수동 추출")
            return 1
        time.sleep(probe_gap)

    # 2) 재수집
    if not run([sys.executable, "collect_v2.py", CUTOFF, "--pages", "30", "--out", OUT_CSV],
               "84개 매장 7월 재수집"):
        log("  수집 실패 → 빌드는 진행하지 않음(기존 data.js 유지)")
        return 1

    # 3) 재빌드 · 재배포
    for cmd, title in [(["build.py"], "data.js 재빌드"),
                       (["build_share.py"], "공유 단일파일 생성"),
                       (["deploy_site.py"], "공유 사이트 배포")]:
        if not run([sys.executable] + cmd, title):
            return 1

    log("★ 전체 완료 — https://comimi12.github.io/slnc-review-dashboard/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
