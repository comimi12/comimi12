# -*- coding: utf-8 -*-
"""SpotOn data engine: login (reuse/refresh session), capture bearer, call report API."""
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

BASE = "https://restaurantreports.spoton.com"
STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"
USER = "eg231478@samchully.co.kr"
PW = "Cjk851219!"
WEEKLY_DASH_ID = "54f4dd7b22e45a0000c07bf0"

LOCATIONS = [
    ("Kalbi Social Club - Irvine", "1818994375889661568"),
    ("Kalbi Social Club - Brea",   "1912595012202665856"),
    ("Robata Wasa - Irvine",       "1699495389898777408"),
    ("Robata Wasa - Brea",         "1910722970924225280"),
]

# target window for the one-time test
START = "2026-06-09"
END   = "2026-06-16"


def date_range(start, end):
    return {
        "id": 0, "rangeType": "custom", "name": "Custom", "group": "Days",
        "startDate": f"{start}T15:00:00.000Z",
        "endDate":   f"{end}T15:00:00.000Z",
    }


def fetch_guest_sales(page, bearer, report_id, loc_key, start, end):
    params = {"date_range": date_range(start, end), "location_key": loc_key}
    url = f"{BASE}/api/reports/{report_id}?parameters=" + json.dumps(params, separators=(",", ":"))
    res = page.evaluate(
        """async ({url, bearer}) => {
            const r = await fetch(url, {headers: {Authorization: bearer, Accept: 'application/json'}});
            return {status: r.status, body: await r.text()};
        }""",
        {"url": url, "bearer": bearer},
    )
    if res["status"] != 200:
        return None, res["status"]
    data = json.loads(res["body"])
    for blk in data:
        if isinstance(blk, dict) and blk.get("query", {}).get("name") == "Weekly Dashboard - Guest Sales":
            return blk["data"], 200
    return [], 200


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    import os
    ctx = browser.new_context(storage_state=STATE if os.path.exists(STATE) else None)
    page = ctx.new_page()

    bearer_holder = {}
    def on_resp(resp):
        if "/api/reports/" in resp.url:
            a = resp.request.headers.get("authorization", "")
            if a.startswith("Bearer "):
                bearer_holder["b"] = a
    page.on("response", on_resp)

    # navigate to a report; login if needed
    nav = f"{BASE}/restaurant-reporting/interactive-reports/weekly-dashboard/?location_key={LOCATIONS[0][1]}"
    page.goto(nav, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(3000)
    if page.query_selector("input[name='identifier']"):
        page.fill("input[name='identifier']", USER)
        page.fill("input[name='credentials.passcode']", PW)
        try: page.check("input[name='rememberMe']")
        except Exception: pass
        page.click("input[type='submit']")
        page.wait_for_function(
            "() => location.host.includes('restaurantreports.spoton.com') && !location.pathname.includes('login')",
            timeout=60000)
        page.goto(nav, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(10000)
    ctx.storage_state(path=STATE)

    bearer = bearer_holder.get("b")
    print("BEARER_CAPTURED:", bool(bearer))
    if not bearer:
        print("ERROR: no bearer captured"); browser.close(); sys.exit(1)

    print(f"\n=== KCS daily {START}~{END} ===")
    rows, st = fetch_guest_sales(page, bearer, WEEKLY_DASH_ID, LOCATIONS[0][1], START, END)
    print("status", st, "ndays", len(rows) if rows else 0)
    for r in (rows or []):
        print(r["business_date_key"], "net_sales=", r["net_sales"], "guests=", r["guest_count"], "checks=", r["check_count"])

    print("\n=== 4 stores single day 2026-06-15 ===")
    for name, key in LOCATIONS:
        rows, st = fetch_guest_sales(page, bearer, WEEKLY_DASH_ID, key, "2026-06-15", "2026-06-15")
        tot = rows[0] if rows else None
        print(f"{name}: status={st} -> {tot}")

    browser.close()
