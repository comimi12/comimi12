# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"
LOC = "1818994375889661568"
BASE = "https://restaurantreports.spoton.com"

REPORTS = {
    "weekly-dashboard": f"{BASE}/restaurant-reporting/interactive-reports/weekly-dashboard/?startDate=06-09-2026&endDate=06-15-2026&location_key={LOC}",
    "snapshot": f"{BASE}/restaurant-reporting/interactive-reports/dashboard/?startDate=06-09-2026&endDate=06-15-2026&location_key={LOC}",
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(storage_state=STATE)

    for name, url in REPORTS.items():
        page = ctx.new_page()
        cap = []
        hdrs = {}
        def on_resp(resp, cap=cap, hdrs=hdrs):
            u = resp.url
            ct = resp.headers.get("content-type", "")
            if "/api/reports/" in u and "json" in ct:
                try:
                    body = resp.text()
                except Exception:
                    body = ""
                cap.append((resp.status, u, body))
                try:
                    req = resp.request
                    hdrs["auth"] = req.headers.get("authorization", "")[:40]
                except Exception:
                    pass
        page.on("response", on_resp)
        print(f"\n############## {name} ##############")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(14000)
        print("URL:", page.url)
        print("AUTH_HEADER_PREFIX:", hdrs.get("auth", "(none)"))
        for s, u, b in cap:
            print("API:", s, u[:120])
        with open(f"C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_api2_{name}.txt", "w", encoding="utf-8") as f:
            for s, u, b in cap:
                f.write(f"=== {s} {u}\n{b}\n\n")
        # also render visible tables briefly
        for ti, t in enumerate(page.query_selector_all("table")):
            rows = t.query_selector_all("tr")
            if len(rows) <= 1:
                continue
            print(f"--- TABLE {ti} ({len(rows)} rows) ---")
            for r in rows[:20]:
                cells = r.query_selector_all("th,td")
                vals = [(c.inner_text() or '').strip().replace("\n", " ") for c in cells]
                if any(vals):
                    print(" | ".join(vals))
        page.close()
    browser.close()
