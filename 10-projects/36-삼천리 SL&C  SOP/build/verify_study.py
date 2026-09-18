# -*- coding: utf-8 -*-
"""학습 시간 게이트 + 등록 링크 흐름 검증 (verify.py 와 짝).

  python -m http.server 8766 --directory src
  python build/verify_study.py 8766

완료 버튼이 최소 학습 시간 전에 잠기는지, 화면이 가려지면 시간이 멈추는지,
수료 보고 링크가 다른 기기에서 그대로 등록되고 위·변조가 잡히는지까지 본다."""
import sys, re, json, urllib.parse
from playwright.sync_api import sync_playwright

ARG = sys.argv[1] if len(sys.argv) > 1 else "8766"
BASE = ARG.rstrip("/") + "/" if ARG.startswith("http") else "http://127.0.0.1:%s/" % ARG
KEY = "slnc-sop-v1"
ok = True
errs = []


def chk(cond, msg):
    global ok
    print(("  OK   " if cond else "  FAIL ") + msg)
    if not cond:
        ok = False


def secs(txt):
    """'조금만 더 읽어 주세요 · 2분 28초 남음' -> 148"""
    m = re.search(r"(?:(\d+)분)?\s*(?:(\d+)초)?\s*남음", txt or "")
    if not m:
        return None
    return int(m.group(1) or 0) * 60 + int(m.group(2) or 0)


with sync_playwright() as p:
    br = p.chromium.launch()
    ctx = br.new_context(viewport={"width": 390, "height": 780})
    ctx.add_init_script("navigator.share = o => { window.__shared = o.text; "
                        "return Promise.resolve(); };")

    def page(seed=None):
        """앱이 뜨기 전에 기록을 심어 둔 새 탭 (이전 탭이 덮어쓰지 않도록 따로 연다)"""
        pg = ctx.new_page()
        if seed is not None:
            pg.add_init_script("localStorage.setItem(%s, %s)"
                               % (json.dumps(KEY), json.dumps(json.dumps(seed))))
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type == "error" and errs.append(m.text))
        return pg

    # ── 1. 완료 버튼이 최소 학습 시간 전에는 잠겨 있는가
    pg = page()
    pg.goto(BASE + "#/sop"); pg.wait_for_timeout(1200)
    href = pg.eval_on_selector_all(
        "a[href^='#/p/']", "els => els.length ? els[0].getAttribute('href') : ''")
    pg.goto(BASE + href); pg.wait_for_timeout(900)
    b = pg.query_selector("[data-done]")
    chk(b is not None, "학습 페이지에 완료 버튼이 있다")
    chk(b.get_attribute("disabled") is not None, "아직 못 읽었으므로 완료 버튼이 잠겨 있다")
    need = int(b.get_attribute("data-need") or 0)
    key = b.get_attribute("data-done")
    chk(20 <= need <= 150, "분량에 맞는 최소 시간이 매겨졌다 (%d초)" % need)
    g1 = pg.inner_text(".gatetx").strip()
    chk(secs(g1) is not None, "왜 못 누르는지 안내가 보인다: %s" % g1)

    # 시간이 실제로 흐르는가
    pg.mouse.move(100, 300)
    pg.wait_for_timeout(4200)
    g2 = pg.inner_text(".gatetx").strip()
    d = (secs(g1) or 0) - (secs(g2) or 0)
    chk(3 <= d <= 6, "화면에 머문 만큼 남은 시간이 줄어든다 (%d초 감소)" % d)

    # 화면이 가려진 동안은 시간이 멈추는가
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});"
                "document.dispatchEvent(new Event('visibilitychange'))")
    pg.wait_for_timeout(4200)
    g3 = pg.inner_text(".gatetx").strip()
    dh = (secs(g2) or 0) - (secs(g3) or 0)
    chk(dh == 0, "화면이 가려진 동안은 시간이 멈춘다 (%d초 감소)" % dh)
    pg.evaluate("Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});"
                "document.dispatchEvent(new Event('visibilitychange'))")

    seed = pg.evaluate("k => JSON.parse(localStorage.getItem(k) || '{}')", KEY)
    pg.close()

    # ── 2. 필요한 만큼 채우면 열리는가
    seed.setdefault("study", {})[key] = {"s": need + 5, "d": 100}
    pg = page(seed)
    pg.goto(BASE + href); pg.wait_for_timeout(900)
    b = pg.query_selector("[data-done]")
    chk(b.get_attribute("disabled") is None, "시간과 스크롤을 채우면 완료 버튼이 열린다")
    chk(pg.inner_text(".gate").strip() == "", "열리면 안내 문구는 사라진다")

    # ── 3. 전 과정을 채우고 수료 화면의 학습 시간 표를 본다
    pg.goto(BASE + "#/cert"); pg.wait_for_timeout(900)
    hrefs = pg.eval_on_selector_all(".list a", "els => els.map(e => e.getAttribute('href'))")
    keys = []
    for h in hrefs:
        m = re.match(r"^#/p/([^/]+)/(\d+)$", h or "")
        if m:
            keys.append(m.group(1) + ":" + m.group(2)); continue
        m = re.match(r"^#/menu/([^/]+)/(.+)$", h or "")
        if m:
            keys.append("menu:" + m.group(1) + ":" + urllib.parse.unquote(m.group(2)))
    chk(len(keys) > 5, "남은 항목 %d개를 찾았다" % len(keys))
    seed = pg.evaluate("k => JSON.parse(localStorage.getItem(k) || '{}')", KEY)
    pg.close()

    seed["me"] = {"name": "홍길동", "phone": "1234", "pos": "server", "posLabel": "SERVER"}
    seed.setdefault("done", {}); seed.setdefault("study", {})
    for i, k in enumerate(keys):
        seed["done"][k] = "2026-09-18T01:00:00.000Z"
        seed["study"][k] = {"s": 40 + i * 5, "d": 100}
    pg = page(seed)
    pg.goto(BASE + "#/cert"); pg.wait_for_timeout(1000)
    txt = pg.inner_text("main")
    chk("학습 시간" in txt, "수료 화면에 학습 시간 표가 있다")
    m = re.search(r"(\d+)분\s*\n?\s*(\d+)개 항목 합계", txt)
    chk(bool(m), "항목 합계가 표시된다: %s" % (m.group(0).replace("\n", " ") if m else "?"))

    # ── 4. 서명까지 하고 등록 링크를 뽑는다
    pg.fill("#tn", "김트레이너")
    sig = pg.query_selector("#sig"); sig.scroll_into_view_if_needed()
    pg.wait_for_timeout(200)
    bb = sig.bounding_box()
    pg.mouse.move(bb["x"] + 20, bb["y"] + 40); pg.mouse.down()
    pg.mouse.move(bb["x"] + 120, bb["y"] + 60); pg.mouse.up()
    pg.click("[data-sigsave]"); pg.wait_for_timeout(800)
    chk(pg.query_selector("[data-share]") is not None, "서명 후 보내기 버튼이 나온다")
    pg.click("[data-share]"); pg.wait_for_timeout(500)
    shared = pg.evaluate("window.__shared || ''")
    chk("학습시간:" in shared, "보고 본문에 학습시간이 들어간다")
    m = re.search(r"(#/add/[A-Za-z0-9_\-]+)", shared)
    chk(bool(m), "등록 링크가 같이 간다 (%d자)" % len(shared))
    link = m.group(1) if m else ""
    pg.close()

    # ── 5. 매니저가 링크를 누른다 (기록이 없는 다른 기기처럼)
    pg = page({})
    pg.goto(BASE + link); pg.wait_for_timeout(1000)
    txt = pg.inner_text("main")
    chk("홍길동" in txt, "등록 확인 화면에 이름이 보인다")
    chk("정상" in txt and "불일치" not in txt, "확인코드가 정상으로 검증된다")
    chk("학습 시간" in txt, "학습 시간이 함께 온다")
    pg.once("dialog", lambda dl: dl.accept())
    pg.click("[data-addok]"); pg.wait_for_timeout(1000)
    txt = pg.inner_text("main")
    chk("홍길동" in txt and "수료" in txt, "팀 현황에 등록된다")
    pg.click("[data-tdetail]"); pg.wait_for_timeout(500)
    sheet = pg.inner_text("#sheetBody")
    chk("학습 시간" in sheet and "홍길동" in sheet, "항목별 시간 내역이 열린다")

    # 위·변조는 잡히는가 (진도를 올려 링크를 손댄다)
    import base64
    raw = link.split("/add/")[1]
    pad = raw + "=" * (-len(raw) % 4)
    o = json.loads(base64.urlsafe_b64decode(pad).decode("utf-8"))
    o["d"] = o["t"] = 99
    bad = base64.urlsafe_b64encode(json.dumps(o, ensure_ascii=False)
                                   .encode("utf-8")).decode().rstrip("=")
    pg.goto(BASE + "#/add/" + bad); pg.wait_for_timeout(900)
    chk("불일치" in pg.inner_text("main"), "손댄 링크는 코드 불일치로 잡힌다")

    chk(not errs, "콘솔 오류 없음 %s" % (errs[:2] if errs else ""))
    br.close()

print("\n" + ("[OK] 모두 통과" if ok else "[FAIL] 실패 항목 있음"))
sys.exit(0 if ok else 1)
