# -*- coding: utf-8 -*-
"""글로벌 매장 매출 수집기.

SpotOn(미국 4매장, USD) + USEN regi(일본 1매장, JPY)의 일별
순매출/고객수/객단가를 수집해 data.js 로 저장한다. dashboard.html이 읽는다.

사용법:
  python collect.py            # COLLECT_START ~ 오늘 전체 수집 → data.js
"""
import sys, io, os, json, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright
import config as C

HERE = os.path.dirname(os.path.abspath(__file__))
SPOTON_STATE = os.path.join(HERE, "spoton_state.json")


def daterange_today():
    start = C.COLLECT_START
    end = datetime.date.today().isoformat()
    return start, end


# ── SpotOn ──────────────────────────────────────────────────────────
def spoton_date_range(start, end):
    return {"id": 0, "rangeType": "custom", "name": "Custom", "group": "Days",
            "startDate": f"{start}T15:00:00.000Z", "endDate": f"{end}T15:00:00.000Z"}


def spoton_login(browser):
    ctx = browser.new_context(storage_state=SPOTON_STATE if os.path.exists(SPOTON_STATE) else None)
    page = ctx.new_page()
    bearer = {}
    def on_resp(resp):
        if "/api/reports/" in resp.url:
            a = resp.request.headers.get("authorization", "")
            if a.startswith("Bearer "):
                bearer["b"] = a
    page.on("response", on_resp)
    nav = f"{C.SPOTON['base']}/restaurant-reporting/interactive-reports/weekly-dashboard/?location_key={C.STORES[0]['location_key']}"
    # 접속 타임아웃 대비 재시도(90초 × 3회). 끝내 실패하면 None 반환 → 호출부에서 안전 중단.
    for attempt in range(3):
        try:
            page.goto(nav, wait_until="domcontentloaded", timeout=90000)
            break
        except Exception as e:
            print(f"  SpotOn 접속 재시도 {attempt + 1}/3: {e}")
            if attempt == 2:
                return page, None
    need_login = False
    for _ in range(40):
        page.wait_for_timeout(1000)
        try:
            if page.query_selector("input[name='identifier']"):
                need_login = True; break
            host = page.evaluate("() => location.host + location.pathname")
            if "restaurantreports.spoton.com" in host and "login" not in host:
                break
        except Exception:
            continue
    if need_login:
        page.wait_for_selector("input[name='identifier']", timeout=30000)
        page.fill("input[name='identifier']", C.SPOTON["user"])
        page.fill("input[name='credentials.passcode']", C.SPOTON["pw"])
        try: page.check("input[name='rememberMe']")
        except Exception: pass
        page.click("input[type='submit']")
        page.wait_for_function(
            "() => location.host.includes('restaurantreports.spoton.com') && !location.pathname.includes('login')",
            timeout=60000)
        page.goto(nav, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(8000)
    ctx.storage_state(path=SPOTON_STATE)
    return page, bearer.get("b")


def spoton_fetch(page, bearer, loc_key, start, end):
    params = {"date_range": spoton_date_range(start, end), "location_key": loc_key}
    url = f"{C.SPOTON['base']}/api/reports/{C.SPOTON['weekly_dash_id']}?parameters=" + json.dumps(params, separators=(",", ":"))
    res = page.evaluate(
        """async ({url, bearer}) => {
            const r = await fetch(url, {headers: {Authorization: bearer, Accept: 'application/json'}});
            return {status: r.status, body: await r.text()};
        }""", {"url": url, "bearer": bearer})
    if res["status"] != 200:
        print(f"  SpotOn HTTP {res['status']}"); return []
    data = json.loads(res["body"])
    for blk in data:
        if isinstance(blk, dict) and blk.get("query", {}).get("name") == "Weekly Dashboard - Guest Sales":
            return blk["data"]
    return []


def spoton_daily(rows):
    out = []
    for r in rows:
        dk = str(r["business_date_key"])
        d = datetime.date(int(dk[:4]), int(dk[4:6]), int(dk[6:8]))
        g = r.get("guest_count") or 0
        ns = round(float(r.get("net_sales") or 0), 2)
        out.append({"date": d.isoformat(), "weekday": C.WEEKDAY_KR[d.weekday()],
                    "net_sales": ns, "guests": g,
                    "avg_check": round(ns / g, 2) if g else 0})
    out.sort(key=lambda x: x["date"])
    return out


# ── USEN regi ───────────────────────────────────────────────────────
def usen_login(browser):
    ctx = browser.new_context()
    page = ctx.new_page()
    token = {}
    def on_req(req):
        if "analytics-api.usen-regi.com" in req.url:
            a = req.headers.get("authorization", "")
            if a:
                token["t"] = a
    page.on("request", on_req)
    page.goto(C.USEN["login_url"], wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(2000)
    page.fill("#input-0", C.USEN["corp"]); page.fill("#input-2", C.USEN["staff"]); page.fill("#input-4", C.USEN["pw"])
    page.click("button.btn-login")
    page.wait_for_timeout(5000)
    page.goto("https://analytics-pc.usen-regi.com/v2/sales/analysis", wait_until="networkidle", timeout=60000)
    page.wait_for_timeout(5000)
    return page, token.get("t")


def usen_post(page, token, endpoint, start, end, store):
    s = start.replace("-", "/"); e = end.replace("-", "/")
    days = (datetime.date.fromisoformat(end) - datetime.date.fromisoformat(start)).days + 1
    body = {"target_date": {"aggregation_unit": "day", "start_date": s, "end_date": e, "range_type": days},
            "target_store": {"aggregation_scope": "only", "store_code": store["store_code"], "store_name": store["store_name"]}}
    url = f"{C.USEN['api_base']}/pc/v2/{endpoint}"
    res = page.evaluate(
        """async ({url, token, apikey, body}) => {
            const r = await fetch(url, {method:'POST', headers:{
                'authorization': token, 'x-api-key': apikey,
                'content-type':'application/json', 'accept':'application/json, text/plain, */*'
            }, body: JSON.stringify(body)});
            return {status: r.status, body: await r.text()};
        }""", {"url": url, "token": token, "apikey": C.USEN["x_api_key"], "body": body})
    if res["status"] != 200:
        print(f"  USEN {endpoint} HTTP {res['status']}"); return {}
    return json.loads(res["body"])


def usen_daily(page, token, store, start, end):
    sales = usen_post(page, token, "getSalesAnalyticsByTargetDate", start, end, store)
    qty = usen_post(page, token, "getQuantityAnalyticsByTargetDate", start, end, store)
    sales_units = (sales.get("data", {}).get("target_store", {}) or {}).get("aggregation_unit", [])
    qty_units = (qty.get("data", {}).get("target_store", {}) or {}).get("aggregation_unit", [])
    qmap = {u["unit_date_str"]: u for u in qty_units}
    out = []
    for u in sales_units:
        ds = u["unit_date_str"]  # e.g. 2026/6/3
        y, m, dd = [int(x) for x in ds.split("/")]
        d = datetime.date(y, m, dd)
        ns = float(u.get("total") or 0)
        q = qmap.get(ds, {})
        guests = int(q.get("total") or 0)
        avg = float(q.get("total_unit_price") or 0)
        if ns == 0 and guests == 0:
            continue  # 미영업일 제외
        out.append({"date": d.isoformat(), "weekday": C.WEEKDAY_KR[d.weekday()],
                    "net_sales": round(ns, 2), "guests": guests,
                    "avg_check": round(avg, 2) if avg else (round(ns / guests, 2) if guests else 0)})
    out.sort(key=lambda x: x["date"])
    return out


# ── main ────────────────────────────────────────────────────────────
def main():
    start, end = daterange_today()
    print(f"수집 기간: {start} ~ {end}")
    result = {"generated_at": datetime.datetime.now().isoformat(timespec="seconds"),
              "start": start, "end": end, "stores": []}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # SpotOn
        sp_stores = [s for s in C.STORES if s["source"] == "spoton"]
        page, bearer = spoton_login(browser)
        if not bearer:
            print("ERROR: SpotOn 토큰 획득 실패")
        else:
            for s in sp_stores:
                rows = spoton_fetch(page, bearer, s["location_key"], start, end)
                daily = spoton_daily(rows)
                print(f"  [SpotOn] {s['name']}: {len(daily)}일")
                result["stores"].append({**{k: s[k] for k in ("key","name","brand","currency","color")}, "daily": daily})

        # USEN
        us_stores = [s for s in C.STORES if s["source"] == "usen"]
        if us_stores:
            upage, token = usen_login(browser)
            if not token:
                print("ERROR: USEN 토큰 획득 실패")
            else:
                for s in us_stores:
                    daily = usen_daily(upage, token, s, start, end)
                    print(f"  [USEN] {s['name']}: {len(daily)}일")
                    result["stores"].append({**{k: s[k] for k in ("key","name","brand","currency","color")}, "daily": daily})

        browser.close()

    # 매장 마스터 순서대로 정렬
    order = {s["key"]: i for i, s in enumerate(C.STORES)}
    result["stores"].sort(key=lambda x: order.get(x["key"], 99))

    # 안전장치: 매장이 하나라도 누락되면(수집 실패) 기존 데이터를 덮어쓰지 않고 중단.
    # → 일시적 SpotOn/USEN 장애로 좋은 데이터가 1개 매장짜리로 덮이는 사고 방지.
    if len(result["stores"]) < len(C.STORES):
        print(f"ERROR: 수집 불완전 ({len(result['stores'])}/{len(C.STORES)} 매장). "
              f"기존 데이터 보존하고 중단(덮어쓰기 안 함).")
        sys.exit(2)

    out_js = os.path.join(HERE, "data.js")
    with open(out_js, "w", encoding="utf-8") as f:
        f.write("window.DASHBOARD_DATA = ")
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";")
    print("SAVED:", out_js)

    # web/ (Next.js 신규 대시보드)가 빌드 시 fs로 읽는 순수 JSON
    out_json = os.path.join(HERE, "data.json")
    with open(out_json, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, separators=(",", ":"))
    print("SAVED:", out_json)
    total = sum(len(s["daily"]) for s in result["stores"])
    print(f"총 {len(result['stores'])}개 매장 / {total}행")


if __name__ == "__main__":
    main()
