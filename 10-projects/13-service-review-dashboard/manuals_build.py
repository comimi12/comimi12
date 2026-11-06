# -*- coding: utf-8 -*-
"""
서비스 매뉴얼 자료실 인덱스 생성기.

교육팀 매뉴얼 폴더(ROOT)를 훑어 문서 파일을 '자체 카테고리'로 분류하고
manuals_data.js (window.MANUALS) 를 만든다. 대시보드 사이드바 '서비스 매뉴얼' 그룹에
카테고리별 탭이 자동으로 생성된다.

사용: python manuals_build.py   →   python build_share.py → python deploy_site.py

※ 분류 규칙은 아래 CATS / classify() 만 고치면 된다. (원본 파일은 건드리지 않음)
"""
import io
import json
import os
import re
import sys
import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"C:\Users\owner\Desktop\교육팀\4. 신규매장매뉴얼, 교안"
OUT = os.path.join(HERE, "manuals_data.js")

DOC_EXT = {".pdf": "PDF", ".pptx": "PPT", ".ppt": "PPT", ".docx": "DOC",
           ".doc": "DOC", ".xlsx": "XLS", ".xls": "XLS"}

# 인덱스에서 제외할 최상위 폴더 (이미지 원본 · 전용 뷰가 따로 있는 것)
SKIP_TOP = {
    "브랜드 로고",              # 로고/이미지 원본
    "(25년) 매니저 대상 교육",   # 교육 현장 사진(jpg)만 있음
    "플로어플랜",               # 대시보드 '📐 플로어플랜' 전용 뷰가 커버
}

# ── 자체 카테고리 정의 (사이드바 '서비스 매뉴얼' 하위에 이 순서로 생성) ──
CATS = [
    ("mcs",   "🎓", "서비스 기본 · 교안",       "전 브랜드 공통 서비스 표준과 점장회의 교안·강의자료"),
    ("mvoc",  "🗣️", "VOC · 컴플레인 응대",      "고객 불만 응대 절차, 리뷰 답글, VOC 골든타임 가이드"),
    ("mmenu", "🍽️", "브랜드 메뉴 매뉴얼",       "브랜드별 신메뉴·프로모션 고객응대 매뉴얼 (연도별)"),
    ("monb",  "🆕", "입문 · 오리엔테이션",       "신규 입사자 FOH/BOH 오리엔테이션, 브랜드 입문 매뉴얼"),
    ("mopen", "🏪", "신규 오픈매장 매뉴얼",      "오픈 준비 매장별 교육자료·도면·기물·발주 자료"),
    ("mgl",   "🌐", "해외(KSC) 트레이닝",       "미국 KSC 점장·직급별 교육 문제집과 영문 워크북"),
    ("mchk",  "🧼", "위생·안전 / 현장 서식",     "위생·안전 점검표, 오픈마감 체크리스트, 매장 부착물"),
    ("mrole", "👔", "직급별 R&R · 운영관리",     "점장·실장 R&R, 일별/월별 업무, 오픈 일정 계획"),
    ("mref",  "📖", "레퍼런스 (타사·타브랜드)",   "아웃백 등 타사 매뉴얼, 외식경영 교안, 시장조사 자료"),
]

# 카테고리별 하위 그룹 표시 순서 (없는 이름은 뒤에 알파벳순)
SUB_ORDER = {
    "mmenu": ["2026년 메뉴 매뉴얼", "2024년 메뉴 매뉴얼", "멤버십·이벤트 응대", "업무연락"],
    "mopen": ["KSC (미국 브레아)", "이타마에 스시", "서리재", "차이797 올림픽공원점",
              "호우섬", "로바타와사", "공통"],
    "mgl":   ["점장교육 문제지 (0~7)", "점장교육 정답지 (0~7)", "직급별 문제·정답",
              "메뉴 테스트", "영문 워크북·시험지"],
    "mchk":  ["위생·안전 점검", "오픈·마감 체크리스트", "매장 부착물·현장 서식"],
    "mref":  ["아웃백 트레이닝 매뉴얼", "외식경영 교안·워크북", "QUIZ·시험", "운영 공통", "기타 참고"],
}

BRANDS = [
    ("CHAI797", ["chai797", "chai 797", "차이797", "차이 797", "c.김포", "c.dn", "c.메뉴판", "올공"]),
    ("호우섬",   ["호우섬"]),
    ("서리재",   ["서리재"]),
    ("정육점",   ["정육점", "바른고기"]),
    ("이타마에", ["이타마에", "itamae"]),
    ("KSC",     ["ksc"]),
    ("로바타와사", ["와사", "wasa"]),
]


def brand_of(text):
    low = text.lower()
    for name, keys in BRANDS:
        if any(k in low for k in keys):
            return name
    return ""


def year_of(text):
    m = re.search(r"\((\d{2})년\)|(\b20(2[0-9])\b)|_(2[0-6])\.\d{2}|_(2[0-6])\d{4}", text)
    if not m:
        return ""
    for g in m.groups():
        if not g:
            continue
        g = g[-2:]
        return f"20{g}"
    return ""


def has(p, *keys):
    low = p.lower()
    return any(k.lower() in low for k in keys)


def classify(rel, name):
    """(카테고리 id, 하위 그룹명) 반환. 첫 매치 우선."""
    p = rel.replace("\\", "/")
    top = p.split("/")[0]

    # ── 해외(KSC) 트레이닝 ──
    if top.startswith("해외 트레이닝가이드"):
        if has(p, "위생", "안전", "점검"):
            return "mchk", "위생·안전 점검"
        if "점장교육" in p:
            return "mgl", "점장교육 정답지 (0~7)" if has(p, "answer") else "점장교육 문제지 (0~7)"
        if "직급별" in p:
            return "mgl", "직급별 문제·정답"
        if "메뉴 테스트" in p:
            return "mgl", "메뉴 테스트"
        if "영어 번역본" in p or has(name, "_EN"):
            return "mgl", "영문 워크북·시험지"
        return "mgl", "기타"

    # ── 타브랜드(윤팀장님) 자료 ──
    if top.startswith("타브랜드"):
        if "/트레이닝/" in p:
            return "mref", "아웃백 트레이닝 매뉴얼"
        if "/QUIZ/" in p:
            return "mref", "QUIZ·시험"
        if "/운영관련/" in p:
            return "mref", "운영 공통"
        if has(p, "오픈 일정"):
            return "mrole", "오픈 계획"
        return "mref", "외식경영 교안·워크북"

    # ── 오픈매장 매뉴얼 ──
    if top == "오픈매장 매뉴얼":
        if "아웃백매뉴얼" in p:
            return "mref", "아웃백 트레이닝 매뉴얼"
        if "레퍼런스자료" in p:
            if has(p, "위생", "노로", "온도", "체크"):
                return "mchk", "위생·안전 점검"
            return "mref", "기타 참고"
        if "부착물" in p:
            return "mchk", "매장 부착물·현장 서식"
        if has(p, "체크리스트", "오픈체크"):
            return "mchk", "오픈·마감 체크리스트"
        if has(name, "오리엔테이션", "입문 매뉴얼", "입문매뉴얼"):
            return "monb", "브랜드 입문 매뉴얼"
        sub = {"KSC_US": "KSC (미국 브레아)", "WASA": "로바타와사",
               "서리재": "서리재", "이타마에 스시": "이타마에 스시",
               "차이 올림픽공원점": "차이797 올림픽공원점", "호우섬": "호우섬"}.get(
            p.split("/")[1] if "/" in p else "", "공통")
        return "mopen", sub

    # ── 서비스 교육 · 가이드북 ──
    if top.startswith("서비스 교육"):
        if has(name, "voc", "컴플레인", "리뷰 답글", "골든타임"):
            return "mvoc", "VOC·컴플레인 가이드"
        if has(name, "오리엔테이션"):
            return "monb", "FOH 오리엔테이션"
        if has(name, "risk", "위생"):
            return "mchk", "위생·안전 점검"
        if has(name, "교육 리스트"):
            return "mrole", "교육 운영"
        return "mcs", "서비스 표준 · 교안"

    # ── 메뉴 매뉴얼 ──
    if top == "메뉴 매뉴얼":
        if has(name, "멤버십", "이벤트"):
            return "mmenu", "멤버십·이벤트 응대"
        if has(name, "업무연락"):
            return "mmenu", "업무연락"
        return "mmenu", "2026년 메뉴 매뉴얼" if "26년" in p else "2024년 메뉴 매뉴얼"

    # ── (24년) 매뉴얼 ──
    if top == "(24년) 매뉴얼":
        if has(name, "오리엔테이션"):
            return "monb", "FOH 오리엔테이션"
        if has(name, "리뷰 이벤트", "리뷰이벤트", "voc", "리뷰 이벤트"):
            return "mvoc", "리뷰 이벤트·VOC 사례"
        if has(name, "업무연락"):
            return "mmenu", "업무연락"
        if has(name, "온라인-캠퍼스", "온라인 캠퍼스", "참여리스트"):
            return "mcs", "교육 운영 가이드"
        return "mmenu", "2024년 메뉴 매뉴얼"

    # ── 점장 / 실장 ──
    if top in ("점장매뉴얼", "실장매뉴얼"):
        if has(name, "체크리스트"):
            return "mchk", "오픈·마감 체크리스트"
        return "mrole", "점장 R&R" if top == "점장매뉴얼" else "실장·주방 업무"

    if top == "골프우승":
        return "mcs", "특수 상황 응대"

    # ── 최상위 낱개 파일 ──
    if has(name, "통합캠페인"):
        return "mcs", "서비스 표준 · 교안"
    if has(name, "오픈", "착공"):
        return "mrole", "오픈 계획"
    return "mcs", "기타"


TEXTDIR = os.path.join(HERE, "manuals_text")
NOISE = re.compile(r"^[\s\d\.\-·・|]*$")


def load_text(rel):
    """manuals_extract.py 가 뽑아둔 원문 텍스트 (없으면 None)."""
    p = os.path.join(TEXTDIR, rel.replace("/", "__") + ".txt")
    if not os.path.exists(p):
        return None
    try:
        with open(p, encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


def outline(txt, limit=14):
    """원문 텍스트 → (분량 표기, 목차/요약 줄 목록)."""
    if not txt:
        return "", []
    lines = []
    n = ""

    m = re.match(r"\[슬라이드 (\d+)장\]", txt)
    if m:                                   # PPT : 슬라이드별 첫 줄 = 제목
        n = f"슬라이드 {m.group(1)}장 · 원문 목차"
        for block in txt.split("--- slide ")[1:]:
            body = block.split("---", 1)[-1].strip()
            for ln in body.split("\n"):
                ln = ln.strip()
                if ln and not NOISE.match(ln) and len(ln) > 1:
                    lines.append(ln[:90])
                    break
    elif txt.lstrip().startswith("--- sheet:"):   # Excel : 시트 목록
        sheets = re.findall(r"--- sheet: (.+?) \((\d+)행\) ---", txt)
        n = f"시트 {len(sheets)}개"
        lines = [f"{s} ({r}행)" for s, r in sheets]
    else:                                    # Word/PDF : 앞부분 유의미한 줄
        m = re.match(r"\[(\d+)페이지\]", txt)
        if m:
            n = f"{m.group(1)}페이지 · 원문 앞부분"
        else:
            n = "원문 앞부분"
        seen = set()
        for ln in txt.split("\n"):
            ln = ln.strip()
            if len(ln) < 3 or NOISE.match(ln) or ln in seen:
                continue
            seen.add(ln)
            lines.append(ln[:90])
            if len(lines) >= limit * 2:
                break

    # 중복 제거 + 상한
    out, seen = [], set()
    for ln in lines:
        k = re.sub(r"\s+", "", ln)
        if k in seen:
            continue
        seen.add(k)
        out.append(ln)
        if len(out) >= limit:
            out.append("… (이하 원본 참조)")
            break
    return n, out


def clean_title(stem):
    t = stem.strip()
    t = re.sub(r"^\(\d{2}년\)\s*", "", t)
    t = re.sub(r"^\d+[-.]?\d*\.?\s+", "", t)
    t = re.sub(r"\s*\(\d+\)$", "", t)          # "(1)" 중복 사본 표기
    t = re.sub(r"\s{2,}", " ", t).strip()
    return t or stem


def main():
    if not os.path.isdir(ROOT):
        raise SystemExit(f"[ERR] 매뉴얼 폴더를 찾을 수 없습니다: {ROOT}")

    merged = {}   # (cat, sub, title_key) → item
    scanned = skipped = 0

    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT)
        top = "." if rel_dir == "." else rel_dir.replace("\\", "/").split("/")[0]
        if top in SKIP_TOP:
            dirnames[:] = []
            continue
        for fn in filenames:
            if fn.startswith("~$"):
                continue
            stem, ext = os.path.splitext(fn)
            kind = DOC_EXT.get(ext.lower())
            if not kind:
                skipped += 1
                continue
            rel = fn if rel_dir == "." else os.path.join(rel_dir, fn)
            full = os.path.join(dirpath, fn)
            try:
                st = os.stat(full)
            except OSError:
                continue
            scanned += 1
            cat, sub = classify(rel, fn)
            title = clean_title(stem)
            key = (cat, sub, re.sub(r"\s+", "", title.lower()))
            it = merged.get(key)
            if it is None:
                merged[key] = {
                    "t": title,
                    "b": brand_of(rel),
                    "y": year_of(rel),
                    "f": [kind],
                    "sz": st.st_size,
                    "d": datetime.date.fromtimestamp(st.st_mtime).isoformat(),
                    "p": rel.replace("\\", "/"),
                    "_all": [rel.replace("\\", "/")],
                }
            else:
                if kind not in it["f"]:
                    it["f"].append(kind)
                it["sz"] = max(it["sz"], st.st_size)
                d = datetime.date.fromtimestamp(st.st_mtime).isoformat()
                if d > it["d"]:
                    it["d"] = d
                it["_all"].append(rel.replace("\\", "/"))

    # 추출된 원문 텍스트 → 항목별 목차/요약 (PPT > DOC > PDF > XLS 순으로 채택)
    PREF = {".pptx": 0, ".ppt": 1, ".docx": 2, ".doc": 3, ".pdf": 4, ".xlsx": 5, ".xls": 6}
    withtext = 0
    for it in merged.values():
        for rp in sorted(it.pop("_all"), key=lambda x: PREF.get(os.path.splitext(x)[1].lower(), 9)):
            n, lines = outline(load_text(rp))
            if lines:
                it["n"], it["s"] = n, lines
                it["p"] = rp
                withtext += 1
                break

    # 카테고리 → 하위그룹 → 항목 조립
    cats = []
    for cid, icon, name, desc in CATS:
        groups = {}
        for (c, sub, _), it in merged.items():
            if c != cid:
                continue
            groups.setdefault(sub, []).append(it)
        if not groups:
            continue
        order = SUB_ORDER.get(cid, [])

        def gkey(s):
            return (order.index(s) if s in order else len(order), s)

        subs = []
        for sub in sorted(groups, key=gkey):
            items = sorted(groups[sub], key=lambda x: (x["y"] == "", x["y"], x["t"]), reverse=False)
            for it in items:
                it["f"].sort()
            subs.append({"name": sub, "items": items})
        cats.append({"id": cid, "icon": icon, "name": name, "desc": desc,
                     "n": sum(len(s["items"]) for s in subs), "subs": subs})

    payload = {
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "root": ROOT,
        "total": sum(c["n"] for c in cats),
        "files": scanned,
        "withtext": withtext,
        "cats": cats,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.MANUALS=")
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"[OK] manuals_data.js 생성 — 문서 {scanned}건 → 항목 {payload['total']}건 "
          f"(동일 제목 PDF/PPT 병합), 이미지 등 {skipped}건 제외, 원문 목차 삽입 {withtext}건")
    for c in cats:
        print(f"   {c['icon']} {c['name']}: {c['n']}건 " +
              " / ".join(f"{s['name']}({len(s['items'])})" for s in c["subs"]))


if __name__ == "__main__":
    main()
