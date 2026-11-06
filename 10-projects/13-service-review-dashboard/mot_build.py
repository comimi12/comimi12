# -*- coding: utf-8 -*-
r"""
브랜드별 MOT 멘트 → manuals_mot.js (window.MOT).

원본 : 교육팀 「10 서비스 교육자료_브랜드별 MOT 멘트.pptx」 (전 10p, Fasoo DRM)
경로 : manuals_text/서비스 교육,가이드북__10 서비스 교육자료_브랜드별 MOT 멘트.pptx.txt
       (manuals_extract.py 가 PowerPoint COM 으로 추출. manuals_text/ 는 커밋 금지)

슬라이드가 두 가지 형식이라 나눠 파싱한다.
  A) '서비스 포인트 10 (브랜드)'  … [태그] 묶음 + '→ 권장 멘트' + '• 금지 행동'
     · 일부 슬라이드는 맨 뒤에 10단계 라벨(첫인사/주문/…)이 붙어 있어 블록과 1:1 로 매칭된다.
     · 라벨이 없는 슬라이드는 태그를 제목으로 쓴다.
     · 원본에서 '• 금지 행동'은 여러 단계를 한 칸에 묶어 둔 경우가 있어, 등장 순서 그대로 붙인다.
  B) '중점 서비스 10계명'        … 'N. 제목' + 상세 불릿. 원본은 번호가 뒤섞여 있어 번호순 정렬.

사용: python mot_build.py   →  python build_share.py  →  python deploy_site.py
"""
import io
import json
import os
import re
import sys
import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "manuals_text",
                   "서비스 교육,가이드북__10 서비스 교육자료_브랜드별 MOT 멘트.pptx.txt")
OUT = os.path.join(HERE, "manuals_mot.js")

SRC_LABEL = "교육팀 「10 서비스 교육자료_브랜드별 MOT 멘트.pptx」 (전 10p)"
TAGLINE = re.compile(r"^\[.+\]$")
NUMBERED = re.compile(r"^(\d{1,2})\.\s*(.+)$")


def clean(s):
    return s.strip().strip("“”\"＂ ").strip()


def split_tags(line):
    return [t.strip() for t in re.split(r"\]\s*,\s*\[", line.strip().strip("[]")) if t.strip()]


def is_label_like(l):
    """단계명 한 줄인가. 원본에 '[고급 서비스]'가 '고급 서비스]' 로 깨지거나
       대괄호가 아예 없는 줄('만족도 체크')도 있어 느슨하게 본다."""
    if l.startswith(("→", "•", "“", "\"")):
        return False
    if "], [" in l or "],[" in l:          # 여러 태그를 나열한 블록 헤더
        return False
    return 0 < len(l.strip("[] ")) <= 20


def pop_label_run(lines, minlen=5):
    """단계명이 연속으로 나열된 구간을 찾아 떼어낸다.
       PowerPoint 도형 순서 탓에 슬라이드 끝이 아니라 중간에 올 수 있다."""
    best = (0, 0)                          # (start, end)
    i = 0
    while i < len(lines):
        if is_label_like(lines[i]):
            j = i
            while j < len(lines) and is_label_like(lines[j]):
                j += 1
            if j - i > best[1] - best[0]:
                best = (i, j)
            i = j
        else:
            i += 1
    s, e = best
    if e - s < minlen:
        return lines, []
    labels = [l.strip("[] ").strip() for l in lines[s:e]]
    return lines[:s] + lines[e:], labels


def parse_points(title, lines):
    """A) 서비스 포인트 10 — 태그 블록 + 멘트/금지."""
    lines, labels = pop_label_run(lines)

    blocks, slogans, cur = [], [], None
    for l in lines:
        if TAGLINE.match(l):
            cur = {"label": "", "tags": split_tags(l), "say": [], "dont": []}
            blocks.append(cur)
            continue
        if cur is None:
            continue
        if l.startswith("→"):
            cur["say"].append(clean(l.lstrip("→")))
        elif l.startswith("•"):
            cur["dont"].append(clean(l.lstrip("•")))
        else:
            c = clean(l)
            if c and c not in slogans:
                slogans.append(c)          # 슬라이드 상단 슬로건 띠 — 블록 소속이 아님

    if len(labels) == len(blocks):          # 라벨이 블록과 1:1 로 떨어질 때만 붙인다
        for b, lab in zip(blocks, labels):
            b["label"] = lab

    name = re.sub(r"^서비스 포인트 10\s*\(|\)$", "", title).strip()
    return {"name": name, "title": title, "stages": blocks, "slogans": slogans,
            "labeled": len(labels) == len(blocks)}


def parse_creed(title, lines):
    """B) 중점 서비스 10계명 — 'N. 제목' + 상세. 원본 번호 순서가 뒤섞여 있어 정렬."""
    items, notes, tail, cur = [], [], [], None
    for l in lines:
        if l.startswith("*"):
            notes.append(clean(l.lstrip("*")))
            continue
        m = NUMBERED.match(l)
        if m:
            cur = {"no": int(m.group(1)), "title": clean(m.group(2)), "lines": []}
            items.append(cur)
            continue
        c = clean(l)
        if not c:
            continue
        if cur is None:
            tail.append(c)                  # 첫 번호 이전 = 앞 항목 잔여 텍스트
        else:
            cur["lines"].append(c)

    items.sort(key=lambda x: x["no"])
    name = re.sub(r"\s*중점 서비스 10계명$", "", title).strip()
    return {"name": name, "title": title, "items": items, "notes": notes, "orphan": tail}


def main():
    if not os.path.exists(SRC):
        print(f"[중단] 추출 원문이 없습니다: {SRC}")
        print("       manuals_extract.py 로 먼저 추출하세요.")
        return 1

    raw = open(SRC, encoding="utf-8").read()
    slides = re.split(r"--- slide \d+ ---", raw)[1:]
    brands, creeds = [], []

    for body in slides:
        lines = [l.strip() for l in body.splitlines() if l.strip()]
        if not lines:
            continue
        title, rest = lines[0], lines[1:]
        if "10계명" in title:
            creeds.append(parse_creed(title, rest))
        else:
            brands.append(parse_points(title, rest))

    payload = {
        "source": SRC_LABEL,
        "generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"),
        "brands": brands,
        "creeds": creeds,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("window.MOT = " + json.dumps(payload, ensure_ascii=False) + ";\n")

    print(f"[OK] manuals_mot.js 생성 — 브랜드 {len(brands)}개 / 10계명 {len(creeds)}개")
    for b in brands:
        n_say = sum(len(s["say"]) for s in b["stages"])
        n_dont = sum(len(s["dont"]) for s in b["stages"])
        flag = "" if b["labeled"] else "  (단계명 없음 → 태그를 제목으로)"
        print(f"   · {b['name']:<24} 단계 {len(b['stages']):>2} · 멘트 {n_say:>2} · 금지 {n_dont:>2}{flag}")
    for c in creeds:
        miss = [i for i in range(1, 11) if i not in [x["no"] for x in c["items"]]]
        print(f"   · {c['name']:<24} 계명 {len(c['items'])}/10"
              + (f"  누락 {miss}" if miss else "")
              + (f"  분류불가 {len(c['orphan'])}줄" if c["orphan"] else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
