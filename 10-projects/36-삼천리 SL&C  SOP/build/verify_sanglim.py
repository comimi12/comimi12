# -*- coding: utf-8 -*-
"""상림숯집 화면 검증 — 브랜드를 SANGLIM으로 두고 SOP 6장·메뉴·시험·수료 화면을 캡처한다.
콘솔 오류 · 가로 스크롤 · 깨진 이미지를 잡는다.

사용: python build/verify_sanglim.py [포트|URL]   (기본 8765)
"""
import os, sys, json
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ARG = sys.argv[1] if len(sys.argv) > 1 else "8765"
BASE = ARG.rstrip("/") + "/" if ARG.startswith("http") else "http://localhost:%s/" % ARG
SHOTS = os.path.join(HERE, "shots-sanglim")

VIEWS = [("sop", "#/sop")] + [("p%d" % n, "#/p/sanglim-manual/%d" % n) for n in range(2, 14)] + [
    ("menu", "#/menu"), ("menu-all", "#/menu/sanglim-menu/__all"),
    ("test", "#/test"), ("cert", "#/cert"), ("check", "#/check")]


def main():
    os.makedirs(SHOTS, exist_ok=True)
    problems = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        ctx.add_init_script("localStorage.setItem('slnc-sop-v1', JSON.stringify({brand:'SANGLIM'}))")
        pg = ctx.new_page()
        errs = []
        pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        pg.on("pageerror", lambda e: errs.append(str(e)))
        for name, h in VIEWS:
            errs.clear()
            pg.goto(BASE + h)
            pg.wait_for_timeout(900)
            # 지연 로딩 이미지까지 불러오도록 끝까지 스크롤
            pg.evaluate("""async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) {
                window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } window.scrollTo(0, 0); }""")
            pg.wait_for_timeout(700)
            info = pg.evaluate("""() => ({
                brand: document.documentElement.dataset.brand,
                hscroll: document.documentElement.scrollWidth > window.innerWidth + 1,
                broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src')),
                text: document.body.innerText.length })""")
            pg.screenshot(path=os.path.join(SHOTS, name + ".png"), full_page=True)
            bad = []
            if info["brand"] != "SANGLIM": bad.append("brand=%s" % info["brand"])
            if info["hscroll"]: bad.append("가로 스크롤")
            if info["broken"]: bad.append("깨진 이미지 %s" % info["broken"][:5])
            if info["text"] < 40: bad.append("빈 화면")
            if errs: bad.append("콘솔 오류 %s" % errs[:3])
            print(("  ✕ " if bad else "  ✓ ") + name + ("  " + " / ".join(bad) if bad else ""))
            problems += bad
        b.close()
    print("문제 %d건" % len(problems) if problems else "문제 없음")
    sys.exit(1 if problems else 0)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
