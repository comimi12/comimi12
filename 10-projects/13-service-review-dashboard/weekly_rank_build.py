# -*- coding: utf-8 -*-
r"""
월간 회의 › 주차별 매장 리뷰순위 → weekly_rank.js

순위 기준 = 리뷰 비율(%) = 주간 총 리뷰수 ÷ 주간 고객수(POS 객수) × 100  (높을수록 상위)
주차 = 월 안에서 자른다: 1주차 = 1일~첫 일요일, 중간 = 월~일, 마지막 주 = 월요일~말일.
대상 = 2026-10 부터. 끝난 주만 '확정', 진행 중인 주는 '집계중'.

입력
  data.js                     REVIEW_DATA.reviews.daily (build.py 가 만든 최근 120일 리뷰 원문, 작성일 기준)
  data/pos/guests.json        {"updated":..., "stores": {POS매장명: {"YYYY-MM-DD": 객수}}}  ← pos_guests.py
  pos_store_map.json          POS매장명 → 리뷰 매장키("브랜드·지점") 수동 매핑(자동 매칭 실패분만)
  data/staff_ai_cache.json    리뷰 문장 → 직원 이름·감동사연 판정 캐시 (claude -p, sentiment_ai 와 같은 방식)

출력
  weekly_rank.js  window.WEEKLY_RANK = {months:[{ym, weeks:[...], final:{...}}], ...}

사용: python weekly_rank_build.py            # 직원 판정 포함
      python weekly_rank_build.py --no-ai    # 직원 AI 판정 생략(캐시만)
"""
import calendar
import datetime
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kpi_build as K   # noqa: E402  (매장명 정규화·별칭·퍼지매칭 재사용. stdout UTF-8 래핑도 여기서 됨)

START_MONTH = "2026-10"
GUESTS = os.path.join(HERE, "data", "pos", "guests.json")
MAP = os.path.join(HERE, "pos_store_map.json")
STAFF_CACHE = os.path.join(HERE, "data", "staff_ai_cache.json")
OUT = os.path.join(HERE, "weekly_rank.js")


# ---------- 주차 ----------

# 이 PC 시간대가 한국이 아닐 수 있음(미국 출장 등) → 날짜 계산은 항상 한국 시간 기준
KST = datetime.timezone(datetime.timedelta(hours=9))


def kst_now():
    return datetime.datetime.now(KST)

def month_weeks(ym):
    """[(주차, 시작일, 종료일)] — 1주차 1일~첫 일요일, 마지막 주 월요일~말일."""
    y, m = map(int, ym.split("-"))
    last = calendar.monthrange(y, m)[1]
    d, end, out, n = datetime.date(y, m, 1), datetime.date(y, m, last), [], 1
    while d <= end:
        e = min(end, d + datetime.timedelta(days=6 - d.weekday()))   # 그 주 일요일 또는 말일
        out.append((n, d, e))
        d, n = e + datetime.timedelta(days=1), n + 1
    return out


def months_until(today):
    out, y, m = [], *map(int, START_MONTH.split("-"))
    while (y, m) <= (today.year, today.month):
        out.append(f"{y}-{m:02d}")
        y, m = (y + 1, 1) if m == 12 else (y, m + 1)
    return out


# ---------- 입력 ----------
def load_reviews():
    s = open(os.path.join(HERE, "data.js"), encoding="utf-8").read()
    d = json.loads(s[s.index("{"):s.rstrip().rstrip(";").rindex("}") + 1])
    dl = d["reviews"]["daily"]
    stores, brand = dl["stores"], dl["store_brand"]
    global ALL_STORES
    ALL_STORES = set(stores)                 # 매칭 로스터 = 최근 120일 리뷰가 있는 전 매장
    recs = []
    for r in dl["records"]:
        if r[0] < START_MONTH:
            continue
        st = stores[r[2]]
        recs.append({"date": r[0], "store": st, "brand": brand.get(st, st.split("·")[0]),
                     "sent": r[3], "src": r[4], "author": r[6], "text": r[8]})
    return recs


def review_key(store):
    b, _, s = store.partition("·")
    return K.key_of(b, s)


def load_guests(review_stores):
    """POS 객수 → {리뷰매장: {date: 객수}}. 매칭: 수동맵 → 키 정규화 → 퍼지."""
    manual_ok = True
    if not os.path.exists(GUESTS):
        return {}, None, []
    g = json.load(open(GUESTS, encoding="utf-8"))
    manual = json.load(open(MAP, encoding="utf-8")) if os.path.exists(MAP) else {}
    by_key = {review_key(s): s for s in review_stores}
    roster = {k: {"brand": k.split("|")[0], "suffix": k.split("|")[1]} for k in by_key}
    out, unmatched = {}, []
    for pos_name, days in g.get("stores", {}).items():
        if pos_name.startswith("_"):
            continue
        tgt = manual.get(pos_name)
        if tgt == "":                                  # 수동맵에 "" = 집계 제외(본사·창고 등)
            continue
        if not tgt:
            b = K.canon_brand(re.split(r"\s+", pos_name.strip())[0])
            k = K.key_of(b, K.strip_brand_prefix(pos_name))
            if k in by_key:
                tgt = by_key[k]
            else:
                fk = K.fuzzy_match(b, K.strip_brand_prefix(pos_name), roster)
                tgt = by_key.get(fk) if fk else None
        if not tgt:
            unmatched.append(pos_name)
            continue
        acc = out.setdefault(tgt, {})
        for d, v in days.items():
            acc[d] = acc.get(d, 0) + (v or 0)
    return out, g.get("updated"), sorted(unmatched)


# ---------- 직원 이름 · 감동 사연 (AI) ----------
HINT = re.compile(r"(님|매니저|직원|점장|실장|팀장|사원|서버|알바|씨\b|씨[가께는의])")
STAFF_PROMPT = """너는 외식 매장 리뷰에서 '이름이 언급된 매장 직원'을 찾는다.
입력은 JSON 배열(i, store, text). 각 리뷰에서 고객이 칭찬하며 **이름(또는 이름+호칭)으로 부른 매장 직원**만 n 에 넣는다.
- 이름 표기는 리뷰에 쓰인 그대로, 호칭은 떼고 이름만 (예: "김민수 매니저님" → "김민수", "지은님" → "지은").
- 고객 본인·동행·가족·연예인·브랜드·메뉴·매장명·'사장님/직원분'처럼 이름 없는 호칭은 넣지 않는다.
- 이름이 없으면 n 은 빈 배열.
s 는 이름이 있을 때만: 그 직원 응대가 얼마나 감동적인 사연인지 0~5 (5=구체적 배려로 고객이 감동한 사연, 1=이름만 칭찬).
m 은 이름이 있을 때만: 감동 포인트를 25자 이내로 요약. 모든 i 에 빠짐없이 답한다."""
STAFF_SCHEMA = {"type": "object", "properties": {"items": {"type": "array", "items": {
    "type": "object", "properties": {"i": {"type": "integer"},
                                     "n": {"type": "array", "items": {"type": "string"}},
                                     "s": {"type": "integer"}, "m": {"type": "string"}},
    "required": ["i", "n", "s", "m"]}}}, "required": ["items"]}


def _hkey(t):
    return hashlib.sha1((t or "").strip().encode("utf-8")).hexdigest()[:16]


def _claude():
    return shutil.which("claude") or os.path.expanduser(r"~\.local\bin\claude.exe")


def _judge(exe, batch):
    payload = json.dumps([{"i": i, "store": s, "text": t} for i, (s, t) in enumerate(batch)], ensure_ascii=False)
    r = subprocess.run([exe, "-p", STAFF_PROMPT, "--model", "sonnet", "--output-format", "json",
                        "--json-schema", json.dumps(STAFF_SCHEMA, ensure_ascii=False), "--tools", ""],
                       input=payload, capture_output=True, text=True, encoding="utf-8", timeout=600)
    out = json.loads(r.stdout)
    data = out.get("structured_output") or json.loads(out.get("result") or "{}")
    return {it["i"]: it for it in data.get("items", [])}


def staff_judge(recs, use_ai=True):
    try:
        cache = json.load(open(STAFF_CACHE, encoding="utf-8"))
    except (OSError, ValueError):
        cache = {}
    todo, seen = [], set()
    for r in recs:
        if r["sent"] != "칭찬" or not HINT.search(r["text"] or ""):
            continue
        k = _hkey(r["text"])
        if k not in cache and k not in seen:
            seen.add(k)
            todo.append((k, r["store"], r["text"]))
    if todo and use_ai and os.path.exists(_claude()):
        exe, B = _claude(), 60
        batches = [todo[i:i + B] for i in range(0, len(todo), B)]
        print(f"    직원 AI 판정: {len(todo)}건 / {len(batches)}배치")
        with ThreadPoolExecutor(4) as ex:
            for batch, res in zip(batches, ex.map(lambda b: _safe(exe, b), batches)):
                for i, (k, _, _) in enumerate(batch):
                    if i in res:
                        it = res[i]
                        cache[k] = {"n": [x.strip() for x in it["n"] if x.strip()], "s": it["s"], "m": it["m"]}
        os.makedirs(os.path.dirname(STAFF_CACHE), exist_ok=True)
        json.dump(cache, open(STAFF_CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    elif todo:
        print(f"    직원 판정 대기 {len(todo)}건 (AI 생략)")
    return cache


def _safe(exe, batch):
    try:
        return _judge(exe, [(s, t) for _, s, t in batch])
    except Exception as e:      # 한 배치 실패는 다음 실행에서 재시도
        print("    ⚠ 배치 실패:", str(e)[:80])
        return {}


# ---------- 집계 ----------
def rank_period(recs, guests, d0, d1, staff, pos_last=None):
    ds, de = d0.isoformat(), d1.isoformat()
    # 진행 중 기간: POS 객수는 전일까지만 있음 → 리뷰도 같은 날까지만 세야 비율이 부풀지 않는다
    if pos_last and ds <= pos_last < de:
        de = pos_last
    rv, pos_cnt = {}, {}
    for r in recs:
        if ds <= r["date"] <= de:
            rv.setdefault(r["store"], []).append(r)
    rows = []
    for st in sorted(set(rv) | set(guests)):
        n = len(rv.get(st, []))
        g = sum(v for d, v in guests.get(st, {}).items() if ds <= d <= de) if st in guests else None
        rows.append({"store": st, "brand": st.split("·")[0], "reviews": n,
                     "praise": sum(1 for r in rv.get(st, []) if r["sent"] == "칭찬"),
                     "guests": g, "rate": round(n / g * 100, 2) if g else None})
    ranked = sorted([r for r in rows if r["rate"] is not None], key=lambda r: (-r["rate"], -r["reviews"]))
    for i, r in enumerate(ranked, 1):
        r["rank"] = i
    rest = sorted([r for r in rows if r["rate"] is None], key=lambda r: -r["reviews"])
    # 직원: 이름 언급 칭찬 리뷰
    people = {}
    for st, rs in rv.items():
        for r in rs:
            j = staff.get(_hkey(r["text"]))
            if r["sent"] != "칭찬" or not j or not j["n"]:
                continue
            for nm in dict.fromkeys(j["n"]):
                p = people.setdefault((st, nm), {"name": nm, "store": st, "mentions": 0, "score": 0, "best": None})
                p["mentions"] += 1
                p["score"] = max(p["score"], j["s"])
                if not p["best"] or j["s"] > p["best"]["s"] or (j["s"] == p["best"]["s"] and len(r["text"]) > len(p["best"]["text"])):
                    p["best"] = {"s": j["s"], "m": j["m"], "text": r["text"], "date": r["date"]}
    staff_rows = sorted(people.values(), key=lambda p: (-p["score"], -p["mentions"], -len(p["best"]["text"])))
    for i, p in enumerate(staff_rows, 1):
        p["rank"] = i
    return {"rows": ranked + rest, "staff": staff_rows, "upto": de,
            "total_reviews": sum(r["reviews"] for r in rows),
            "has_guests": any(r["guests"] for r in rows)}


def main():
    use_ai = "--no-ai" not in sys.argv
    today = kst_now().date()
    recs = load_reviews()
    guests, pos_updated, unmatched = load_guests(ALL_STORES)
    print(f"[주차별 리뷰순위] 리뷰 {len(recs)}건 (≥{START_MONTH}) · POS 매칭 매장 {len(guests)} · 미매칭 {len(unmatched)}")
    staff = staff_judge(recs, use_ai)
    pos_last = max((d for v in guests.values() for d in v), default=None)
    months = []
    for ym in months_until(today):
        weeks = []
        for n, d0, d1 in month_weeks(ym):
            if d0 > today:
                continue
            w = rank_period(recs, guests, d0, d1, staff, pos_last)
            w.update({"no": n, "from": d0.isoformat(), "to": d1.isoformat(), "done": d1 < today})
            weeks.append(w)
        y, m = map(int, ym.split("-"))
        m0, m1 = datetime.date(y, m, 1), datetime.date(y, m, calendar.monthrange(y, m)[1])
        fin = rank_period(recs, guests, m0, m1, staff, pos_last)
        fin.update({"from": m0.isoformat(), "to": m1.isoformat(), "done": m1 < today})
        months.append({"ym": ym, "label": f"{y}년 {m}월", "weeks": weeks, "final": fin})
        print(f"  {ym}: {len(weeks)}주 · 리뷰 {fin['total_reviews']} · 이름언급 직원 {len(fin['staff'])}")
    payload = {"generated": kst_now().strftime("%Y-%m-%d %H:%M"), "today": today.isoformat(),
               "pos_updated": pos_updated, "pos_unmatched": unmatched, "months": months}
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* 자동 생성: weekly_rank_build.py */\nwindow.WEEKLY_RANK=")
        f.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print(f"[OK] weekly_rank.js ({os.path.getsize(OUT)/1024:,.0f} KB)")


if __name__ == "__main__":
    main()
