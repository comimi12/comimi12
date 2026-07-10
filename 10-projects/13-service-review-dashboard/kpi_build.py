# -*- coding: utf-8 -*-
"""
월별 KPI(서비스 등급) 산출 → kpi_data.js

규칙 (차재환님 지정):
- KPI 등급 = "리뷰 대비 불만율" 오름차순(불만율 낮을수록 우수)으로 매장 순위 →
  S 3개 · A 4개 · (중간 전부) B · C 4개 · D 4개.  점수 매핑 S=100/A=90/B=80/C=70/D=60.
- 1~5월: 취합 엑셀('서비스' 시트)의 기존 점수/등급을 그대로 사용(시각화).
- 6월~ : 네이버+캐치테이블(reviews) + SL&C 고객의소리(VOC) 3종을 종합해 자동 산출.
- 매장 로스터: ECK CS 체크리스트(eck_data.js) 최신월 기준 → 신규 매장 자동 반영.

입력: data.js(window.REVIEW_DATA), eck_data.js(월별 CS 명단), 취합 엑셀.
출력: kpi_data.js(window.KPI_DATA)

사용: python kpi_build.py
"""
import os, re, sys, io, json, datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))

XLSX = r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\VOC 평가 자료(우수매장, KPI, 영업직군)\(26년) KPI 평가 자료\※ 2026 월별 KPI 취합_취합용(5월).xlsx"

# 등급 기준 (엑셀 '기준'/'서비스' 시트와 동일)
GRADE_SCORE = {"S": 100, "A": 90, "B": 80, "C": 70, "D": 60}
# 고정 정원: 불만율 낮은 순 상위 S 3 / A 4 ... 높은 순(불만 많은) D 4 / C 4, 나머지 B
QUOTA = {"S": 3, "A": 4, "C": 4, "D": 4}  # B = 나머지
MIN_SAMPLE = 5  # 이 미만 표본(리뷰+VOC 합)은 순위 제외 → B (극소표본 노이즈로 S/D 왜곡 방지)
FINALIZE_DAY = 5  # 익월 이 날짜에 전월 등급 확정(동결). 이후 늦은 리뷰로도 확정등급 불변.

# 브랜드 정규화: 엑셀접두어/한글/ECK표기 → 캐논
BRAND_CANON = {
    "C": "Chai", "Chai": "Chai", "Chai797": "Chai", "차이797": "Chai",
    "H": "호우섬", "호우섬": "호우섬",
    "I": "이타마에", "이타마에": "이타마에",
    "J": "정육점", "정육점": "정육점",
    "S": "서리재", "서리재": "서리재",
}
# 엑셀 접두어 → 캐논 브랜드 (라벨 표시용)
EXCEL_PREFIX = {"C": "Chai", "H": "호우섬", "I": "이타마에", "J": "정육점", "S": "서리재"}

# 매장 별칭: 소스마다 다른 이름 → 캐논 키로 통합 (사용자 확인 매핑).
# key = "캐논브랜드|지점명"(사람이 읽기 쉽게 '점' 포함 작성 — 로드 시 _normkey로 자동 정규화).
# 좌변(변형) → 우변(기준)으로 병합.
STORE_ALIAS_RAW = {
    "Chai|뉴코아아울렛강남점": "Chai|NC강남점",       # VOC: Chai797 뉴코아 아울렛 강남점
    "Chai|뉴코아강남점": "Chai|NC강남점",
    "Chai|BLACK서래마을점": "Chai|서래마을점",         # VOC: Chai797 BLACK 서래마을점 = 서래마을점
    "이타마에|D타워점": "이타마에|광화문D타워점",       # ECK: 이타마에 D타워점 = 광화문D타워점
    "Chai|롯대부산본점": "Chai|롯데부산본점",           # VOC 오타 롯대→롯데
    "Chai|수원스타필드점": "Chai|스타필드수원점",         # VOC 어순
    "Chai|신세계센텀점": "Chai|센텀시티몰",             # VOC 신세계센텀 → 센텀시티몰(현행). 신세계센텀시티점은 폐점
    "호우섬|현대여의도점": "호우섬|더현대서울점",           # VOC 현대여의도 = 더현대서울(현대百 여의도)
    # ECK 어순/명칭 변형 → 기존 리뷰 매장으로 병합 (엑셀 이니셜: c.송도/김해/광명/고척, S.의정부)
    "Chai|송도트리플스트리트점": "Chai|트리플스트리트송도점",
    "Chai|김해신세계점": "Chai|신세계김해점",
    "Chai|광명롯데몰": "Chai|롯데몰광명점",
    "Chai|고척아이파크몰점": "Chai|아이파크고척점",
    "서리재|의정부신세계점": "서리재|신세계의정부점",
    "Chai|센텀시티점": "Chai|센텀시티몰",               # ECK CHAI D/N 센텀시티점 = 센텀시티몰점
    "서리재|왕십리역사점": "서리재|왕십리점",
    "호우섬|왕십리역사점": "호우섬|왕십리점",
    "서리재|왕십리역점": "서리재|왕십리점",       # 리뷰 왕십리역점 = 엑셀 왕십리점 (동일 매장)
    "호우섬|왕십리역점": "호우섬|왕십리점",
    "서리재|신세계아트앤사이언스점": "서리재|대전아트사이언스점",
    "호우섬|신세계아트앤사이언스점": "호우섬|대전아트사이언스점",
    "이타마에|잠실점": "이타마에|잠실롯데월드몰점",
    "Chai|롯데월드몰점": "Chai|잠실롯데월드몰점",   # 리뷰 표기흔들림: 롯데월드몰 = 잠실롯데월드몰
    "서리재|롯데평촌점": "서리재|평촌점",          # 롯데평촌 = 평촌 (동일 매장)
    "서리재|신세계시흥점": "서리재|시흥점",         # 신세계시흥 = 시흥 (동일 매장)
}

# 없는 매장: 완전 제거 (로스터·다운로드 어디에도 안 나옴)
STORE_GONE_RAW = {
    "호우섬|롯데본점",          # 없는 매장
}
# 폐점 매장: 액티브 등급에서 제외하되 다운로드 맨 아래 블록에 1~5월 엑셀값으로 표기
# (원본 '서비스' 시트 하단 폐점 블록 + 사용자 확인 폐점)
STORE_CLOSED_RAW = {
    "Chai|네이버1784점", "Chai|광화문점", "서리재|현대미아점",
    "Chai|타임테라스동탄점", "호우섬|현대천호점", "정육점|여의도점",
    "Chai|을지로점",           # (정육점 을지로점은 운영 유지)
    "Chai|신세계센텀시티점",     # 폐점 → 현행 센텀시티몰로 일원화(리뷰전용, 엑셀엔 없음)
}

# ECK 매장명 접두어 제거용 정규식 (브랜드 필드와 표기 대소문자/컨셉 어긋나도 지점명만 추출)
_BRAND_PREFIX_RE = re.compile(
    r"(?i)^\s*(chai\s*d\s*/?\s*n|chai\s*797|chai|차이\s*797?|살롱드\s*호우섬|샬롱드\s*호우섬|"
    r"호우섬|서리재|이타마에|정육점|바른고기\s*정육점|바른고기)\s*")


def strip_brand_prefix(store):
    return _BRAND_PREFIX_RE.sub("", store or "", count=1)


def canon_brand(b):
    b = (b or "").strip()
    if b in BRAND_CANON:
        return BRAND_CANON[b]
    low = b.lower()
    for k, v in BRAND_CANON.items():
        if k.lower() == low:
            return v
    # ECK 변형 접두어 흡수 (CHAI D/N, 살롱드호우섬 등)
    for canon in ("Chai", "호우섬", "이타마에", "정육점", "서리재"):
        if canon.lower() in low or (canon == "Chai" and "chai" in low):
            return canon
    if "호우섬" in b:
        return "호우섬"
    return b


def norm_suffix(s):
    """지점명(브랜드 제거분) 정규화: 괄호·브랜드노이즈(797/BLACK/Dining/D/N)·공백·끝'점' 제거.
    소스마다 다른 표기(Chai797 vs Chai, 을지로 vs 을지로점, 샬롱드도곡 vs 샬롱드도곡점)를 한 키로 수렴."""
    s = s or ""
    s = re.sub(r"\(.*?\)", "", s)                       # (SH) 등 괄호 제거
    s = re.sub(r"797", "", s)                            # 브랜드번호 잔재 (VOC brand=Chai라 지점에 남음)
    s = re.sub(r"(?i)black|dining|d/n|살롱드|샬롱드", "", s)  # 컨셉/서브브랜드 토큰
    s = re.sub(r"\s+", "", s)
    return re.sub(r"점$", "", s)                          # 끝 '점'(지점 표기 흔들림) 제거


def _normkey(k):
    """'브랜드|지점명' 문자열을 캐논 키로 정규화 (별칭 표를 사람이 읽기 쉽게 쓰도록)."""
    b, s = k.split("|", 1)
    return f"{canon_brand(b)}|{norm_suffix(s)}"


# 사람이 쓴 별칭/제외 표를 캐논 키로 정규화 (끝'점' 등 표기차 흡수)
STORE_ALIAS = {_normkey(k): _normkey(v) for k, v in STORE_ALIAS_RAW.items()}
STORE_GONE = {_normkey(k) for k in STORE_GONE_RAW}
STORE_CLOSED = {_normkey(k) for k in STORE_CLOSED_RAW}
STORE_EXCLUDE = STORE_GONE | STORE_CLOSED   # 액티브 로스터에서 제외 (폐점은 다운로드 하단에 별도 표기)


def key_of(brand, suffix):
    k = f"{canon_brand(brand)}|{norm_suffix(suffix)}"
    return STORE_ALIAS.get(k, k)


# ---------- data.js / eck_data.js 로더 ----------
def load_window_json(path, var):
    txt = open(path, encoding="utf-8").read()
    i = txt.index("{")
    d, _ = json.JSONDecoder().raw_decode(txt[i:])
    return d


def load_reviews_voc():
    d = load_window_json(os.path.join(HERE, "data.js"), "REVIEW_DATA")
    return d["reviews"], d["voc"]


def load_eck_roster():
    """ECK CS 최신월 매장 명단 → ([{key,store,brand,suffix}], latest_month). 없으면 ([],None)."""
    p = os.path.join(HERE, "eck_data.js")
    if not os.path.exists(p):
        return [], None
    d = load_window_json(p, "ECK_DATA")
    cs = d.get("cs", {})
    if not cs:
        return [], None
    latest = sorted(cs.keys())[-1]
    out = []
    for st in cs[latest].get("stores", []):
        store = st.get("store", "")
        brand = st.get("brand", "")
        # 정규식으로 접두어 제거 (CHAI D/N·CHAI797 등 brand 필드와 표기 어긋나도 지점명만 추출)
        suffix = strip_brand_prefix(store)
        out.append({"key": key_of(brand, suffix), "store": store,
                    "brand": canon_brand(brand), "suffix": norm_suffix(suffix)})
    return out, latest


def _bigrams(s):
    return {s[i:i+2] for i in range(len(s) - 1)} if len(s) >= 2 else {s}


def fuzzy_match(brand, suffix, roster):
    """같은 브랜드 로스터에서 suffix 변형 매칭. 매칭 키 반환 or None.
    D타워점⊂광화문D타워점 같은 부분포함 + bigram 유사도(>0.55)."""
    suffix = norm_suffix(suffix)
    best, bestsim = None, 0.0
    for k, meta in roster.items():
        if meta["brand"] != brand:
            continue
        rs = meta["suffix"]
        if not rs or not suffix:
            continue
        if suffix in rs or rs in suffix:
            return k
        a, b = _bigrams(suffix), _bigrams(rs)
        sim = len(a & b) / len(a | b) if (a | b) else 0
        if sim > bestsim:
            best, bestsim = k, sim
    return best if bestsim >= 0.55 else None


# ---------- 엑셀 '서비스' 시트: 1~5월 기존 등급 ----------
RAW_CACHE = os.path.join(HERE, "kpi_service_raw.json")   # 1~5월 고정 이력 캐시(DRM 의존 제거)
RAW_TSV = os.path.join(HERE, "kpi_service_raw.tsv")
PS1 = os.path.join(HERE, "extract_kpi_excel.ps1")
FINAL_CACHE = os.path.join(HERE, "kpi_finalized.json")   # 확정(동결)된 월별 등급 — 월 1회 확정, 이후 불변


def _finalize_due(mon):
    """mon('2026-06')이 익월 FINALIZE_DAY(5일)을 지나 확정 시점인가."""
    y, m = int(mon[:4]), int(mon[5:7])
    ny, nm = (y + 1, 1) if m == 12 else (y, m + 1)
    return datetime.date.today() >= datetime.date(ny, nm, FINALIZE_DAY)


def _parse_service_record(org, mgr, cells):
    """cells: [s1,g1,s2,g2,...] (24) → {'org','mgr','months'}."""
    months = {}
    for mi in range(12):
        sc = cells[mi * 2] if mi * 2 < len(cells) else None
        gr = cells[mi * 2 + 1] if mi * 2 + 1 < len(cells) else None
        if sc in (None, "") and gr in (None, ""):
            continue
        try:
            sc = int(float(sc)) if sc not in (None, "") else None
        except (TypeError, ValueError):
            sc = None
        months[f"2026-{mi+1:02d}"] = {"score": sc, "grade": (str(gr).strip() if gr not in (None, "") else None)}
    return {"org": str(org).strip(), "mgr": (str(mgr).strip() if mgr else ""), "months": months}


def _read_service_rows():
    """서비스 시트 원행 → [{'org','mgr','months'}]. 캐시 우선, 없으면 openpyxl(평문)→PowerShell Excel COM(DRM)."""
    if os.path.exists(RAW_CACHE):
        with open(RAW_CACHE, encoding="utf-8") as f:
            return json.load(f)
    rows = None
    try:  # 1) 평문 xlsx
        import openpyxl
        ws = openpyxl.load_workbook(XLSX, data_only=True)["서비스"]
        rows = [_parse_service_record(r[1], r[2], list(r[3:27]))
                for r in ws.iter_rows(min_row=5, values_only=True)
                if r[1] and not str(r[1]).startswith("▣") and r[1] != "조직"]
    except Exception as e:
        print(f"[i] openpyxl 실패({type(e).__name__}) — DRM 추정. Excel COM(PowerShell)로 추출 시도")
        rows = None
    if not rows:  # 2) DRM → PowerShell Excel COM
        import subprocess
        r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS1],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if not os.path.exists(RAW_TSV):
            raise SystemExit(f"[ERR] 엑셀 추출 실패(DRM 해제 환경에서 실행 필요): {r.stdout} {(r.stderr or '')[-300:]}")
        rows = []
        with open(RAW_TSV, encoding="utf-8") as f:
            for line in f:
                p = line.rstrip("\n").split("\t")
                if len(p) >= 2:
                    rows.append(_parse_service_record(p[0], p[1], p[2:26]))
    with open(RAW_CACHE, "w", encoding="utf-8") as f:   # 1~5월 고정 → 캐시
        json.dump(rows, f, ensure_ascii=False)
    return rows


def load_excel_service():
    """{canon_key: {'label','brand','운영담당','months':{'2026-0M':{'score','grade'}}}}.
    키는 매 실행 시 최신 STORE_ALIAS로 재계산 (캐시는 원행만 보관)."""
    out = {}
    for rec in _read_service_rows():
        m = re.match(r"^([A-Za-z]+)\.(.+)$", rec["org"])
        if m:
            brand = EXCEL_PREFIX.get(m.group(1), m.group(1)); suffix = m.group(2)
        else:
            brand, suffix = "", rec["org"]
        out[key_of(brand, suffix)] = {
            "label": f"{canon_brand(brand)}·{suffix}", "brand": canon_brand(brand),
            "운영담당": rec["mgr"], "months": rec["months"],
        }
    return out


# ---------- 6월~ 산출: 리뷰3종 종합 불만율 ----------
def review_store_month(reviews):
    """{canon_key: {mon:{'total','불만'}}}  (네이버+캐치테이블)"""
    out = {}
    for store, mm in reviews.get("store_month", {}).items():
        if "·" in store:
            brand, suffix = store.split("·", 1)
        else:
            brand, suffix = "", store
        k = key_of(brand, suffix)
        cur = out.setdefault(k, {})
        for mon, v in mm.items():
            cur[mon] = {"total": v.get("total", 0), "불만": v.get("불만", 0)}
    return out


def voc_store_month(voc, roster):
    """{roster_key: {mon:{'total','불만'}}}  (고객의 소리; 불만 category만 불만 카운트)
    VOC 표기가 지저분해(brand=Chai인데 매장명=Chai797…) 키 정규화+별칭+퍼지로 로스터에 정합."""
    out = {}
    for rec in voc.get("records", []):
        store = rec.get("store", ""); brand = rec.get("brand", "")
        mon = rec.get("month", "")
        if not mon:
            continue
        suffix = store[len(brand):] if brand and store.startswith(brand) else store
        k = key_of(brand, suffix)
        if k not in roster:  # 정규화·별칭으로 안 맞으면 퍼지 폴백
            fk = fuzzy_match(canon_brand(brand), norm_suffix(suffix), roster)
            if fk:
                k = fk
        cur = out.setdefault(k, {}).setdefault(mon, {"total": 0, "불만": 0})
        cur["total"] += 1
        if rec.get("category") == "불만":
            cur["불만"] += 1
    return out


def assign_grades(rows):
    """rows: [{'key','불만율' or None, ...}] → grade/score 부여(정원제).
    불만율 낮은 순 S..A..(B)..C..D. 데이터 없는(불만율 None) 매장은 B 고정(순위 제외)."""
    ranked = [r for r in rows if r["불만율"] is not None]
    unranked = [r for r in rows if r["불만율"] is None]
    # 동률은 리뷰수 많은 쪽을 신뢰(총량 큰 매장이 표본 안정) → 2차 정렬키
    ranked.sort(key=lambda r: (r["불만율"], -r.get("_total", 0)))
    n = len(ranked)
    sq = QUOTA["S"] + QUOTA["A"] + QUOTA["C"] + QUOTA["D"]
    if n <= sq * 1.5:
        # 표본 매장이 적은 얇은 달(진행중 당월 등): 정원을 비례 축소해 B가 다수 유지
        scale = (n / 3) / sq if sq else 0
        s = round(QUOTA["S"] * scale); a = round(QUOTA["A"] * scale)
        c = round(QUOTA["C"] * scale); d = round(QUOTA["D"] * scale)
    else:
        s, a, c, d = QUOTA["S"], QUOTA["A"], QUOTA["C"], QUOTA["D"]
    for i, r in enumerate(ranked):
        if i < s:
            g = "S"
        elif i < s + a:
            g = "A"
        elif i >= n - d:
            g = "D"
        elif i >= n - d - c:
            g = "C"
        else:
            g = "B"
        r["grade"] = g; r["score"] = GRADE_SCORE[g]
    for r in unranked:
        r["grade"] = "B"; r["score"] = GRADE_SCORE["B"]
        r["_no_data"] = True
    return ranked + unranked


def compute_month(mon, roster, rev_sm, voc_sm, excel):
    """한 달치 산출 행 목록."""
    rows = []
    for k, meta in roster.items():
        rv = rev_sm.get(k, {}).get(mon, {"total": 0, "불만": 0})
        vc = voc_sm.get(k, {}).get(mon, {"total": 0, "불만": 0})
        total = rv["total"] + vc["total"]
        comp = rv["불만"] + vc["불만"]
        # 최소표본 미만은 순위 제외(rate=None) → B. 완전 무데이터와 구분 위해 low_sample 표시.
        rate = round(comp / total * 100, 2) if total >= MIN_SAMPLE else None
        # 운영담당 라벨은 엑셀에서 보강
        ex = excel.get(k, {})
        rows.append({
            "key": k, "store": meta["store"], "brand": meta["brand"],
            "운영담당": ex.get("운영담당", ""),
            "reviews_total": rv["total"], "voc_total": vc["total"],
            "복합": total, "불만": comp, "불만율": rate, "_total": total,
        })
    rows = assign_grades(rows)
    for r in rows:
        r.pop("key", None); r.pop("_total", None)
    return rows


def main():
    reviews, voc = load_reviews_voc()
    eck_list, eck_latest = load_eck_roster()
    excel = load_excel_service()
    rev_sm = review_store_month(reviews)

    # 기준 신원 = 엑셀(1~5월 KPI 이력) ∪ 리뷰(온라인 활동). 표기 깔끔·상호 82/87 일치.
    # 리뷰명 우선(현행 운영명 표시) → 엑셀은 없는 매장만 보강.
    roster = {}
    for store in reviews.get("store_month", {}):
        brand, suffix = store.split("·", 1) if "·" in store else ("", store)
        k = key_of(brand, suffix)
        roster.setdefault(k, {"store": store, "brand": canon_brand(brand),
                              "suffix": norm_suffix(suffix)})
    for k, m in excel.items():
        roster.setdefault(k, {"store": m["label"], "brand": m["brand"], "suffix": k.split("|", 1)[1]})

    # ECK 신규 매장: 로스터에 없고 퍼지 매칭도 안 되는 것만 진짜 신규로 추가
    new_stores, variant_resolved = [], 0
    for st in eck_list:
        if st["key"] in STORE_EXCLUDE:
            continue
        if st["key"] in roster:
            continue
        if fuzzy_match(st["brand"], st["suffix"], roster):
            variant_resolved += 1
            continue
        roster[st["key"]] = {"store": st["store"], "brand": st["brand"], "suffix": st["suffix"]}
        new_stores.append(st["store"])
    new_stores.sort()

    # 제외 매장(폐점·없는 매장) 제거 — 엑셀/리뷰 경유로 들어온 것도 정리
    for k in list(roster):
        if k in STORE_EXCLUDE:
            del roster[k]

    # 로스터 확정 후 VOC를 정합(퍼지 폴백 포함)
    voc_sm = voc_store_month(voc, roster)

    # 산출 대상 월: 엑셀(1~5월) + 리뷰데이터 있는 6월 이후
    excel_months = set()
    for m in excel.values():
        excel_months |= set(m["months"].keys())
    excel_months = {mm for mm in excel_months if mm <= "2026-05"}
    computed_months = set()
    for k in set(list(rev_sm) + list(voc_sm)):
        for mon in list(rev_sm.get(k, {}).keys()) + list(voc_sm.get(k, {}).keys()):
            if mon >= "2026-06":
                computed_months.add(mon)

    by_month = {}
    # 1~5월: 엑셀 그대로
    for mon in sorted(excel_months):
        rows = []
        for k, meta in roster.items():
            ex = excel.get(k)
            mm = ex["months"].get(mon) if ex else None
            if not mm or (mm.get("score") is None and mm.get("grade") is None):
                continue
            rows.append({
                "store": meta["store"], "brand": meta["brand"],
                "운영담당": ex.get("운영담당", ""),
                "reviews_total": None, "voc_total": None, "복합": None,
                "불만": None, "불만율": None,
                "grade": mm.get("grade"), "score": mm.get("score"),
            })
        # 등급 순 정렬(S→D)
        order = {"S": 0, "A": 1, "B": 2, "C": 3, "D": 4}
        rows.sort(key=lambda r: (order.get(r.get("grade"), 9), -(r.get("score") or 0)))
        by_month[mon] = {"source": "excel", "rows": rows}

    # 6월~: 산출. 월 등급은 익월 5일에 1회 확정(동결) → 이후 재계산 안 함.
    #   확정 전(진행중·유예기간)만 매 실행 재계산하며 '집계중'으로 표시.
    finalized = {}
    if os.path.exists(FINAL_CACHE):
        with open(FINAL_CACHE, encoding="utf-8") as f:
            finalized = json.load(f)
    final_changed = False
    for mon in sorted(computed_months):
        if mon in finalized:                       # 이미 확정된 달 → 동결본 그대로
            by_month[mon] = finalized[mon]
            continue
        rows = compute_month(mon, roster, rev_sm, voc_sm, excel)
        order = {"S": 0, "A": 1, "B": 2, "C": 3, "D": 4}
        rows.sort(key=lambda r: (order.get(r.get("grade"), 9), (r.get("불만율") if r.get("불만율") is not None else 999)))
        due = _finalize_due(mon)                    # 익월 5일 지남 → 확정 시점
        by_month[mon] = {"source": "computed", "provisional": (not due), "rows": rows}
        if due:                                     # 확정: 1회 동결 저장
            entry = dict(by_month[mon])
            entry["finalized_at"] = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
            finalized[mon] = entry
            final_changed = True
    if final_changed:
        with open(FINAL_CACHE, "w", encoding="utf-8") as f:
            json.dump(finalized, f, ensure_ascii=False)

    months = sorted(by_month.keys())
    # 확정 최신월(잠정 아닌) = 대시보드 기본 표시월
    confirmed = [m for m in months if not by_month[m].get("provisional")]
    default_month = confirmed[-1] if confirmed else (months[-1] if months else None)

    # 다운로드용 순서(원본 '서비스' 시트 재현): 브랜드 그룹 원본순서 + 신규는 각 브랜드 끝에 삽입
    order_keys = [k for k in excel if k in roster]           # 엑셀에 있던 액티브(원본 순서)
    for k in roster:                                         # 신규(엑셀에 없던) 액티브 → 브랜드 끝
        if k in excel:
            continue
        brand = roster[k]["brand"]
        pos = None
        for i, kk in enumerate(order_keys):
            if roster[kk]["brand"] == brand:
                pos = i
        order_keys.append(k) if pos is None else order_keys.insert(pos + 1, k)
    download_order = [roster[k]["store"] for k in order_keys]

    # 폐점 매장(다운로드 하단 블록): 1~5월 엑셀값 유지, 6월~ 공란(신규 조건 미적용)
    closed_out = []
    for k in excel:                                          # 엑셀 등장 순서
        if k in STORE_CLOSED:
            ex = excel[k]
            closed_out.append({"store": ex["label"], "brand": ex["brand"],
                               "운영담당": ex.get("운영담당", ""),
                               "months": {m: v for m, v in ex["months"].items() if m <= "2026-05"}})
    criteria = [
        {"grade": "S", "score": "100", "desc": "탁월", "quota": QUOTA["S"]},
        {"grade": "A", "score": "90~99", "desc": "우수", "quota": QUOTA["A"]},
        {"grade": "B", "score": "80~89", "desc": "목표", "quota": "나머지"},
        {"grade": "C", "score": "70~79", "desc": "미흡", "quota": QUOTA["C"]},
        {"grade": "D", "score": "69 이하", "desc": "저조", "quota": QUOTA["D"]},
    ]
    out = {
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "months": months,
        "current_month": months[-1] if months else None,
        "default_month": default_month,
        "min_sample": MIN_SAMPLE,
        "criteria": criteria,
        "rule": "리뷰 대비 불만율(네이버+캐치테이블+VOC) 오름차순 → S3·A4·B(나머지)·C4·D4",
        "roster_source": f"ECK CS {eck_latest}" if eck_latest else "취합 엑셀",
        "new_stores": new_stores,
        "download_order": download_order,
        "closed": closed_out,
        "by_month": by_month,
    }
    with open(os.path.join(HERE, "kpi_data.js"), "w", encoding="utf-8") as f:
        f.write("window.KPI_DATA = " + json.dumps(out, ensure_ascii=False) + ";\n")

    # --- 리포트 ---
    print(f"[OK] kpi_data.js 생성 — {len(months)}개월 {months}")
    print(f"     로스터: 엑셀∪리뷰 기준 {len(roster)}개 매장 (ECK 변형 {variant_resolved}건 기존매장에 병합)")
    if new_stores:
        print(f"     ECK 신규매장({len(new_stores)}): {new_stores}")
    voc_unmatched = sorted(k for k in voc_sm if k not in roster and k not in STORE_EXCLUDE)
    if voc_unmatched:
        print(f"     ⚠ 로스터에 없는 VOC 매장키({len(voc_unmatched)}) — 별칭 필요 가능: {voc_unmatched}")
    for mon in months:
        info = by_month[mon]
        from collections import Counter
        c = Counter(r["grade"] for r in info["rows"] if r.get("grade"))
        nod = sum(1 for r in info["rows"] if r.get("_no_data"))
        tag = "엑셀" if info["source"] == "excel" else "산출"
        extra = f" (데이터無 {nod})" if nod else ""
        print(f"     {mon} [{tag}] {len(info['rows'])}개  등급 S{c['S']}/A{c['A']}/B{c['B']}/C{c['C']}/D{c['D']}{extra}")


if __name__ == "__main__":
    main()
