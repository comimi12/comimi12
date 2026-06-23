# -*- coding: utf-8 -*-
"""
리뷰 자동 수집 → data/reviews/ → build.py 연결 (View 1·2 갱신).

AI매장리뷰 매크로(.exe)의 내부 수집기 소스를 그대로 헤드리스 호출한다.
  - 네이버: 플레이스 GraphQL API (requests, 로그인 불필요) — 검증됨, 무의존
  - 캐치테이블: Selenium (옵션). `pip install selenium chardet` + 유효 쿠키 필요

사용:
  python collect.py                      # 네이버, 이번 달부터 → data/reviews → build.py
  python collect.py 2026-06-01           # 기준일자 지정(이 날짜 이상 방문 리뷰)
  python collect.py --no-build           # 수집만(빌드 생략)
  python collect.py --catchtable         # 캐치테이블도 수집(selenium·쿠키 필요)
  python collect.py --pages 20           # 매장당 최대 페이지

설정: collect_config.json 의 macro_dir (AI매장리뷰 폴더 경로).
"""
import sys, io, os, json, csv, shutil, datetime, subprocess, importlib.util, tempfile
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW_DIR = os.path.join(HERE, "data", "reviews")
CFG_PATH = os.path.join(HERE, "collect_config.json")
DEFAULT_MACRO = r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611"


def load_cfg():
    if os.path.exists(CFG_PATH):
        return json.load(open(CFG_PATH, encoding="utf-8"))
    cfg = {"macro_dir": DEFAULT_MACRO}
    json.dump(cfg, open(CFG_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    return cfg


def import_source(macro_dir, filename, modname):
    """매크로 _internal 의 소스 .py 만 임시폴더로 복사해 임포트(3.13 바이너리 충돌 회피)."""
    src = os.path.join(macro_dir, "_internal", filename)
    if not os.path.exists(src):
        raise SystemExit(f"[ERR] 수집기 소스 없음: {src}")
    tmp = os.path.join(tempfile.gettempdir(), modname + ".py")
    shutil.copyfile(src, tmp)
    spec = importlib.util.spec_from_file_location(modname, tmp)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def parse_args():
    a = {"cutoff": None, "build": True, "catchtable": False, "pages": 15}
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        x = args[i]
        if x == "--no-build":
            a["build"] = False
        elif x == "--catchtable":
            a["catchtable"] = True
        elif x == "--pages":
            i += 1; a["pages"] = int(args[i])
        elif len(x) == 10 and x[4] == "-":
            a["cutoff"] = x
        i += 1
    return a


def collect_naver(macro_dir, registry, cutoff, pages):
    nv = import_source(macro_dir, "naver_review_api_0_3.py", "naver_collector")
    try:
        nv.RATE_LIMITER.set_qps(1.2)
    except Exception:
        pass
    headers = nv.DEFAULT_HEADERS.copy()  # 쿠키 없음 — 공개 리뷰는 로그인 불필요
    cutoff_date = nv.parse_cutoff(cutoff) if cutoff else None
    if cutoff_date == "INVALID":
        cutoff_date = None
    stores = [s for s in registry.get("naver", []) if s.get("enabled")]
    print(f"[네이버] {len(stores)}개 매장 수집 (기준일 {cutoff or '없음'}, 최대 {pages}p)")
    all_rows = []
    for idx, s in enumerate(stores, 1):
        name, biz = s["name"], s["code"]
        try:
            api_rows = nv.crawl_store(biz, None, 50, pages, headers, lambda m: None, cutoff_date)
            ex = nv.to_export_rows(api_rows, name)
            for r in ex:
                r["채널"] = "네이버"
            all_rows.extend(ex)
            print(f"  [{idx:>2}/{len(stores)}] {name}: {len(ex)}건")
        except Exception as e:
            print(f"  [{idx:>2}/{len(stores)}] {name}: 실패 {type(e).__name__} {e}")
    if not all_rows:
        print("[네이버] 수집 0건 — 중단"); return None
    fields = ["매장명", "방문일자", "작성일자", "작성자", "방문시간대", "리뷰내용", "리뷰유형", "카테고리", "채널"]
    out = os.path.join(REVIEW_DIR, f"naver_collected_{datetime.date.today():%Y%m%d}.csv")
    os.makedirs(REVIEW_DIR, exist_ok=True)
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader(); w.writerows(all_rows)
    print(f"[네이버] 저장: {os.path.relpath(out, HERE)} ({len(all_rows)}건)")
    return out


def collect_catchtable(macro_dir, registry, cutoff, pages):
    try:
        import selenium  # noqa
    except ImportError:
        print("[캐치테이블] selenium 미설치 → 건너뜀. (pip install selenium chardet 후 --catchtable)")
        return None
    # 쿠키 환경변수 주입 (catchtable_session.env)
    env_path = os.path.join(macro_dir, "catchtable_session.env")
    if os.path.exists(env_path):
        for ln in open(env_path, encoding="utf-8-sig"):
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1); os.environ[k] = v
    if not os.environ.get("CATCHTABLE_COOKIE_HEADER"):
        print("[캐치테이블] 쿠키 없음 → 건너뜀. catchtable_session.env 갱신 필요.")
        return None
    ct = import_source(macro_dir, "catchtable_collector_v0_7.py", "ct_collector")
    cutoff = cutoff or f"{datetime.date.today():%Y-%m-01}"
    from_ts = int(datetime.datetime.strptime(cutoff, "%Y-%m-%d").timestamp() * 1000)
    shops = [(s["code"], s["name"]) for s in registry.get("catchtable", []) if s.get("enabled")]
    print(f"[캐치테이블] {len(shops)}개 매장 수집 (selenium, 기준 {cutoff})")
    rows = []
    for code, name in shops:
        try:
            res = ct.scrape_reviews(code, name, from_ts, pages, lambda m: None)
            rows.extend(res); print(f"  {name}: {len(res)}건")
        except Exception as e:
            print(f"  {name}: 실패 {type(e).__name__} {e}")
    if not rows:
        print("[캐치테이블] 수집 0건"); return None
    # build.py 의 merged 보충 양식(source/store_name/review_date/review_text/rating)으로 저장
    ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    out = os.path.join(REVIEW_DIR, f"merged_reviews_{ts}.csv")
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(["source", "store_name", "review_date", "review_text", "rating"])
        for r in rows:  # r = [매장명,작성일자,닉네임,평점,방문시간대,리뷰내용,리뷰유형,카테고리]
            w.writerow(["catchtable", r[0], r[1], r[5], r[3]])
    print(f"[캐치테이블] 저장: {os.path.relpath(out, HERE)} ({len(rows)}건)")
    return out


def main():
    a = parse_args()
    cfg = load_cfg()
    macro_dir = cfg["macro_dir"]
    if not os.path.isdir(macro_dir):
        raise SystemExit(f"[ERR] macro_dir 없음: {macro_dir} (collect_config.json 수정)")
    registry = json.load(open(os.path.join(macro_dir, "store_registry.json"), encoding="utf-8"))

    collect_naver(macro_dir, registry, a["cutoff"], a["pages"])
    if a["catchtable"]:
        collect_catchtable(macro_dir, registry, a["cutoff"], a["pages"])

    if a["build"]:
        print("\n[build] python build.py 실행…")
        r = subprocess.run([sys.executable, os.path.join(HERE, "build.py")], cwd=HERE)
        print("[build] 완료" if r.returncode == 0 else f"[build] 실패 (exit {r.returncode})")
    else:
        print("\n[skip] --no-build: data.js 갱신 생략")
    print("[done]")


if __name__ == "__main__":
    main()
