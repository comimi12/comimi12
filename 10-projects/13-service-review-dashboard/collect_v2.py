# -*- coding: utf-8 -*-
"""
네이버 리뷰 재수집 (차단 대응판) — collect.py 의 405/429 차단 문제 보완.

collect.py 대비 달라진 점:
  1) x-wtm-graphql 헤더를 매장별 businessId 로 생성 (하드코딩 토큰은 특정 매장용이라 거부됨)
  2) 405/429 를 "치명적 오류"가 아니라 "일시 차단"으로 보고 짧은 백오프 재시도(5/15/40s)
  3) QPS 를 크게 낮춤(기본 요청간 4초) + 지터
  4) 매장 단위 증분 저장 → 중간에 끊겨도 진행분 보존/재개
  6) 전체 시간예산(--deadline) 안에 정상 종료 + 매장 시작점 날짜 순환 → 매일 다른 매장까지 커버
  5) 로컬 브라우저(Chrome/Edge/Firefox)의 네이버 로그인 쿠키 자동 로딩 → 비로그인 차단 완화

사용:
  python collect_v2.py 2026-07-01              # 기준일 이후 방문 리뷰 수집
  python collect_v2.py 2026-07-01 --pages 30
  python collect_v2.py 2026-07-01 --out data/reviews/naver_recollect_202607.csv
  python collect_v2.py 2026-07-01 --no-cookie  # 쿠키 자동 로딩 끄기(비로그인 수집)
  python collect_v2.py 2026-07-01 --deadline 20  # 시간예산 20분(기본 45분)
  python collect_v2.py 2026-07-01 --no-rotate   # 매장 시작점 순환 끄기(항상 1번 매장부터)

쿠키 자동 로딩은 `pip install browser-cookie3` 필요. Chrome 등에 네이버 로그인 상태여야 한다.
"""
import sys, io, os, json, csv, time, random, base64, shutil, tempfile, importlib.util
from datetime import datetime

import requests

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW_DIR = os.path.join(HERE, "data", "reviews")
CFG_PATH = os.path.join(HERE, "collect_config.json")

REQ_GAP = 4.0            # 요청 간 기본 간격(초)
# 405/429 시 대기(초). 2026-09 실측: 405 는 30분씩 기다린다고 풀리는 장기 차단이 아니라
# 요청 단위로 튕기는 성격이라, 짧게 여러 번이 회복률이 높고 시간도 1/30 이다.
# (옛값 [30,60,120,240,480,900] = 한 페이지 최악 30.5분 → 84매장 수집이 1시간 타임아웃으로 강제종료됐음)
BLOCK_BACKOFF = [5, 15, 40]
DEADLINE_MIN = 45        # 전체 시간예산(분). 넘기면 남은 매장은 다음 실행으로 넘기고 정상 종료
FIELDS = ["매장명", "방문일자", "작성일자", "작성자", "방문시간대", "리뷰내용", "리뷰유형", "카테고리", "채널"]

COOKIE = ""              # 네이버 쿠키 헤더 (load_cookie 가 채움)
COOKIE_FILE = os.path.join(HERE, "naver_cookie.txt")   # 수동 폴백 (.gitignore 대상)
LOCK_FILE = os.path.join(HERE, "_logs", "collect_v2.lock")
LOCK_STALE_H = 6         # 이 시간 지난 락은 죽은 프로세스 잔재로 보고 무시


def lock_held():
    """다른 수집이 진행 중이면 True. (감시 스크립트와 일일 스케줄이 동시에 네이버를 두들기지 않도록)"""
    if not os.path.exists(LOCK_FILE):
        return False
    age_h = (time.time() - os.path.getmtime(LOCK_FILE)) / 3600
    if age_h > LOCK_STALE_H:
        print(f"   오래된 락({age_h:.1f}h) 무시하고 진행")
        return False
    print(f"   다른 수집이 진행 중입니다 ({open(LOCK_FILE, encoding='utf-8').read().strip()})")
    return True


def _describe(ck, how):
    names = [p.split("=", 1)[0] for p in ck.split("; ") if "=" in p]
    logged_in = "NID_AUT" in names and "NID_SES" in names
    print(f"   {how}: {len(names)}개 {names} / 로그인상태={'예' if logged_in else '아니오(세션쿠키 없음)'}")
    return ck


def load_cookie(nv):
    """네이버 쿠키 헤더 확보. ① 브라우저 자동 로딩 → ② naver_cookie.txt 폴백 → ③ 빈 문자열."""
    try:
        ck = nv.get_cookie_header_auto(lambda m: None)
    except Exception as e:
        print(f"   자동 로딩 실패: {type(e).__name__}")
        ck = ""
    if ck:
        return _describe(ck, "브라우저 자동 로딩 성공")

    # Chrome 127+ 앱바운드 암호화 등으로 자동 로딩이 막히면 수동 파일 사용
    if os.path.exists(COOKIE_FILE):
        raw = open(COOKIE_FILE, encoding="utf-8-sig").read()
        ck = " ".join(ln.strip() for ln in raw.splitlines()
                      if ln.strip() and not ln.strip().startswith("#")).strip()
        if ck:
            return _describe(ck, f"{os.path.basename(COOKIE_FILE)} 에서 로딩")

    print("   쿠키 없음 → 비로그인으로 수집 (차단 확률 높음)")
    print(f"   ↳ 해결: 브라우저 DevTools(F12) → Network → graphql 요청 → Request Headers 의")
    print(f"          cookie 값을 통째로 복사해 {COOKIE_FILE} 에 저장")
    return ""


def load_collector():
    cfg = json.load(open(CFG_PATH, encoding="utf-8"))
    macro = cfg["macro_dir"]
    src = os.path.join(macro, "_internal", "naver_review_api_0_3.py")
    tmp = os.path.join(tempfile.gettempdir(), "nv_collector_v2.py")
    shutil.copyfile(src, tmp)
    spec = importlib.util.spec_from_file_location("nv_collector_v2", tmp)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    registry = json.load(open(os.path.join(macro, "store_registry.json"), encoding="utf-8"))
    return mod, registry


def wtm_token(business_id):
    """네이버가 요구하는 x-wtm-graphql: base64({"arg":<businessId>,"type":"restaurant","source":"place"})"""
    j = json.dumps({"arg": str(business_id), "type": "restaurant", "source": "place"},
                   separators=(",", ":"), ensure_ascii=False)
    return base64.b64encode(j.encode()).decode().rstrip("=")


def headers_for(nv, business_id):
    h = nv.DEFAULT_HEADERS.copy()
    h["x-wtm-graphql"] = wtm_token(business_id)
    h["referer"] = f"https://m.place.naver.com/restaurant/{business_id}/review/visitor"
    if COOKIE:
        h["cookie"] = COOKIE
    return h


def post_page(nv, sess, business_id, after, size=50):
    """한 페이지 요청. 차단(405/429/5xx)이면 장기 백오프 재시도. 반환: (rows, blocked_bool)"""
    payload = nv.make_payload(business_id, None, after=after, size=size)
    h = headers_for(nv, business_id)
    for i, wait in enumerate([0] + BLOCK_BACKOFF):
        if wait:
            print(f"      · 차단 감지 → {wait}s 대기 후 재시도({i}/{len(BLOCK_BACKOFF)})")
            time.sleep(wait)
        time.sleep(REQ_GAP + random.uniform(0, 1.5))
        try:
            r = sess.post(nv.URL, headers=h, data=json.dumps(payload), timeout=30)
        except requests.RequestException as e:
            print(f"      · 네트워크 오류 {type(e).__name__}")
            continue
        if r.status_code == 200:
            rows, _total, next_after = nv.parse_items(r.json())
            return rows, next_after, False
        if r.status_code in (405, 429) or 500 <= r.status_code < 600:
            continue
        print(f"      · HTTP {r.status_code} (재시도 안 함)")
        return [], None, False
    return [], None, True


def crawl(nv, business_id, cutoff_date, max_pages):
    """매장 1곳. cutoff_date(date) 이전 방문리뷰가 나오면 조기 종료."""
    out, after = [], None
    blocked = False
    with requests.Session() as sess:
        for _ in range(max_pages):
            rows, after, blocked = post_page(nv, sess, business_id, after)
            if blocked or not rows:
                break
            out.extend(rows)
            if cutoff_date:
                dates = []
                for it in rows:
                    vd = nv.visit_date_from_iso_utc(it.get("visit_dt"))
                    if vd:
                        try:
                            dates.append(datetime.strptime(vd, "%Y-%m-%d").date())
                        except Exception:
                            pass
                if dates and min(dates) < cutoff_date:
                    break
            if not after:
                break
    return out, blocked


def main():
    global COOKIE
    args = sys.argv[1:]
    cutoff_s, max_pages, out_path, use_cookie = None, 30, None, True
    deadline_min, rotate = DEADLINE_MIN, True
    i = 0
    while i < len(args):
        a = args[i]
        if a == "--pages":
            i += 1; max_pages = int(args[i])
        elif a == "--out":
            i += 1; out_path = args[i]
        elif a == "--deadline":
            i += 1; deadline_min = float(args[i])
        elif a == "--no-rotate":
            rotate = False
        elif a == "--no-cookie":
            use_cookie = False
        elif len(a) == 10 and a[4] == "-":
            cutoff_s = a
        i += 1

    if lock_held():
        print("[중단] 중복 수집 방지 — 진행 중인 수집이 끝난 뒤 다시 실행하세요.")
        return 3

    cutoff_date = datetime.strptime(cutoff_s, "%Y-%m-%d").date() if cutoff_s else None
    nv, registry = load_collector()
    if use_cookie:
        print("[쿠키] 브라우저에서 네이버 로그인 쿠키 로딩 시도…")
        COOKIE = load_cookie(nv)
    else:
        print("[쿠키] --no-cookie: 비로그인으로 수집")
    stores = [s for s in registry.get("naver", []) if s.get("enabled")]
    # 시간예산에 걸려 중간에 끊겨도 매일 같은 앞쪽 매장만 수집되지 않도록 날짜로 시작점을 돌린다.
    # (차단율이 높던 시기에 Chai 앞 몇 개 매장만 계속 들어오던 문제)
    if rotate and stores:
        off = datetime.now().toordinal() % len(stores)
        stores = stores[off:] + stores[:off]
        print(f"[순환] 오늘 시작 매장: {stores[0]['name']} (offset {off}/{len(stores)})")
    # ※ 파일명은 반드시 naver_collected 로 시작해야 한다 —
    #   build.py 가 그 외 이름을 '월간 확정 파일'로 보고 그 달 자동수집분을 덮어버린다.
    out_path = out_path or os.path.join(REVIEW_DIR, f"naver_collected_{datetime.now():%Y%m%d_%H%M%S}_v2.csv")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)

    os.makedirs(os.path.dirname(LOCK_FILE), exist_ok=True)
    with open(LOCK_FILE, "w", encoding="utf-8") as lf:
        lf.write(f"pid={os.getpid()} start={datetime.now():%Y-%m-%d %H:%M:%S}")

    deadline_ts = time.time() + deadline_min * 60
    print(f"[재수집] {len(stores)}개 매장, 기준일 {cutoff_s or '없음'}, 최대 {max_pages}p, "
          f"요청간격 ~{REQ_GAP}s, 시간예산 {deadline_min:g}분")
    f = open(out_path, "w", newline="", encoding="utf-8-sig")
    w = csv.DictWriter(f, fieldnames=FIELDS, extrasaction="ignore")
    w.writeheader()
    f.flush()   # 중간에 끊겨도 헤더+진행분이 파일에 남도록

    ok = fail = skipped = 0
    total_rows = 0
    try:
        for idx, s in enumerate(stores, 1):
            # 시간예산 초과 → 남은 매장은 포기하고 정상 종료(수집분은 이미 파일에 flush 돼 있다).
            # 강제종료(타임아웃 kill)되면 락파일이 남고 로그도 유실되므로 스스로 끊는 편이 낫다.
            if time.time() > deadline_ts:
                skipped = len(stores) - idx + 1
                print(f"[시간예산 {deadline_min:g}분 초과] 남은 {skipped}개 매장은 다음 실행으로 넘김 "
                      f"(내일은 순환으로 이 지점부터 시작)")
                break
            name, biz = s["name"], s["code"]
            try:
                api_rows, blocked = crawl(nv, biz, cutoff_date, max_pages)
            except Exception as e:
                print(f"  [{idx:>2}/{len(stores)}] {name}: 예외 {type(e).__name__} {e}")
                fail += 1
                continue
            ex = nv.to_export_rows(api_rows, name)
            # 기준일 이후만 저장
            if cutoff_s:
                ex = [r for r in ex if (r.get("방문일자") or "") >= cutoff_s]
            for r in ex:
                r["채널"] = "네이버"
            w.writerows(ex)
            f.flush()
            total_rows += len(ex)
            if blocked and not ex:
                fail += 1
                print(f"  [{idx:>2}/{len(stores)}] {name}: 차단(수집실패)")
            else:
                ok += 1
                print(f"  [{idx:>2}/{len(stores)}] {name}: {len(ex)}건{' (일부차단)' if blocked else ''}")
    finally:
        f.close()
        try:
            os.remove(LOCK_FILE)
        except OSError:
            pass
    print(f"\n[재수집] 완료 — 성공 {ok} / 실패 {fail}"
          + (f" / 미처리 {skipped}" if skipped else "") + f" / 총 {total_rows}건")
    if fail and fail >= ok:
        print("[!] 차단(405/429) 비율이 높습니다 — 네이버 로그인 쿠키 없이 수집 중일 가능성.")
        print("    브라우저 DevTools(F12) → Network → graphql 요청 → Request Headers 의 cookie 값을")
        print(f"    통째로 복사해 {os.path.basename(COOKIE_FILE)} 에 저장하면 차단이 크게 줄어듭니다.")
    print(f"[저장] {os.path.relpath(out_path, HERE)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
