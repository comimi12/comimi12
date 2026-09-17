# -*- coding: utf-8 -*-
"""대시보드 시각 검증: 주요 화면을 캡처하고 콘솔 오류·가로 스크롤·빈 화면을 잡아낸다.

사용: python build/verify.py [포트]   (기본 8765, src/ 를 서빙 중이어야 함)
"""
import os, sys, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(HERE, "shots")
ARG = sys.argv[1] if len(sys.argv) > 1 else "8765"
BASE = ARG.rstrip("/") + "/" if ARG.startswith("http") else "http://localhost:%s/" % ARG
if ARG.startswith("http"):
    SHOTS = os.path.join(HERE, "shots-live")

VIEWS = [
    ("home-ksc", "#/KSC", 1440),
    ("home-wasa", "#/WASA", 1440),
    ("ksc-position", "#/KSC/ksc-manual/15", 1440),
    ("ksc-brand", "#/KSC/ksc-manual/6", 1440),
    ("ksc-checklist", "#/KSC/ksc-manual/45", 1440),
    ("ksc-allergen", "#/KSC/ksc-manual/47", 1440),
    ("ksc-divider", "#/KSC/ksc-manual/13", 1440),
    ("ksc-menu", "#/KSC/ksc-menu", 1440),
    ("wasa-menu", "#/WASA/wasa-menu", 1440),
    ("wasa-position", "#/WASA/wasa-manual/22", 1440),
    ("wasa-playbook", "#/WASA/wasa-manual/38", 1440),
    ("search", "#/search/kalbi", 1440),
    ("sheet-wasa", "#/WASA/wasa-menu?item=3", 1440),
    ("sheet-ksc", "#/KSC/ksc-menu?item=1", 1440),
    ("mobile-menu", "#/WASA/wasa-menu", 390),
    ("mobile-page", "#/KSC/ksc-manual/15", 390),
]


def main():
    os.makedirs(SHOTS, exist_ok=True)
    problems = []
    with sync_playwright() as p:
        br = p.chromium.launch()
        for name, hash_, width in VIEWS:
            pg = br.new_page(viewport={"width": width, "height": 1000},
                             device_scale_factor=1)
            errs = []
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto(BASE + hash_, wait_until="networkidle")
            pg.wait_for_timeout(500)

            stats = pg.evaluate("""() => ({
              main: document.getElementById('main').innerText.trim().length,
              toc: document.getElementById('toc').innerText.trim().length,
              overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
              imgs: [...document.images].length,
              broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).length,
              blocks: document.querySelectorAll('.blk,.mcard,.cl,.tbl-wrap,.res a,.cards a,.divider').length
            })""")
            if errs:
                problems.append("%s: 콘솔 오류 %s" % (name, errs[:2]))
            if stats["main"] < 120:
                problems.append("%s: 본문이 비어 있음 (%d자)" % (name, stats["main"]))
            if stats["overflow"] > 2:
                problems.append("%s: 가로 스크롤 %dpx" % (name, stats["overflow"]))
            if stats["broken"]:
                problems.append("%s: 깨진 이미지 %d개" % (name, stats["broken"]))
            if stats["blocks"] == 0:
                problems.append("%s: 렌더된 블록 없음" % name)

            pg.screenshot(path=os.path.join(SHOTS, name + ".png"), full_page=(width > 1000 and "sheet" not in name))
            print("  %-16s blocks=%-3d imgs=%-3d main=%-5d %s"
                  % (name, stats["blocks"], stats["imgs"], stats["main"],
                     "OK" if not errs else "ERR"))
            pg.close()
        br.close()

    if problems:
        print("\n[문제 %d건]" % len(problems))
        for x in problems:
            print("  -", x)
        sys.exit(1)
    print("\n[OK] 모든 화면 정상 — 캡처: %s" % SHOTS)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
