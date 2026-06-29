# -*- coding: utf-8 -*-
"""
data/eck/cs_{month}.xlsx (코드60 CS 체크리스트) + qscs_{month}.xlsx (코드59 QSCS 교육일지)
를 모두 스캔·파싱해 대시보드용 eck_data.js (window.ECK_DATA, 월별 구조) 생성.

사용:
  python eck/eck_build.py     # data/eck/ 의 모든 월(cs_*/qscs_*) 자동 집계
"""
import sys, io, os, json, glob, datetime, calendar, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import warnings; warnings.filterwarnings("ignore")
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data", "eck")
OUTJS = os.path.join(ROOT, "eck_data.js")

HEADER_TOKENS = ("매장명",)
SKIP_TOKENS = ("현황", "조회년월", "nan")


def is_xlsx(path):
    """진짜 xlsx(zip, PK 매직)인지. 사내 DRM(DRMONE)으로 재암호화된 파일은 거른다."""
    try:
        with open(path, "rb") as f:
            return f.read(4) == b"PK\x03\x04"
    except OSError:
        return False


def load_prior():
    """직전에 생성된 eck_data.js를 파싱해 월별 cs/qscs 캐시로 반환.
    DRM 잠긴 과거월은 다시 파싱 못 하므로 마지막 정상값을 유지하는 fallback."""
    if not os.path.exists(OUTJS):
        return None
    try:
        txt = open(OUTJS, encoding="utf-8").read()
        s, e = txt.index("{"), txt.rstrip().rstrip(";").rindex("}") + 1
        return json.loads(txt[s:e])
    except Exception:
        return None


def is_excluded(name):
    """본부/센트럴키친 매장 제외 (예: 호우섬CK). 이름이 'CK'로 끝나면 본부로 간주."""
    n = (name or "").strip()
    return n.endswith("CK")


def brand_of(store):
    s = (store or "").strip()
    u = s.upper()
    if "CHAI" in u:
        return "Chai797"
    if "호우섬" in s or "살롱드호우섬" in s:
        return "호우섬"
    if "서리재" in s:
        return "서리재"
    if "이타마에" in s:
        return "이타마에"
    if "정육점" in s:
        return "정육점"
    return s.split(" ")[0] if s else ""


def parse_cs(path):
    """행: 매장 × 일자(1..31) O/빈칸 → 매장별 일별 완료."""
    df = pd.ExcelFile(path, engine="openpyxl").parse(0, header=None)
    # 헤더행 찾기 (col0 == '매장명')
    hrow = None
    for i in range(len(df)):
        if str(df.iloc[i, 0]).strip() in HEADER_TOKENS:
            hrow = i; break
    if hrow is None:
        raise SystemExit("[ERR] CS 헤더행(매장명) 못 찾음")
    # 일자 컬럼: 헤더행에서 숫자인 칸
    day_cols = {}
    for c in range(1, df.shape[1]):
        v = str(df.iloc[hrow, c]).strip()
        try:
            d = int(float(v)); day_cols[c] = d
        except (ValueError, TypeError):
            pass
    stores = []
    for i in range(hrow + 1, len(df)):
        name = str(df.iloc[i, 0]).strip()
        if not name or name in HEADER_TOKENS or any(t in name for t in ("현황", "조회년월")) or name == "nan" or is_excluded(name):
            continue
        days = {}
        for c, d in day_cols.items():
            val = str(df.iloc[i, c]).strip().upper()
            days[d] = (val == "O")
        if not days:
            continue
        done = sum(1 for v in days.values() if v)
        stores.append({"store": name, "brand": brand_of(name),
                       "days": days, "done": done})
    return {"stores": stores, "days": sorted(set(day_cols.values()))}


def parse_qscs(path):
    """행: 등록 매장별 (작성일자/교육일시). 존재=등록."""
    df = pd.ExcelFile(path, engine="openpyxl").parse(0, header=None)
    recs = []
    for i in range(len(df)):
        name = str(df.iloc[i, 0]).strip()
        if not name or name in HEADER_TOKENS or name == "nan" or any(t in name for t in ("현황", "조회년월")) or is_excluded(name):
            continue
        # 작성일자(yyyy-mm-dd) 추출: 어느 칸이든 날짜 패턴
        date, dtime = "", ""
        for c in range(1, df.shape[1]):
            v = str(df.iloc[i, c]).strip()
            m = re.search(r"\d{4}-\d{2}-\d{2}", v)
            if m and not date:
                date = m.group(0)
            if "시" in v and "분" in v and not dtime:
                dtime = v.replace("\n", " ")
        recs.append({"store": name, "brand": brand_of(name), "date": date, "datetime": dtime})
    # 매장 중복 제거(최신 작성일자 유지)
    by = {}
    for r in recs:
        k = r["store"]
        if k not in by or (r["date"] > by[k]["date"]):
            by[k] = r
    return list(by.values())


def discover_months():
    months = set()
    for pat in ("cs_*.xlsx", "qscs_*.xlsx"):
        for f in glob.glob(os.path.join(DATA, pat)):
            m = re.search(r"(\d{4}-\d{2})\.xlsx$", f)
            if m:
                months.add(m.group(1))
    return sorted(months)


def main():
    months = discover_months()
    if not months:
        raise SystemExit("[ERR] data/eck 에 cs_*.xlsx / qscs_*.xlsx 가 없습니다. 먼저 eck_scrape.py 실행")

    prior = load_prior()           # 마지막 정상 결과(과거월 DRM 잠김 시 유지)
    prior_cs = (prior or {}).get("cs", {})
    prior_qscs = (prior or {}).get("qscs", {})
    kept = []                      # 이전 데이터로 유지한 월 (로그용)

    cs_by, qscs_by, dim_by = {}, {}, {}
    # 전 월 CS 매장 합집합 (명단 fallback)
    union_roster = []
    union_seen = set()

    parsed_cs = {}                 # mo → 파싱 결과, 또는 None(읽기 실패→이전값 유지)
    for mo in months:
        y, m = map(int, mo.split("-"))
        dim_by[mo] = calendar.monthrange(y, m)[1]
        cs_path = os.path.join(DATA, f"cs_{mo}.xlsx")
        if os.path.exists(cs_path) and is_xlsx(cs_path):
            try:
                parsed_cs[mo] = parse_cs(cs_path)
            except SystemExit:
                parsed_cs[mo] = {"stores": [], "days": []}
            except Exception as e:
                print(f"[warn] cs_{mo} 파싱 실패({type(e).__name__}) → 이전 데이터 유지")
                parsed_cs[mo] = None
        else:
            # 파일 없음 또는 DRM 재암호화(DRMONE) → 이전 정상값 유지
            parsed_cs[mo] = None
        if parsed_cs[mo]:
            for s in parsed_cs[mo]["stores"]:
                if s["store"] not in union_seen:
                    union_seen.add(s["store"]); union_roster.append(s["store"])

    for mo in months:
        # ── CS (View 5) ──
        if parsed_cs[mo]:
            cs = parsed_cs[mo]
            cs_by[mo] = {"stores": cs["stores"], "days": cs["days"], "store_count": len(cs["stores"])}
        elif mo in prior_cs:
            cs_by[mo] = prior_cs[mo]
            cs = {"stores": cs_by[mo].get("stores", []), "days": cs_by[mo].get("days", [])}
            if mo not in kept:
                kept.append(mo)
        else:
            cs = {"stores": [], "days": []}
            cs_by[mo] = {"stores": [], "days": [], "store_count": 0}

        # ── QSCS (View 6) ──
        qscs_path = os.path.join(DATA, f"qscs_{mo}.xlsx")
        if os.path.exists(qscs_path) and is_xlsx(qscs_path):
            try:
                rows = parse_qscs(qscs_path)
            except Exception as e:
                print(f"[warn] qscs_{mo} 파싱 실패({type(e).__name__}) → 이전 데이터 유지")
                rows = None
        else:
            rows = None
        if rows is None:
            # 파일 없음/DRM → 이전 정상값 유지
            if mo in prior_qscs:
                qscs_by[mo] = prior_qscs[mo]
                if mo not in kept:
                    kept.append(mo)
            else:
                qscs_by[mo] = {"registered": [], "not_registered": [], "reg_count": 0, "roster_count": 0}
            continue
        # 실제 등록 = 작성일자가 있는 행만. (리포트는 전 매장을 나열하고, 등록한 곳만 작성일자가 채워짐)
        reg = [r for r in rows if r.get("date")]
        reg_set = {r["store"] for r in reg}
        # 명단: CS 매장 ∪ QSCS에 나타난 모든 매장(작성일자 없는 행 포함)
        roster = list(dict.fromkeys(
            ([s["store"] for s in cs["stores"]] or list(union_roster)) + [r["store"] for r in rows]))
        not_reg = [{"store": s, "brand": brand_of(s)} for s in roster if s not in reg_set]
        qscs_by[mo] = {
            "registered": reg, "not_registered": not_reg,
            "reg_count": len(reg_set), "roster_count": len(roster),
        }

    payload = {
        "generated_at": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "months": months, "days_in_month": dim_by,
        "cs": cs_by, "qscs": qscs_by,
    }
    with open(OUTJS, "w", encoding="utf-8") as f:
        f.write("window.ECK_DATA = " + json.dumps(payload, ensure_ascii=False) + ";\n")

    size = os.path.getsize(OUTJS) / 1024
    print(f"[OK] eck_data.js 생성 ({size:,.0f} KB) — {len(months)}개월 {months[0]}~{months[-1]}")
    if kept:
        print(f"[keep] DRM/없음으로 이전 데이터 유지: {', '.join(kept)}")
    for mo in months:
        print(f"     {mo}  CS {cs_by[mo]['store_count']}매장×{len(cs_by[mo]['days'])}일"
              f" · QSCS 등록 {qscs_by[mo]['reg_count']}/명단 {qscs_by[mo]['roster_count']}"
              f" (미등록 {len(qscs_by[mo]['not_registered'])})")


if __name__ == "__main__":
    main()
