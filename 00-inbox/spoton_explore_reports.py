# -*- coding: utf-8 -*-
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(storage_state=STATE)
    page = ctx.new_page()

    api_calls = []
    def on_resp(resp):
        url = resp.url
        ct = resp.headers.get("content-type", "")
        if "/api/" in url and "json" in ct:
            api_calls.append((resp.status, url))
    page.on("response", on_resp)

    page.goto("https://restaurantreports.spoton.com/dashboard", wait_until="domcontentloaded", timeout=60000)
    page.wait_for_timeout(8000)
    print("URL:", page.url)

    # dump nav links
    print("===== NAV LINKS =====")
    for a in page.query_selector_all("a"):
        href = a.get_attribute("href")
        txt = (a.inner_text() or "").strip().replace("\n", " ")
        if href:
            print(f"{txt[:30]} -> {href}")

    print("\n===== API CALLS (dashboard) =====")
    for s, u in api_calls:
        print(s, u)

    browser.close()
