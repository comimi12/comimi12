# -*- coding: utf-8 -*-
import sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"
LOC = "1818994375889661568"
BASE = "https://restaurantreports.spoton.com"

REPORTS = {
    "sales-by-day": f"{BASE}/restaurant-reporting/analytics-reports/sales-by-day/?startDate=06-09-2026&endDate=06-16-2026&location_key={LOC}",
    "dsr": f"{BASE}/restaurant-reporting/interactive-reports/dsr/?startDate=06-09-2026&endDate=06-16-2026&location_key={LOC}",
}

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(storage_state=STATE)

    for name, url in REPORTS.items():
        page = ctx.new_page()
        captured = []
        def on_resp(resp, captured=captured):
            u = resp.url
            ct = resp.headers.get("content-type", "")
            if "/api/" in u and "json" in ct:
                try:
                    body = resp.text()
                except Exception:
                    body = ""
                captured.append((resp.status, u, body[:4000]))
        page.on("response", on_resp)

        print(f"\n############## {name} ##############")
        page.goto(url, wait_until="domcontentloaded", timeout=60000)
        page.wait_for_timeout(12000)
        print("URL:", page.url)
        tables = page.query_selector_all("table")
        print("NUM_TABLES:", len(tables))
        for ti, t in enumerate(tables):
            rows = t.query_selector_all("tr")
            if len(rows) <= 1:
                continue
            print(f"--- TABLE {ti} ({len(rows)} rows) ---")
            for r in rows[:40]:
                cells = r.query_selector_all("th,td")
                vals = [(c.inner_text() or '').strip().replace("\n", " ") for c in cells]
                if any(vals):
                    print(" | ".join(vals))
        print(f"--- API CALLS ({name}) ---")
        for s, u, b in captured:
            print(s, u)
        # save full bodies
        with open(f"C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_api_{name}.txt", "w", encoding="utf-8") as f:
            for s, u, b in captured:
                f.write(f"=== {s} {u}\n{b}\n\n")
        page.close()

    browser.close()
