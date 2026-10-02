# -*- coding: utf-8 -*-
r"""
매장 자가점검 현황 ⑦ 월별 캠페인 교육자료 → campaign_data.js + assets/campaign/

원본 폴더: C:\Users\owner\Desktop\교육팀\11. 월별 캠페인_서비스중점업무\
  - 26.MM\*.pdf             : 캠페인 포스터 + 1장 서비스 교육자료 (보안 해제본 = 평문 PDF)
  - 캠페인 메뉴얼\N월\*.jpg  : KNOCK 온 더 SL&C 통합캠페인 포스터 (2~7월, 평문)
  - 26.MM\*.pptx            : 같은 내용의 원본 PPT (Fasoo DRM)

이미지는 평문 PDF 페이지를 렌더한다. PDF 텍스트는 글자 간격 때문에 띄어쓰기가 사라지므로
응대 스크립트(멘트)·원문 텍스트는 PPT 원본에서 뽑는다 — campaign_extract.ps1 이 PowerPoint
개체 모델로 도형 텍스트를 읽어 data/campaign/<YYYY-MM>_<n>.json 에 덤프(커밋 금지, data/).
PowerPoint 는 Start-Process 로 정상 실행해야 DRM 파일이 열린다(COM 단독 Open 은 E_FAIL).

사용: python campaign_build.py            # 있는 PDF·JSON 으로 빌드
      python campaign_build.py --extract  # 없는 달 JSON 을 PowerPoint 로 추출(대화형 세션)
새 달: MONTHS 에 한 줄 추가 → --extract → build_share.py → deploy_site.py
"""
import datetime
import io
import json
import os
import re
import subprocess
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"C:\Users\owner\Desktop\교육팀\11. 월별 캠페인_서비스중점업무"
SRC_JSON = os.path.join(HERE, "data", "campaign")
OUT_IMG = os.path.join(HERE, "assets", "campaign")
OUT_JS = os.path.join(HERE, "campaign_data.js")

# items: (제목, 평문 PDF, 포스터 페이지(0부터), 교육자료 페이지, 원본 PPTX, PPT 교육자료 슬라이드 번호)
MONTHS = [
    dict(ym="2026-02", label="2월", kind="서비스 집중 캠페인", theme="인사 응대",
         knock="캠페인 메뉴얼/2월/삼천리 포스터_2월_2차 시안.jpg",
         items=[("인사 응대", "26.02/2026_2월 서비스집중캠페인_인사응대.pdf", 0, 1,
                 "26.02/2026_2월 서비스집중캠페인_인사응대.pptx", 2)]),
    dict(ym="2026-03", label="3월", kind="서비스 집중 캠페인", theme="미소 · 주문 마무리 응대",
         knock="캠페인 메뉴얼/3월/3월-통합캠페인 포스터 [최종].jpg",
         items=[("미소", "26.03/2026_3월 서비스집중캠페인_미소 보안.pdf", 0, 1,
                 "26.03/2026_3월 서비스집중캠페인_미소.pptx", 2),
                ("주문 · 마무리 응대", "26.03/2026_3월 서비스집중캠페인_주문_마무리응대 보안.pdf", 0, 1,
                 "26.03/2026_3월 서비스집중캠페인_주문_마무리응대.pptx", 2)]),
    dict(ym="2026-04", label="4월", kind="QSC·안전 4대 캠페인", theme="음식 제공",
         knock="캠페인 메뉴얼/4월/4월 통합캠페인 포스터.jpg",
         items=[("음식 제공", "26.04/2026_4월 QSC안전 4대 캠페인, 교육자료.pdf", 0, 1,
                 "26.04/2026_4월 QSC안전 4대 캠페인, 교육자료.pptx", 3)]),
    dict(ym="2026-05", label="5월", kind="QSC·안전 4대 캠페인", theme="테이블 정리",
         knock="캠페인 메뉴얼/5월/5월 캠페인 포스터 (최종).jpg",
         items=[("테이블 정리", "26.05/2026_5월 QSC안전 4대 캠페인 교육자료.pdf", 1, 2,
                 "26.05/2026_5월 QSC안전 4대 캠페인, 교육자료.pptx", 3)]),
    dict(ym="2026-06", label="6월", kind="QSC·안전 4대 캠페인", theme="마지막 인사 · 배웅",
         knock="캠페인 메뉴얼/6월/삼천리 SL&C_캠페인-6월.jpg",
         items=[("마지막 인사", "26.06/2026_6월 QSC안전 4대 캠페인, 교육자료.pdf", 1, 2,
                 "26.06/2026_6월 QSC안전 4대 캠페인, 교육자료.pptx", 3)]),
    dict(ym="2026-07", label="7월", kind="QSCS 통합 캠페인", theme="올바른 고객 응대",
         knock="캠페인 메뉴얼/7월/7월 통합캠페인 포스터 (최종).jpg",
         items=[("올바른 고객 응대", "26.07/2026_7월 QSC안전 4대 캠페인, 교육자료.pdf", 1, 2,
                 "26.07/2026_7월 QSC안전 4대 캠페인, 교육자료.pptx", 3)]),
    dict(ym="2026-08", label="8월", kind="QSCS 통합 캠페인", theme="대기 고객 안내",
         items=[("대기 고객 안내", "26.08/QSCS_8월_통합캠페인.pdf", 1, 2,
                 "26.08/QSCS_8월_통합캠페인.pptx", 3)]),
    dict(ym="2026-09", label="9월", kind="QSCS 통합 캠페인", theme="주문 확인 · 추가 서비스",
         items=[("주문 확인 · 추가 서비스", "26.09/QSCS_9월_통합캠페인.pdf", 1, 2,
                 "26.09/QSCS_9월_통합캠페인.pptx", 3)]),
    dict(ym="2026-10", label="10월", kind="QSCS 통합 캠페인", theme="음식 제공 응대 스크립트",
         items=[("음식 제공 응대 스크립트", "26.10/QSCS_10월_통합캠페인.pdf", 1, 2,
                 "26.10/QSCS_10월_통합캠페인.pptx", 3)]),
]

DRM_MAGIC = b"\x9b DRMONE"
POSTER_W = 820
EDU_W = 1150
QUOTE = re.compile(r"[“\"＂]\s*([^“”\"＂]{4,}?)\s*[”“\"＂]")   # 원본에 닫는 따옴표를 “ 로 쓴 곳이 있음

# 따옴표 안이지만 '응대 멘트'가 아닌 것 — 슬로건·직원 속생각 (멘트 목록에서 제외)
NOT_SCRIPT = {"설명 없는 대기는 불만이 된다.", "왜 기다리는지", "모른 채 기다리는 시간",
              "음식을 놓는 순간 서비스가 완성된다", "내 주문이 정확히 들어갔다",
              "고객님이 들어오셨다.", "물이 부족해 보인다.", "빠른 정리가 다음 고객 경험을 만든다",
              "빠른 것 보다 정확한 타이밍이 중요하다", "인사가 곧 경쟁력입니다",
              "이렇게 도와드리겠습니다", "정리안된 테이블은 WORST, 정리된 테이블은 BEST!",
              "함께 많이 드시는 메뉴"}
# 교육자료가 '이렇게 말하지 말 것'으로 든 나쁜 예 — 목록에 ✕ 로 표시
BAD_SCRIPT = {"몰라요.", "기다리세요.", "그건 안 됩니다.", "아까 말씀드렸는데요.",
              "네, 다 되셨죠?", "냉면 2개 맞으시죠?", "그건 좀 오래 걸려요.", "그 메뉴 주문 안 하셨는데요.",
              "나왔습니다"}
_key = lambda q: re.sub(r"\W", "", q)
NOT_SCRIPT = {_key(x) for x in NOT_SCRIPT}
BAD_SCRIPT = {_key(x) for x in BAD_SCRIPT}


def is_drm(path):
    with open(path, "rb") as f:
        return f.read(8) == DRM_MAGIC


def save_jpg(im, name, width):
    from PIL import Image
    im = im.convert("RGB")
    if im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    im.save(os.path.join(OUT_IMG, name), "JPEG", quality=74, optimize=True, progressive=True)
    return "assets/campaign/" + name


def render_page(doc, pg, width):
    from PIL import Image
    page = doc[pg]
    zoom = width / page.rect.width * 1.0
    import fitz
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    return Image.frombytes("RGB", (pix.width, pix.height), pix.samples)


def norm(t):
    t = t.replace("\x0b", "\n").replace("\r", "\n")
    return "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in t.split("\n")).strip()


def slide_text(dump, idx):
    """교육자료 슬라이드 도형 텍스트를 읽는 순서(위→아래, 왼→오)로. 표는 행 단위."""
    s = next(x for x in dump["slides"] if x["idx"] == idx)
    shapes = s["shapes"] if isinstance(s["shapes"], list) else [s["shapes"]]
    blocks = []
    for x in shapes:
        if x.get("table"):
            for row in x["table"]:
                row = row if isinstance(row, list) else [row]
                cells = [norm(c).replace("\n", " ") for c in row if c and norm(c)]
                if cells:
                    blocks.append((x["t"], x["l"], " | ".join(cells)))
        elif x.get("text") and norm(x["text"]):
            blocks.append((x["t"], x["l"], norm(x["text"])))
    # 같은 줄(±6pt)은 왼쪽부터
    blocks.sort(key=lambda b: (round(b[0] / 6), b[1]))
    return [b[2] for b in blocks]


def scripts_of(lines):
    """따옴표 멘트 → [[멘트, 0=권장/1=나쁜 예]]"""
    out, seen = [], set()
    for l in lines:
        for m in QUOTE.finditer(l.replace("\n", " ")):
            q = re.sub(r"\s+", " ", m.group(1)).strip()
            k = _key(q)
            if len(k) < 4 or k in seen or k in NOT_SCRIPT:
                continue
            seen.add(k)
            out.append([q, 1 if k in BAD_SCRIPT else 0])
    return out


def _line_text(l, k=0.12):
    """PDF 는 글자 간격 배치라 공백 문자가 없다 → 글자 bbox 간격으로 띄어쓰기 복원."""
    s, prev = "", None
    for sp in l["spans"]:
        for c in sp["chars"]:
            ch = c["c"]
            if prev is not None and ch != " " and not s.endswith(" ") and c["bbox"][0] - prev > sp["size"] * k:
                s += " "
            s += ch
            prev = c["bbox"][2]
    return " ".join(s.split())


def pdf_text(page):
    """PPT 표가 임베디드 개체라 텍스트를 못 읽는 달(2~5월)용 — PDF 블록 텍스트."""
    out = []
    for b in page.get_text("rawdict")["blocks"]:
        ls = [x for x in (_line_text(l) for l in b.get("lines", [])) if x]
        if not ls:
            continue
        t = ls[0]
        for x in ls[1:]:     # 한글 줄바꿈은 글자 단위 → 붙이고, 그 외는 공백
            t += ("" if re.match(r"[가-힣]", x) and re.search(r"[가-힣]$", t) else " ") + x
        t = re.sub(r"\s+([.,?!])", r"\1", t)
        t = re.sub(r"([“‘(])\s+", r"\1", t)
        t = re.sub(r"\s+([”’)])", r"\1", t)
        out.append((b["bbox"][1], b["bbox"][0], t))
    out.sort(key=lambda b: (round(b[0] / 6), b[1]))
    return [b[2] for b in out]


def extract(ym, n, rel):
    out = os.path.join(SRC_JSON, f"{ym}_{n}.json")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                        os.path.join(HERE, "campaign_extract.ps1"),
                        "-src", os.path.join(ROOT, rel), "-out", out],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    print("    추출:", ((r.stdout or r.stderr).strip().splitlines() or [""])[-1])


def main():
    import fitz
    from PIL import Image
    os.makedirs(OUT_IMG, exist_ok=True)
    do_extract = "--extract" in sys.argv
    months = []
    for m in MONTHS:
        ym = m["ym"]
        rec = {k: m[k] for k in ("ym", "label", "kind", "theme")}
        print(f"[{ym}] {m['theme']}")
        posters, edus = [], []
        for n, (title, pdf, ppg, epg, pptx, slide) in enumerate(m["items"], 1):
            path = os.path.join(ROOT, pdf)
            e = {"title": title, "src": pdf.replace("/", " › ")}
            doc = None
            if os.path.exists(path) and not is_drm(path):
                doc = fitz.open(path)
                posters.append({"title": f"{title} 캠페인 포스터" if len(m["items"]) > 1 else "캠페인 포스터",
                                "img": save_jpg(render_page(doc, ppg, POSTER_W), f"{ym}_poster{n}.jpg", POSTER_W),
                                "src": e["src"]})
                e["img"] = save_jpg(render_page(doc, epg, EDU_W), f"{ym}_edu{n}.jpg", EDU_W)
            else:
                print(f"    ⚠ 평문 PDF 아님(DRM) — 이미지 생략: {pdf}")
            jp = os.path.join(SRC_JSON, f"{ym}_{n}.json")
            if not os.path.exists(jp) and do_extract:
                extract(ym, n, pptx)
            lines = []
            if os.path.exists(jp):
                lines = slide_text(json.load(open(jp, encoding="utf-8-sig")), slide)
            if len(lines) < 10 and doc is not None:       # PPT 표가 개체(OLE)라 텍스트가 비면 PDF 로
                lines = pdf_text(doc[epg])
            if lines:
                e["text"] = lines
                e["scripts"] = scripts_of(lines)
                print(f"    {title}: 멘트 {len(e['scripts'])}개 · 텍스트 {len(lines)}블록")
            else:
                print(f"    ⚠ 텍스트 JSON 없음 → python campaign_build.py --extract")
            edus.append(e)
        if m.get("knock"):
            kp = os.path.join(ROOT, m["knock"])
            if os.path.exists(kp) and not is_drm(kp):
                posters.append({"title": "KNOCK 온 더 SL&C 통합캠페인 포스터",
                                "img": save_jpg(Image.open(kp), f"{ym}_knock.jpg", POSTER_W),
                                "src": m["knock"].replace("/", " › ")})
        rec["posters"], rec["edu"] = posters, edus
        months.append(rec)

    payload = {"generated": datetime.date.today().isoformat(), "months": months}
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("/* 자동 생성: campaign_build.py — 직접 수정 금지 */\n")
        f.write("window.CAMPAIGN=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    size = sum(os.path.getsize(os.path.join(OUT_IMG, x)) for x in os.listdir(OUT_IMG))
    print(f"[OK] campaign_data.js ({os.path.getsize(OUT_JS)/1024:,.0f} KB) · 이미지 {size/1024/1024:.1f} MB · {len(months)}개월")


if __name__ == "__main__":
    main()
