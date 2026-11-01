# 전 탭 점검: dashboard.html 의 왼쪽 탭을 모두 열어 스크립트 오류·빈 화면을 확인 (python tab_check.py)
import json, sys, os
from playwright.sync_api import sync_playwright

HTML = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dashboard.html")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "tab_shots")
os.makedirs(OUT, exist_ok=True)
res = []
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1440, "height": 1000})
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append("console: " + m.text) if m.type == "error" else None)
    pg.goto("file:///" + HTML.replace("\\", "/"))
    pg.wait_for_timeout(2500)
    tabs = pg.eval_on_selector_all(".snav .tab", "els => els.map(e => [e.dataset.v, e.innerText.trim()])")
    for v, name in tabs:
        n0 = len(errs)
        pg.click(f'.tab[data-v="{v}"]')
        pg.wait_for_timeout(1200)
        txt = pg.eval_on_selector(f"#{v}", "el => el.innerText")
        pg.screenshot(path=os.path.join(OUT, f"{v}.png"))
        flags = [w for w in ["데이터가 없습니다", "undefined", "NaN", "null"] if w in txt]
        res.append({"v": v, "name": name, "chars": len(txt), "errors": errs[n0:], "flags": flags,
                    "head": " ".join(txt.split())[:260]})
    b.close()
print(json.dumps(res, ensure_ascii=False, indent=1))
