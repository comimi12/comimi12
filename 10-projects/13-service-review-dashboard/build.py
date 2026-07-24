# -*- coding: utf-8 -*-
"""
서비스 리뷰 통합 대시보드 — 빌드 스크립트 (결정론적 집계 엔진)

매달 실행:
  1) data/reviews/ 의 최신 CSV(네이버·캐치테이블) + data/voc/ 의 최신 xls(SL&C 고객의 소리)를 읽고
  2) 정제(BOM 병합·브랜드 매핑·날짜 정규화) + 감성분류(캐치테이블=평점, 네이버=사전기반) + 토픽 태깅
  3) 모든 수치 집계 → data.js (window.REVIEW_DATA)
  4) Claude가 질적 분석할 추출본 → ai_input.json

수치는 이 스크립트가, 질적 요약(TOP3 요약·토픽·인사이트)은 Claude가 ai_notes.js 에 작성한다.
"""
import csv, json, glob, os, re, datetime, collections, statistics, subprocess, tempfile, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW_DIR = os.path.join(HERE, "data", "reviews")
VOC_DIR = os.path.join(HERE, "data", "voc")

BRAND_MAP = {"C": "Chai", "H": "호우섬", "S": "서리재", "I": "이타마에", "J": "정육점"}

# 월별 리뷰 파일의 사전분류 감성 → 대시보드 용어
SENT_MAP = {"긍정": "칭찬", "부정": "불만", "중립": "중립", "GOOD": "칭찬", "BAD": "불만", "기타": "중립"}
SRC_MAP = {"네이버": "naver", "naver": "naver", "캐치테이블": "catchtable",
           "catchtable": "catchtable", "고객의 소리": "voc"}

# 월별 키워드 TOP (칭찬/불만) — (표시명, 매칭어 목록). 리뷰 본문에 매칭어 포함 시 카운트.
PRAISE_KW = [
    ("맛있다", ["맛있", "맛잇", "맛나", "존맛", "맛집"]), ("친절", ["친절"]),
    ("깔끔/청결", ["깔끔", "깨끗", "청결", "정갈"]), ("분위기", ["분위기"]),
    ("신선", ["신선", "싱싱"]), ("가성비", ["가성비", "합리적", "가격 대비 좋"]),
    ("재방문", ["재방문", "또 가", "또 방문", "또 오", "자주"]),
    ("양 많음", ["푸짐", "넉넉", "양 많", "양이 많"]),
    ("응대 좋음", ["서비스 좋", "응대 좋", "응대가 좋", "친절하게"]),
    ("최고/만족", ["최고", "훌륭", "만족", "대만족", "강추", "추천"]),
    ("부드러움", ["부드럽", "촉촉", "쫄깃"]),
]
COMPLAINT_KW = [
    ("짜다", ["짜다", "짜고", "짜서", "너무 짜", "짜요", "짭짤"]),
    ("불친절", ["불친절", "무뚝뚝", "퉁명", "불쾌", "싸가지", "무표정"]),
    ("비싸다", ["비싸", "비쌈", "돈 아깝", "가격이 비"]),
    ("위생", ["위생", "머리카락", "이물", "더럽", "벌레", "지저분"]),
    ("느끼/비림", ["느끼", "비린", "비려"]),
    ("식감", ["딱딱", "질기", "불어", "눅", "퍽퍽"]),
    ("미지근/식음", ["미지근", "식어서", "차갑", "식었"]),
    ("대기/지연", ["오래", "지연", "느림", "느려", "웨이팅", "한참", "기다"]),
    ("양 적음", ["양 적", "양이 적", "양도 적", "부실"]),
    ("맛없음", ["맛없", "맛 없", "맛이 없", "밍밍", "맹탕"]),
    ("단맛", ["너무 달", "달아", "달고", "달다"]),
]


def keyword_counts(rows, groups):
    """그룹별로 본문에 매칭어가 든 리뷰 수 카운트 → 비어있지 않은 것만 내림차순."""
    out = []
    for name, terms in groups:
        c = sum(1 for r in rows if any(t in (r.get("text") or "") for t in terms))
        if c:
            out.append([name, c])
    out.sort(key=lambda x: -x[1])
    return out


def parse_date(v):
    """방문일자 정규화. 1월 파일은 엑셀 시리얼(46053), 2·3월은 'YYYY-MM-DD' 문자열."""
    v = (v or "").strip()
    if not v:
        return None
    if "-" not in v and v.replace(".", "").isdigit():   # 엑셀 시리얼
        try:
            return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(v)))).isoformat()
        except ValueError:
            return None
    return v[:10]

# ── 한국어 외식 리뷰 감성 사전 (네이버 리뷰는 평점이 없어 텍스트로 추정) ──
# 주의: '웨이팅','기다'는 긍정 맥락("웨이팅 없이","기다린 보람")이 많아 NEG에서 제외.
NEG = ["별로", "별루", "실망", "불친절", "최악", "짜증", "다신", "다시는", "안 가요", "안 갈",
       "비싸", "비쌈", "비쌌", "아쉽", "아쉬", "맛없", "맛 없", "맛이 없", "노맛", "불쾌", "위생",
       "더럽", "지저분", "머리카락", "벌레", "이물", "느끼", "짜다", "짜고", "짜서", "싱겁", "식었",
       "차갑게", "불만", "화나", "환불", "오래 걸", "오래걸", "한참 기다", "한참을", "너무 오래",
       "느림", "느려", "느렸", "무뚝뚝", "퉁명", "그닥", "글쎄", "비추", "돈 아깝", "돈아깝",
       "별로에요", "별로예요", "최악이", "다신 안", "재방문 안", "위생적이지", "불결", "엉망",
       "형편없", "최하", "기대 이하", "기대이하", "별로였", "안 좋", "안좋", "별로임", "실망스"]
POS = ["맛있", "맛잇", "존맛", "꿀맛", "친절", "최고", "추천", "만족", "좋았", "좋아요", "좋네",
       "좋습니", "재방문", "또 가", "또가", "또 올", "또 방문", "깔끔", "신선", "훌륭", "분위기 좋",
       "멋지", "완벽", "감동", "정성", "푸짐", "가성비 좋", "합리적", "즐거", "행복", "사랑",
       "좋은", "맛집", "강추", "넉넉", "친절하", "분위기가 좋", "분위기도 좋", "맛도 좋"]

# 불만 토픽 카테고리 (불만 리뷰에만 태깅)
TOPIC_KW = {
    "서비스/응대": ["불친절", "친절", "응대", "직원", "서비스", "무뚝뚝", "퉁명", "태도", "불쾌", "사장", "알바", "종업원"],
    "맛/품질":   ["맛없", "맛 없", "맛이 없", "노맛", "싱겁", "짜다", "짜고", "느끼", "비린", "퀄리티", "신선하지", "재료", "품질", "맛이"],
    "대기/속도":  ["오래 걸", "오래걸", "한참", "기다", "웨이팅", "느림", "느려", "느렸", "늦게", "지연", "텀"],
    "가격":     ["비싸", "비쌈", "비쌌", "가성비", "가격", "돈 아깝", "돈아깝", "양 대비", "양에 비해"],
    "위생":     ["위생", "더럽", "지저분", "머리카락", "벌레", "이물", "불결", "청결", "화장실"],
    "예약/주문":  ["예약", "주문", "웨이팅", "자리", "포장", "오더", "키오스크", "라스트오더"],
}

CRITICAL_KW = ["식중독", "식재료", "위생", "벌레", "머리카락", "이물", "배탈", "복통", "비린",
               "상한", "변질", "알레르기", "탈났", "병원", "토했", "설사"]


def latest(globpat):
    files = glob.glob(globpat)
    if not files:
        return None
    return max(files, key=os.path.getmtime)


def clean_store(raw):
    s = (raw or "").replace("﻿", "").strip()
    if "." in s:
        code, _, name = s.partition(".")
        brand = BRAND_MAP.get(code.strip(), code.strip())
        return brand, name.strip()
    return "(미상)", s


def has_content(text):
    """실질적 내용이 있는 리뷰인지. 공백·문장부호만 있으면(별점만 남긴 리뷰) 내용 없음.
       불만 집계는 실제 불만 텍스트가 있는 리뷰만 인정 — 네이버·캐치테이블 공통 적용."""
    return bool(re.search(r"[^\W_]", text or "", re.UNICODE))


def classify_review(text, rating, source):
    """캐치테이블은 평점 우선, 그 외(네이버)는 사전 기반."""
    if source == "catchtable" and rating not in (None, ""):
        try:
            r = float(rating)
            if r <= 2.5:
                return "불만"
            if r >= 4.0:
                return "칭찬"
            return "중립"
        except ValueError:
            pass
    t = text or ""
    neg = sum(t.count(w) for w in NEG)
    pos = sum(t.count(w) for w in POS)
    if neg > pos:
        return "불만"
    if pos > neg:
        return "칭찬"
    return "중립"


def tag_topics(text):
    t = text or ""
    hits = [topic for topic, kws in TOPIC_KW.items() if any(k in t for k in kws)]
    return hits or ["기타"]


def pct(part, whole):
    return round(part / whole * 100, 1) if whole else 0.0


# ─────────────────────────────  리뷰  ─────────────────────────────
def normalize_reviews_file(path):
    """월별 리뷰 CSV 한 개를 표준 행으로 변환. 두 가지 양식 자동 인식.
       양식A(1·2월): 브랜드|매장명|방문일자|리뷰내용|리뷰유형|카테고리|채널
       양식B(3월~): 생성시각|매장명|브랜드명|...|방문일자|평점|출처|...|리뷰내용|리뷰감성(Gemini)|...
       감성은 파일에 사전분류돼 있으므로 그대로 사용(긍정/부정/중립)."""
    out = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        rd = csv.DictReader(f)
        hdr = rd.fieldnames or []
        fixed_source = None
        if "닉네임" in hdr and "작성일자" in hdr:   # 양식 C: 캐치테이블 통합(방문일자 없음, 작성일자 사용)
            sc, tc, mc, dc, cc = "리뷰유형", "리뷰내용", "매장명", "작성일자", None
            fixed_source = "catchtable"
        elif "리뷰유형" in hdr:               # 양식 A (네이버+캐치테이블, 채널 구분)
            sc, tc, mc, dc, cc = "리뷰유형", "리뷰내용", "매장명", "방문일자", "채널"
        elif "리뷰감성(Gemini)" in hdr:      # 양식 B
            sc, tc, mc, dc, cc = "리뷰감성(Gemini)", "리뷰내용", "매장명", "방문일자", "출처"
        else:
            return []                        # (구) merged 등 미지원 양식 → 건너뜀
        for r in rd:
            brand, store = clean_store(r.get(mc, ""))
            date = parse_date(r.get(dc, ""))
            if not date:
                continue
            src = fixed_source or SRC_MAP.get((r.get(cc) or "").strip(), (r.get(cc) or "").strip() or "기타")
            out.append({
                "brand": brand, "store": f"{brand}·{store}", "store_short": store,
                "month": date[:7], "date": date, "text": r.get(tc, "") or "",
                "source": src,
                "sentiment": SENT_MAP.get((r.get(sc) or "").strip(), "중립"),
            })
    return out


def load_merged_catchtable(path, skip_months):
    """프로그램 파일에 캐치테이블이 빠진 월(4~6월)을 merged 파일의 캐치테이블로 보충.
       이미 캐치테이블이 있는 월(skip_months)은 건너뜀(중복 방지). 감성은 평점 기반."""
    out = []
    with open(path, encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if (r.get("source") or "").strip() != "catchtable":
                continue
            date = (r.get("review_date") or "").strip()[:10]
            if not date or date[:7] in skip_months:
                continue
            brand, store = clean_store(r.get("store_name", ""))
            out.append({
                "brand": brand, "store": f"{brand}·{store}", "store_short": store,
                "month": date[:7], "date": date, "text": r.get("review_text", "") or "",
                "source": "catchtable",
                "sentiment": classify_review(r.get("review_text", ""), r.get("rating", ""), "catchtable"),
            })
    return out


# ─────────────────────── 2025 월별 집계 (팀 월간 분석 워크북) ───────────────────────
# 2025년은 raw 리뷰 CSV 가 없고, 팀이 만든 월별 분석 엑셀(온라인 리뷰_25.MM월.xlsx)만 있다.
# 각 파일 TOTAL 시트의 '매장유형별 총건수/BAD/GOOD' 를 브랜드로 집계해 월·브랜드 추이에 주입.
# (매장 단위·리뷰 원문·출처분해는 워크북에 없으므로 2025는 추이/브랜드 집계까지만 — 매장 드릴다운은 2026+.)
WB_BRANDS = ["Chai", "호우섬", "서리재", "이타마에", "정육점"]


def _wb_brand(sub):
    s = str(sub).replace(" ", "")
    if "정육" in s or "바른고기" in s:
        return "정육점"
    if "서리재" in s:
        return "서리재"
    if "이타" in s:
        return "이타마에"
    if "호우섬" in s:          # 살롱드호우섬 포함
        return "호우섬"
    return "Chai"              # CHAI797 Black/Dining/UCD/JUCD/CD


def build_2025():
    """`_2025_cache.json`(extract_2025.py 가 Excel COM 으로 DRM 복호화 후 덤프한 캐시)를 읽어
    (months, by_month_total, by_month_brand, complaints) 반환. 캐시 없으면 ([],{},{},[]).
    워크북이 Fasoo DRM 으로 수시 재암호화돼 자동실행 때 못 읽으므로, 대화형에서 extract_2025.py 로 캐시 생성."""
    cache_path = os.path.join(REVIEW_DIR, "_2025_cache.json")
    if not os.path.exists(cache_path):
        print("[!] _2025_cache.json 없음 → 2025 미포함. 대화형에서 `python extract_2025.py` 실행 필요.")
        return [], {}, {}, []
    with open(cache_path, encoding="utf-8") as f:
        cache = json.load(f)
    sm_path = os.path.join(REVIEW_DIR, "_2025_summaries.json")
    summaries = {}
    if os.path.exists(sm_path):
        try:
            with open(sm_path, encoding="utf-8") as f:
                summaries = json.load(f)
        except Exception:
            summaries = {}

    months, bmt, bmb = [], {}, {}
    for m in sorted(cache.get("months", {})):
        mm = cache["months"][m]
        tot, bad, good = mm["total"], mm["bad"], mm["good"]
        months.append(m)
        bmt[m] = {"total": tot, "칭찬": good, "불만": bad, "중립": max(0, tot - bad - good),
                  "불만율": pct(bad, tot), "칭찬율": pct(good, tot)}
        bmb[m] = {}
        for b in WB_BRANDS:
            o = mm.get("brand", {}).get(b, {"total": 0, "칭찬": 0, "불만": 0})
            ot = o["total"]
            bmb[m][b] = {"total": ot, "칭찬": o["칭찬"], "불만": o["불만"],
                         "중립": max(0, ot - o["칭찬"] - o["불만"]),
                         "불만율": pct(o["불만"], ot), "칭찬율": pct(o["칭찬"], ot)}

    complaints = []
    for i, c in enumerate(cache.get("complaints", [])):
        summ = (summaries.get(str(i)) or c.get("team_summary") or "").strip()
        complaints.append({
            "brand": c["brand"], "store_short": c["store_short"],
            "month": c["month"], "date": c["date"], "type": c.get("type", ""),
            "summary": summ, "detail": (c.get("opinion") or "").strip(),
        })
    return months, bmt, bmb, complaints


def build_reviews():
    files = [f for f in sorted(glob.glob(os.path.join(REVIEW_DIR, "*.csv")))
             if not os.path.basename(f).startswith("_")]
    if not files:
        raise SystemExit("data/reviews/ 에 CSV가 없습니다. 월별 리뷰 파일을 넣어주세요.")
    # prio: 프로그램(매크로) 파일 = 2(감성 신뢰: Gemini/사전분류), 자동수집·merged = 1.
    # 같은 리뷰가 양쪽에 있으면 prio 높은(프로그램) 감성을 채택 — 자동수집 키워드 감성이 덮어쓰지 않게.
    rows, used = [], []
    for p in files:
        rs = normalize_reviews_file(p)
        if rs:
            bn = os.path.basename(p)
            prio = 1 if (bn.startswith("naver_collected") or "merged" in bn.lower()) else 2
            for r in rs:
                r["_prio"] = prio
            rows.extend(rs)
            used.append(bn)
    if not rows:
        raise SystemExit("인식 가능한 월별 리뷰 양식(리뷰유형/리뷰감성)이 없습니다.")
    # 캐치테이블 보충: 프로그램 파일에 캐치테이블이 없는 월을 merged 파일에서 채움
    ct_months = {r["month"] for r in rows if r["source"] == "catchtable"}
    merged = [f for f in glob.glob(os.path.join(REVIEW_DIR, "*.csv"))
              if "merged" in os.path.basename(f).lower()]
    if merged:
        add = load_merged_catchtable(merged[0], ct_months)
        if add:
            for r in add:
                r["_prio"] = 1
            rows.extend(add)
            used.append(os.path.basename(merged[0]) + " (catchtable 보충)")
    # 프로그램(매크로)이 그 달 네이버의 주력 소스면(프로그램 건수 ≥ 자동 건수) 프로그램 100% 사용 →
    # 그 달의 자동수집 네이버 제외. 프로그램이 spillover 수준(자동보다 적음)인 달은 자동수집 유지(당월 등).
    prog_n = collections.Counter(r["month"] for r in rows if r.get("_prio", 0) >= 2 and r["source"] == "naver")
    auto_n = collections.Counter(r["month"] for r in rows if r.get("_prio", 0) == 1 and r["source"] == "naver")
    drop_naver_months = {m for m in prog_n if prog_n[m] >= auto_n.get(m, 0)}
    rows = [r for r in rows
            if not (r.get("_prio", 0) == 1 and r["source"] == "naver" and r["month"] in drop_naver_months)]
    # 중복 제거(우선순위 반영). 캐치테이블은 출처마다 날짜 컬럼이 달라(방문↔작성) 내용 기준,
    # 네이버는 (매장·날짜·내용) 기준. 동일 리뷰면 prio 높은(프로그램 감성) 행을 채택.
    best = {}
    for r in rows:
        t = (r["text"] or "").strip()
        if r["source"] == "catchtable":
            k = ("ct", r["store"], t) if t else ("ct", r["store"], r["date"], r["sentiment"])
        else:
            k = (r["store"], r["date"], t)
        ex = best.get(k)
        if ex is None or r.get("_prio", 0) > ex.get("_prio", 0):
            best[k] = r
    rows = list(best.values())
    # 별점만 있고 내용 없는 리뷰는 불만으로 세지 않음 → 중립 처리(전체 건수는 유지).
    # 네이버·캐치테이블 공통. 실제 불만 텍스트가 있는 리뷰만 불만 건수·불만 상세에 반영.
    for r in rows:
        if r["sentiment"] == "불만" and not has_content(r.get("text")):
            r["sentiment"] = "중립"
    # raw 리뷰 파이프라인은 2026-01~ 만 담당(월별 CSV 존재). 2025년은 raw 리뷰가 없고
    # 팀 월간 분석 워크북(온라인 리뷰_25.MM월.xlsx)만 있어 build_2025()가 집계로 별도 주입한다.
    # (여기서 2025를 포함하면 캐치테이블 과거분·네이버 방문일자 잔여만 잡혀 실제보다 훨씬 적게 나옴.)
    START_MONTH = "2026-01"
    FLOOR = 15
    mcount = collections.Counter(r["month"] for r in rows)
    months = [m for m in sorted(mcount) if m >= START_MONTH and mcount[m] >= FLOOR]
    rowset = [r for r in rows if r["month"] in months]
    cur = months[-1]
    prev = months[-2] if len(months) > 1 else None
    brands = ["Chai", "호우섬", "서리재", "이타마에", "정육점"]

    def agg(subset):
        c = collections.Counter(r["sentiment"] for r in subset)
        tot = len(subset)
        return {"total": tot, "칭찬": c["칭찬"], "불만": c["불만"], "중립": c["중립"],
                "불만율": pct(c["불만"], tot), "칭찬율": pct(c["칭찬"], tot)}

    by_month_total = {m: agg([r for r in rowset if r["month"] == m]) for m in months}
    by_month_brand = {m: {b: agg([r for r in rowset if r["month"] == m and r["brand"] == b]) for b in brands}
                      for m in months}

    # 매장 랭킹 (현재월, 불만율 내림차순; 표본 10건 이상만 신뢰)
    cur_rows = [r for r in rowset if r["month"] == cur]
    prev_rows = [r for r in rowset if r["month"] == prev] if prev else []
    stores = sorted({r["store"] for r in cur_rows})
    store_rank = []
    for s in stores:
        sub = [r for r in cur_rows if r["store"] == s]
        a = agg(sub)
        psub = [r for r in prev_rows if r["store"] == s]
        pa = agg(psub) if psub else None
        store_rank.append({
            "store": s, "brand": sub[0]["brand"], "total": a["total"],
            "불만": a["불만"], "불만율": a["불만율"],
            "prev_불만율": pa["불만율"] if pa else None,
            "delta": round(a["불만율"] - pa["불만율"], 1) if pa else None,
        })
    store_rank.sort(key=lambda x: x["store"])                       # 동률 시 가나다순(결정론적)
    store_rank.sort(key=lambda x: (x["불만율"], x["불만"]), reverse=True)

    # TOP3 불만 매장 (불만 건수 많은 순, 표본 10건 이상)
    top3 = sorted([s for s in store_rank if s["total"] >= 10],
                  key=lambda x: (x["불만"], x["불만율"]), reverse=True)[:3]

    # 토픽 빈도 (현재월 불만 리뷰)
    cur_complaints = [r for r in cur_rows if r["sentiment"] == "불만"]
    topic_freq = collections.Counter()
    topic_brand = collections.defaultdict(lambda: collections.Counter())
    for r in cur_complaints:
        for tp in tag_topics(r["text"]):
            topic_freq[tp] += 1
            topic_brand[tp][r["brand"]] += 1

    source_split = collections.Counter(r["source"] for r in cur_rows)
    by_month_source = {m: dict(collections.Counter(r["source"] for r in rowset if r["month"] == m)) for m in months}
    # 월별 칭찬/불만 키워드 TOP (전체 비어있지 않은 것 저장 → 프런트가 기간 합산 후 TOP3)
    by_month_keywords = {}
    for m in months:
        pr = [r for r in rowset if r["month"] == m and r["sentiment"] == "칭찬"]
        cm = [r for r in rowset if r["month"] == m and r["sentiment"] == "불만"]
        by_month_keywords[m] = {"praise": keyword_counts(pr, PRAISE_KW),
                                "complaint": keyword_counts(cm, COMPLAINT_KW)}

    # 매장×월 집계 (전 매장 — 검색·기간별 TOP3용). 매달 신규 오픈 매장도 자동 포함.
    store_month = {}
    store_brand = {}
    for r in rowset:
        store_brand[r["store"]] = r["brand"]
        mm = store_month.setdefault(r["store"], {}).setdefault(
            r["month"], {"total": 0, "칭찬": 0, "불만": 0, "중립": 0})
        mm["total"] += 1
        mm[r["sentiment"]] += 1
    # 불만 리뷰 상세 (매장 검색 드릴다운 / 기간 TOP3 근거). 텍스트 포함.
    complaints = [{"store": r["store"], "brand": r["brand"], "month": r["month"],
                   "date": r["date"], "text": r["text"].replace("\n", " ").strip()}
                  for r in rowset if r["sentiment"] == "불만"]
    complaints.sort(key=lambda x: x["date"], reverse=True)

    data = {
        "months": months, "brands": brands, "current_month": cur, "prev_month": prev,
        "by_month_total": by_month_total, "by_month_brand": by_month_brand,
        "store_rank": store_rank, "top3_stores": top3,
        "topic_freq": dict(topic_freq.most_common()),
        "topic_brand": {k: dict(v) for k, v in topic_brand.items()},
        "source_split": dict(source_split),
        "by_month_source": by_month_source,
        "by_month_keywords": by_month_keywords,
        "store_month": store_month, "store_brand": store_brand,
        "stores": sorted(store_brand.keys()), "complaints": complaints,
        "source_file": ", ".join(used),
        "n_reviews": len(rowset),
    }

    # 2025년 팀 월간 분석 워크북(집계) 주입 — 추이/브랜드 차트를 2025-01 까지 확장.
    # 매장 단위·원문·출처는 워크북에 없어 by_month_total/by_month_brand 만 채운다(프런트는 그 외 월별 구조를 ||{} 로 방어).
    try:
        m25, bmt25, bmb25, cmp25 = build_2025()
    except Exception as e:
        m25, bmt25, bmb25, cmp25 = [], {}, {}, []
        print(f"[!] 2025 집계 실패({type(e).__name__}: {e}) — 2025 없이 진행")
    if m25:
        add_months = [m for m in m25 if m not in data["months"]]
        data["months"] = sorted(add_months + data["months"])
        data["by_month_total"].update(bmt25)
        data["by_month_brand"].update(bmb25)
        n25 = sum(bmt25[m]["total"] for m in bmt25)
        data["n_reviews"] += n25
        data["_n2025"] = n25
        data["_months2025"] = add_months
        # 2025 불만 상세를 complaints 에 주입 — 매장명을 2026 매장키에 정합(표기 흔들림 흡수).
        def _nk(s):
            return re.sub(r"[\s점·]", "", s or "")
        idx = {_nk(st): st for st in store_brand}
        for c in cmp25:
            cand = f"{c['brand']}·{c['store_short']}"
            store = idx.get(_nk(cand), cand)
            if store not in store_brand:
                store_brand[store] = c["brand"]        # 2025 전용 매장(2026 미존재)도 검색 가능하게 등록
                idx[_nk(cand)] = store
            data["complaints"].append({
                "store": store, "brand": c["brand"], "month": c["month"],
                "date": c["date"], "text": c["summary"] or "(요약 없음)",
                "detail": c["detail"], "type": c["type"], "src2025": True,
            })
        data["complaints"].sort(key=lambda x: x["date"], reverse=True)
        data["store_brand"] = store_brand
        data["stores"] = sorted(store_brand.keys())
        data["_n2025_complaints"] = len(cmp25)

    # Claude용 추출본 (TOP3 매장 불만 텍스트 + 토픽 샘플)
    def sample_complaints(store, n=25):
        txts = [r["text"].replace("\n", " ").strip()
                for r in cur_rows if r["store"] == store and r["sentiment"] == "불만"]
        return txts[:n]

    ai_top3 = [{"store": s["store"], "brand": s["brand"], "불만율": s["불만율"],
                "불만건수": s["불만"], "total": s["total"],
                "prev_불만율": s["prev_불만율"],
                "complaints": sample_complaints(s["store"])} for s in top3]
    topic_pool = [r["text"].replace("\n", " ").strip() for r in cur_complaints]
    return data, {"current_month": cur, "top3_stores": ai_top3,
                  "topic_sample": topic_pool[:80], "topic_freq": dict(topic_freq.most_common())}


# ─────────────────────────────  SL&C VOC  ─────────────────────────────
CAT_MAP = {"불만족": "불만", "불만": "불만", "칭찬": "칭찬", "의견": "기타", "문의": "문의"}
COLS = ["NO", "매장명", "등록일", "구분", "문의유형", "작성자", "연락처", "이메일",
        "답변유형", "제목", "내용", "등록일시", "답변", "답변여부", "답변일"]


def voc_brand(name):
    n = name or ""
    if "Chai" in n or "차이" in n:
        return "Chai"
    if "호우섬" in n:
        return "호우섬"
    if "서리재" in n:
        return "서리재"
    if "이타마에" in n:
        return "이타마에"
    if "정육" in n:
        return "정육점"
    return "(미상)"


def mask_name(s):
    s = (s or "").strip()
    if len(s) <= 1:
        return s or "익명"
    return s[0] + "○" * (len(s) - 1)


def parse_dt(s):
    s = (s or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.datetime.strptime(s, fmt)
        except ValueError:
            continue
    return None


def _prev_voc():
    """직전 data.js 의 voc 블록 복원 (VOC 원본 DRM 잠김 시 보존용)."""
    p = os.path.join(HERE, "data.js")
    if not os.path.exists(p):
        return None
    try:
        txt = open(p, encoding="utf-8").read()
        i, j = txt.find("{"), txt.rfind("}")
        return json.loads(txt[i:j + 1]).get("voc")
    except Exception:
        return None


# ── Fasoo DRM 복호화 폴백 (eck/eck_build.py 와 동일 원리) ─────────────
# 이 PC의 VOC(고객의 소리) xls 내보내기는 사내 Fasoo DRM 으로 재암호화되어
# pandas.read_html 이 직접 못 읽는다. Fasoo 에이전트가 살아있는 대화형 세션에서는
# Excel COM 으로 열면 복호화되므로, PowerShell 로 첫 시트 값을 평문 CSV 로 덤프해 파싱한다.
_PS_DUMP = r'''
$ErrorActionPreference='Stop'; $xl=$null
try{
  $xl=New-Object -ComObject Excel.Application
  $xl.Visible=$false; $xl.DisplayAlerts=$false
  $wb=$xl.Workbooks.Open("__PATH__",0,$true)
  $ws=$wb.Sheets.Item(1); $u=$ws.UsedRange; $d=$u.Value2
  $rows=$u.Rows.Count; $cols=$u.Columns.Count
  $sw=New-Object System.IO.StreamWriter("__OUT__",$false,(New-Object System.Text.UTF8Encoding($true)))
  for($r=1;$r -le $rows;$r++){ $line=New-Object System.Collections.Generic.List[string]
    for($c=1;$c -le $cols;$c++){ $v=$d.GetValue($r,$c); if($null -eq $v){$v=''}; $v=[string]$v
      if($v -match '[",\n]'){ $v='"'+($v -replace '"','""')+'"' }; $line.Add($v) }
    $sw.WriteLine([string]::Join(',',$line)) }
  $sw.Close(); $wb.Close($false); $xl.Quit()
}finally{ if($xl){[void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($xl)} }
'''


def _voc_df_via_excel(path):
    """DRM 잠긴 VOC xls → Excel COM 으로 첫 시트를 평문 CSV 덤프 후 header=None DataFrame 반환.
    비대화형(작업 스케줄러)에서 Excel COM 이 안 뜨면 None (상위에서 이전값 폴백)."""
    import pandas as pd
    key = hashlib.md5(os.path.abspath(path).encode("utf-8")).hexdigest()[:12]
    out = os.path.join(tempfile.gettempdir(), f"voc_drm_{key}.csv")
    if not (os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(path)):
        ps = _PS_DUMP.replace("__PATH__", os.path.abspath(path)).replace("__OUT__", out)
        try:
            subprocess.run(["powershell", "-NoProfile", "-NonInteractive", "-Command", ps],
                           check=True, capture_output=True, timeout=180)
        except Exception:
            return None
    if not (os.path.exists(out) and os.path.getsize(out) > 0):
        return None
    df = pd.read_csv(out, header=None, dtype=str, keep_default_na=False, encoding="utf-8-sig")
    # Excel COM(Value2)은 날짜셀을 시리얼 숫자(예: 46222.85)로 준다 → 날짜 문자열로 복원.
    # 헤더행(row0)에서 날짜 컬럼을 찾아 그 열만 변환.
    epoch = datetime.datetime(1899, 12, 30)
    if len(df):
        hdr = list(df.iloc[0])
        date_cols = [i for i, h in enumerate(hdr)
                     if any(k in str(h) for k in ("일자", "등록일", "답변일", "방문"))]
        for c in date_cols:
            for r in range(1, len(df)):
                v = str(df.iat[r, c]).strip()
                try:
                    fv = float(v)
                except (ValueError, TypeError):
                    continue
                if fv > 1:  # 유효 시리얼(1899-12-31 이후)
                    dt = epoch + datetime.timedelta(days=fv)
                    df.iat[r, c] = dt.strftime("%Y-%m-%d %H:%M:%S")
    return df


def build_voc():
    import pandas as pd
    path = latest(os.path.join(VOC_DIR, "*.xls")) or latest(os.path.join(VOC_DIR, "*.xlsx"))
    if not path:
        return None, None
    try:
        tables = pd.read_html(path)
        df = max(tables, key=lambda d: d.shape[0])
    except Exception as e:
        df = _voc_df_via_excel(path)  # DRM → Excel COM 복호화 CSV
        if df is None:
            prev = _prev_voc()
            print(f"[!] VOC 원본 읽기 실패({type(e).__name__}) - DRM 잠김·Excel COM 실패. "
                  f"기존 data.js 의 VOC {('유지' if prev else '없음')}. "
                  f"VOC 갱신하려면 DRM 해제 환경(대화형)에서 build.py 재실행.")
            return prev, None
    df = df.iloc[1:]  # 첫 행은 헤더(웹 내보내기라 <th>가 없음)
    df.columns = COLS[:df.shape[1]]
    recs = []
    for _, row in df.iterrows():
        name = str(row.get("매장명", "")).strip()
        cat = CAT_MAP.get(str(row.get("구분", "")).strip(), "기타")
        reg = parse_dt(str(row.get("등록일시", "")) if str(row.get("등록일시", "")).strip() not in ("", "nan") else str(row.get("등록일", "")))
        rep = parse_dt(str(row.get("답변일", "")))
        content = str(row.get("내용", "")).strip()
        status = str(row.get("답변여부", "")).strip()
        resp_h = round((rep - reg).total_seconds() / 3600, 1) if (reg and rep) else None
        recs.append({
            "store": name, "brand": voc_brand(name), "category": cat,
            "inquiry_type": str(row.get("문의유형", "")).strip(),
            "title": str(row.get("제목", "")).strip(),
            "content": content,
            "author": mask_name(str(row.get("작성자", ""))),
            "reg": reg.strftime("%Y-%m-%d") if reg else "", "month": reg.strftime("%Y-%m") if reg else "",
            "status": status,
            "reply": str(row.get("답변", "")).strip() if str(row.get("답변", "")).strip() not in ("nan", "") else "",
            "resp_h": resp_h,
            "critical": any(k in content for k in CRITICAL_KW),
        })
    months = sorted({r["month"] for r in recs if r["month"]})
    # VOC는 소표본(월 누적 스냅샷)이므로 전체 접수분을 현황으로 집계 — 미답변/크리티컬 누락 방지
    cur = f"{months[0]}~{months[-1]}" if months else ""
    cur_recs = recs

    cat_c = collections.Counter(r["category"] for r in cur_recs)
    status_c = collections.Counter(r["status"] for r in cur_recs)
    resp_times = [r["resp_h"] for r in cur_recs if r["resp_h"] is not None]
    inquiry = collections.Counter((r["inquiry_type"], r["category"]) for r in cur_recs)
    store_c = collections.Counter(r["store"] for r in cur_recs)

    voc = {
        "current_month": cur, "months": months, "n": len(cur_recs),
        "kpi": {
            "불만": cat_c.get("불만", 0),
            "총접수": len(cur_recs), "칭찬": cat_c.get("칭찬", 0),
            "문의": cat_c.get("문의", 0), "기타": cat_c.get("기타", 0),
        },
        "by_inquiry": {f"{it}/{ct}": n for (it, ct), n in inquiry.most_common()},
        "inquiry_type_count": dict(collections.Counter(r["inquiry_type"] for r in cur_recs)),
        "store_rank": [{"store": s, "n": n} for s, n in store_c.most_common(15)],
        "by_month": {m: collections.Counter(r["category"] for r in recs if r["month"] == m) for m in months},
        # 전체 레코드 — 프런트에서 기간(월별·구간)으로 필터해 KPI·문의유형·크리티컬 재집계
        "records": [
            {"store": r["store"], "brand": r["brand"], "category": r["category"],
             "inquiry_type": r["inquiry_type"], "title": r["title"], "content": r["content"],
             "reply": r["reply"], "author": r["author"], "reg": r["reg"],
             "month": r["month"], "critical": r["critical"]}
            for r in cur_recs],
        "source_file": os.path.basename(path),
    }
    # by_month Counter → dict
    voc["by_month"] = {m: dict(c) for m, c in voc["by_month"].items()}

    ai_voc = [{"store": r["store"], "category": r["category"], "inquiry_type": r["inquiry_type"],
               "content": r["content"], "status": r["status"], "reply": r["reply"]}
              for r in cur_recs if r["critical"] or r["category"] == "불만"][:30]
    return voc, ai_voc


def main():
    reviews, ai_rev = build_reviews()
    voc, ai_voc = build_voc()
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    payload = {"generated_at": now, "reviews": reviews, "voc": voc}

    with open(os.path.join(HERE, "data.js"), "w", encoding="utf-8") as f:
        f.write("window.REVIEW_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n")

    ai_input = {"generated_at": now, "reviews": ai_rev, "voc": ai_voc}
    with open(os.path.join(HERE, "ai_input.json"), "w", encoding="utf-8") as f:
        json.dump(ai_input, f, ensure_ascii=False, indent=1)

    print(f"[OK] data.js 생성  (리뷰 {reviews['n_reviews']}건, 현재월 {reviews['current_month']})")
    if voc:
        print(f"[OK] VOC {voc['n']}건 (기간 {voc['current_month']})")
    print(f"[OK] ai_input.json 생성 → Claude가 읽고 ai_notes.js를 작성합니다.")
    print(f"     TOP3 불만 매장: {[s['store'] for s in reviews['top3_stores']]}")


if __name__ == "__main__":
    main()
