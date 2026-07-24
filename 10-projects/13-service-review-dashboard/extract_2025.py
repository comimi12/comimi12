# -*- coding: utf-8 -*-
"""
2025 월간 분석 워크북(온라인 리뷰_25.MM월.xlsx) → DRM 독립 캐시(_2025_cache.json).

이 PC의 워크북은 Fasoo DRM으로 수시 재암호화되어(매직 9b204452) pandas/openpyxl 이
직접 못 읽는다. Fasoo 에이전트가 살아있는 대화형 세션에서 Excel COM 으로 열면 복호화되므로,
COM 으로 TOTAL(집계) + 브랜드 시트(불만 상세)를 읽어 평문 JSON 캐시로 덤프한다.
그 뒤 build.py 는 이 캐시만 읽어 DRM 과 무관하게 동작한다.

재추출: 팀이 워크북을 갱신하면 `python extract_2025.py` 다시 실행(대화형 세션).
"""
import os, glob, re, json

HERE = os.path.dirname(os.path.abspath(__file__))
REVIEW_DIR = os.path.join(HERE, "data", "reviews")
CACHE = os.path.join(REVIEW_DIR, "_2025_cache.json")

WB_BRANDS = ["Chai", "호우섬", "서리재", "이타마에", "정육점"]


def wb_brand(sub):
    s = str(sub).replace(" ", "")
    if "정육" in s or "바른고기" in s:
        return "정육점"
    if "서리재" in s:
        return "서리재"
    if "이타" in s:
        return "이타마에"
    if "호우섬" in s:
        return "호우섬"
    return "Chai"


def store_brand_from_prefix(raw):
    """복만 상세의 매장명 접두어로 브랜드 판정 (C.=Chai, H.=호우섬, J.=정육점, S.=서리재, I.=이타마에)."""
    s = str(raw).strip()
    if "Chai797" in s or "차이" in s:
        return "Chai"
    m = re.match(r"\s*([A-Za-z])\s*[.\s]", s)
    if m:
        return {"C": "Chai", "H": "호우섬", "J": "정육점", "S": "서리재", "I": "이타마에"}.get(m.group(1).upper(), "Chai")
    for kw, b in [("호우섬", "호우섬"), ("서리재", "서리재"), ("이타", "이타마에"), ("정육", "정육점")]:
        if kw in s:
            return b
    return "Chai"


def clean_store_short(raw):
    """접두어(C./Chai797 Plus/Black/브랜드어 등) 제거 → 지점명만."""
    s = str(raw).strip()
    s = re.sub(r"^\s*[A-Za-z]\s*\.\s*", "", s)            # 'C.', 'c. '
    s = re.sub(r"Chai797(\s*Plus)?", "", s, flags=re.I)   # 'Chai797 Plus'
    s = re.sub(r"^(살롱드|샬롱드)", "", s)                  # 살롱드호우섬 → 호우섬 (아래서 제거)
    # 선행 브랜드어 제거 ('호우섬 코엑스점' → '코엑스점')
    s = re.sub(r"^(바른고기정육점|호우섬|서리재|이타마에|정육점|차이797?|차이)\s*", "", s)
    s = re.sub(r"^(Black|Dining|UCD|JUCD|CD)\s*", "", s, flags=re.I)
    return s.strip(" .·-")


def _num(x):
    try:
        return int(float(x))
    except (ValueError, TypeError):
        return None


def _cell(v):
    return "" if v is None else str(v).strip()


def parse_total(vals):
    """TOTAL 시트 배열 → (전매장 tot/bad/good, per-brand dict).
    시트마다 선행 빈열 유무로 컬럼이 1칸 밀리므로, '총 건수' 헤더 위치(TC)를 찾아 상대 인덱스로 읽는다.
    (subname=TC-1, total=TC, bad=TC+1, good=TC+2)"""
    tc = None
    for row in vals:
        for k, c in enumerate(row):
            if _cell(c).replace(" ", "") == "총건수":
                tc = k
                break
        if tc is not None:
            break
    if tc is None:
        tc = 3  # 폴백(구 레이아웃)
    sub_c, tot_c, bad_c, good_c = tc - 1, tc, tc + 1, tc + 2
    tot = bad = good = None
    per = {b: {"total": 0, "칭찬": 0, "불만": 0} for b in WB_BRANDS}
    for row in vals:
        rowtext = " ".join(_cell(c) for c in row)
        if "전매장" in rowtext and "합계" in rowtext:
            tot = _num(row[tot_c]) if tot_c < len(row) else None
            bad = _num(row[bad_c]) if bad_c < len(row) else None
            good = _num(row[good_c]) if good_c < len(row) else None
            break
        sub = _cell(row[sub_c]) if 0 <= sub_c < len(row) else ""
        rtot = _num(row[tot_c]) if 0 <= tot_c < len(row) else None
        if rtot is not None and sub and not any(x in sub for x in ("소계", "합계", "구분", "총")):
            b = wb_brand(sub)
            per[b]["total"] += rtot or 0
            per[b]["불만"] += _num(row[bad_c]) or 0
            per[b]["칭찬"] += _num(row[good_c]) or 0
    return (tot, bad, good), per


def parse_complaints(sheet_vals, month):
    """브랜드 시트 배열 → 불만 상세 레코드 리스트."""
    hr = None
    for i, row in enumerate(sheet_vals[:6]):
        j = " ".join(_cell(c) for c in row)
        if "접수일자" in j and "매장" in j:
            hr = i
            break
    if hr is None:
        return []
    hdr = [_cell(c).replace(" ", "") for c in sheet_vals[hr]]

    def ci(name):
        for k, h in enumerate(hdr):
            if name in h:
                return k
        return None

    c_st, c_op, c_dt, c_ty, c_src, c_sum = ci("매장"), ci("고객의견"), ci("접수일자"), ci("유형"), ci("출처"), ci("내용요약")
    out = []
    for row in sheet_vals[hr + 1:]:
        st = _cell(row[c_st]) if c_st is not None and c_st < len(row) else ""
        if not st or st == "nan":
            continue
        op = _cell(row[c_op]) if c_op is not None and c_op < len(row) else ""
        sm = _cell(row[c_sum]) if c_sum is not None and c_sum < len(row) else ""
        dt = _cell(row[c_dt]) if c_dt is not None and c_dt < len(row) else ""
        ty = _cell(row[c_ty]) if c_ty is not None and c_ty < len(row) else ""
        src = _cell(row[c_src]) if c_src is not None and c_src < len(row) else ""
        # 접수일자 25.01.03 → 2025-01-03
        dm = re.match(r"25[.\-/](\d{1,2})[.\-/](\d{1,2})", dt.replace(" ", ""))
        date = f"2025-{int(dm.group(1)):02d}-{int(dm.group(2)):02d}" if dm else f"{month}-01"
        out.append({
            "store_raw": st, "brand": store_brand_from_prefix(st),
            "store_short": clean_store_short(st),
            "date": date, "month": month, "type": ty,
            "source": src, "opinion": op if op != "nan" else "",
            "team_summary": sm if sm != "nan" else "",
        })
    return out


def main():
    import win32com.client as win32
    files = sorted(glob.glob(os.path.join(REVIEW_DIR, "온라인*리뷰_25.*.xlsx")))
    seen = {}
    for f in files:
        mm = re.search(r"25\.(\d{2})월", os.path.basename(f))
        if not mm:
            continue
        key = mm.group(1)
        if key not in seen or "차재환" not in os.path.basename(f):
            seen[key] = f

    xl = win32.DispatchEx("Excel.Application")
    xl.Visible = False
    xl.DisplayAlerts = False
    cache = {"months": {}, "complaints": []}
    try:
        for key in sorted(seen):
            month = f"2025-{key}"
            wb = xl.Workbooks.Open(os.path.abspath(seen[key]), 0, True)
            try:
                tvals = wb.Sheets("TOTAL").UsedRange.Value2
                (tot, bad, good), per = parse_total(tvals)
                if tot:
                    cache["months"][month] = {"total": tot, "bad": bad or 0, "good": good or 0,
                                              "brand": per}
                for ws in wb.Sheets:
                    nm = ws.Name
                    if nm in ("TOTAL", "주차별현황", "차트") or nm.startswith("Sheet"):
                        continue
                    recs = parse_complaints(ws.UsedRange.Value2, month)
                    cache["complaints"].extend(recs)
            finally:
                wb.Close(False)
            print(f"[OK] {month}: 집계 {cache['months'].get(month, {}).get('total')} · 불만상세 누계 {len(cache['complaints'])}")
    finally:
        xl.Quit()

    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=1)
    nt = sum(1 for c in cache["complaints"] if c["opinion"])
    print(f"\n[OK] {CACHE}")
    print(f"     월 집계 {len(cache['months'])}개 · 불만상세 {len(cache['complaints'])}건(원문 {nt}건)")


if __name__ == "__main__":
    main()
