"""메뉴 시험(TEST 탭) 스모크 테스트.

  python build/verify_quiz.py 8765                     # 로컬 포트
  python build/verify_quiz.py https://comimi12.github.io/slnc-sop-dashboard/

브랜드마다 (1) 전부 정답 → 100점·합격·수료 항목 완료, (2) 전부 오답 → 불합격·오답 복습
을 실제 클릭으로 풀어 본다. 정답은 quiz.json·data.json에서 문항 문구로 찾아 맞춘다.
"""
import os, sys, json, subprocess, urllib.request
from playwright.sync_api import sync_playwright

ARG = sys.argv[1] if len(sys.argv) > 1 else "8765"
BASE = ARG.rstrip("/") + "/" if ARG.startswith("http") else "http://localhost:%s/" % ARG
OUT = os.path.join(os.path.dirname(__file__), "shots", "quiz")
os.makedirs(OUT, exist_ok=True)


def get(path):
    with urllib.request.urlopen(BASE + path) as r:
        return json.loads(r.read().decode("utf-8"))


QUIZ = get("quiz.json")
DATA = get("data.json")
THUMB = {}
for d in DATA:
    if d.get("kind") == "menu":
        for it in d["items"]:
            if it.get("img"):
                t = "img/t/" + it["img"].split("/", 1)[1].rsplit(".", 1)[0] + ".jpg"
                THUMB.setdefault(t, set()).add(it["en"])

# 추천 멘트 문제: 가린 영문 멘트 → 정답 메뉴 (app.js 로직 그대로, 로컬 src 기준)
SELL = json.loads(subprocess.check_output(["node", os.path.join(os.path.dirname(__file__), "_sell_map.js")]).decode("utf-8"))

fails = []


def check(ok, msg):
    print(("  ok  " if ok else "  FAIL ") + msg)
    if not ok:
        fails.append(msg)


def answer_of(brand, page):
    """지금 화면의 문항 정답 (mc는 보기 영문, sa는 입력할 문자열)"""
    qen = page.locator(".qcard .qq .l-en").inner_text().strip()
    quote = page.locator(".qcard .qquote .l-en")
    if quote.count():
        return "mc", set(SELL[quote.inner_text().strip()])
    img = page.locator(".qimg img")
    if img.count():
        src = img.get_attribute("src")
        return "mc", THUMB[src]
    for q in QUIZ[brand]["mc"]:
        if q["q"][0] == qen:
            return "mc", q["o"][0][0]
    raise RuntimeError("문항을 찾지 못함: " + qen)


def run(page, brand, right):
    page.goto(BASE + "#/test")
    page.wait_for_selector("[data-qstart]")
    page.click("[data-qstart]")
    n = 0
    while page.locator("[data-qnext]").count():
        kind, ans = answer_of(brand, page)
        if kind == "mc":
            btns = page.locator(".qo")
            pick = None
            for i in range(btns.count()):
                t = btns.nth(i).locator(".l-en").inner_text().strip()
                hit = (t in ans) if isinstance(ans, set) else (t == ans)
                if hit == right:
                    pick = i
                    break
            if pick is None:
                raise RuntimeError("보기 선택 실패: %r / %r" % (ans, [btns.nth(i).inner_text() for i in range(btns.count())]))
            btns.nth(pick).click()
        if n == 2 and right:
            page.screenshot(path=os.path.join(OUT, "%s-q.png" % brand), full_page=True)
        page.click("[data-qnext]")
        n += 1
    check(n == 30, "%s 문항 수 30 (실제 %d)" % (brand, n))
    check(page.locator("#qa").count() == 0, "주관식 입력칸 없음")
    sc = page.locator(".qres .qsc").inner_text().strip()
    page.screenshot(path=os.path.join(OUT, "%s-%s.png" % (brand, "pass" if right else "fail")), full_page=True)
    return sc


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    page = ctx.new_page()
    errs = []
    page.on("pageerror", lambda e: errs.append(str(e)))
    page.on("dialog", lambda d: d.accept())
    for brand in ["KSC", "WASA"]:
        print("[%s]" % brand)
        page.goto(BASE + "#/sop")
        page.wait_for_selector(".bsw")
        page.click('[data-setbrand="%s"]' % brand)
        page.wait_for_timeout(200)
        check(page.locator('.nv[href="#/test"]').count() == 1, "레일에 TEST 탭")
        sc = run(page, brand, right=False)
        check(sc.startswith("0"), "전부 오답 → 0점 (%s)" % sc)
        nimg = page.locator(".qrev .qrimg").count()
        check(nimg == 15, "사진 문제 15개 (%d)" % nimg)
        check(page.locator(".qrev .card").count() == 30, "오답 복습 30건")
        nq = page.locator(".qrev .qquote").count()
        check(nq == 10, "추천 멘트 문제 10개 (%d)" % nq)
        check(page.locator(".qres.ok").count() == 0, "불합격 표시")
        sc = run(page, brand, right=True)
        check(sc.startswith("100"), "전부 정답 → 100점 (%s)" % sc)
        check(page.locator(".qres.ok").count() == 1, "합격 표시")
        st = page.evaluate("JSON.parse(localStorage.getItem('slnc-sop-v1'))")
        check(bool(st["done"].get("quiz:" + brand)), "수료 항목 quiz:%s 완료" % brand)
        check(st["quiz"][brand]["best"] == 100 and st["quiz"][brand]["tries"] == 2, "기록 best 100 · 2회")
        page.goto(BASE + "#/cert")
        page.wait_for_selector("#nm")
        check("MENU TEST" not in page.locator("main").inner_text().split("REMAINING")[1].split("TIME SPENT")[0],
              "수료 탭 남은 항목에서 시험 빠짐")
        w = page.evaluate("document.documentElement.scrollWidth")
        check(w <= 390, "가로 스크롤 없음 (%d)" % w)
    check(not errs, "콘솔 오류 없음 %s" % errs)
    br.close()

print("\n%d건 실패" % len(fails) if fails else "\n모두 통과")
sys.exit(1 if fails else 0)
