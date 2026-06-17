# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

REPORT_URL = "https://restaurantreports.spoton.com/search?startDate=06-09-2026&endDate=06-16-2026&comparisonPeriod=12-25-2025&location_key=1818994375889661568"
USER = "eg231478@samchully.co.kr"
PW = "Cjk851219!"
STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    # 1) login via the okta form (mirror the working standalone flow)
    page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("input[name='identifier']", timeout=40000)
    page.fill("input[name='identifier']", USER)
    page.fill("input[name='credentials.passcode']", PW)
    try:
        page.check("input[name='rememberMe']")
    except Exception:
        pass
    page.click("input[type='submit']")
    # wait until we land back on the app (dashboard or search), not the auth domain
    page.wait_for_function(
        "() => location.host.includes('restaurantreports.spoton.com') && !location.pathname.includes('login')",
        timeout=60000,
    )
    page.wait_for_timeout(4000)
    ctx.storage_state(path=STATE)
    print("AFTER_LOGIN_URL:", page.url)

    # 2) navigate to the report search url
    page.goto(REPORT_URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(10000)
    print("FINAL_URL:", page.url)
    print("TITLE:", page.title())

    # 3) dump tables
    tables = page.query_selector_all("table")
    print("NUM_TABLES:", len(tables))
    for ti, t in enumerate(tables):
        print(f"===== TABLE {ti} =====")
        for r in t.query_selector_all("tr"):
            cells = r.query_selector_all("th,td")
            vals = [(c.inner_text() or '').strip().replace("\n", " ") for c in cells]
            if any(vals):
                print(" | ".join(vals))

    print("\n===== BODY TEXT =====")
    print(page.inner_text("body"))
    page.screenshot(path="C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_report.png", full_page=True)
    browser.close()
