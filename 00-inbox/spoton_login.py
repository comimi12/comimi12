import sys
from playwright.sync_api import sync_playwright

URL = "https://restaurantreports.spoton.com/search?startDate=06-09-2026&endDate=06-16-2026&comparisonPeriod=12-25-2025&location_key=1818994375889661568"
USER = "eg231478@samchully.co.kr"
PW = "Cjk851219!"
STATE = "C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_state.json"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    page.wait_for_selector("input[name='identifier']", timeout=30000)
    page.fill("input[name='identifier']", USER)
    page.fill("input[name='credentials.passcode']", PW)
    try:
        page.check("input[name='rememberMe']")
    except Exception:
        pass
    page.click("input[type='submit']")
    # wait to leave the auth domain
    try:
        page.wait_for_url("**restaurantreports.spoton.com**", timeout=45000)
    except Exception as e:
        print("WAIT_URL_FAIL:", e)
    page.wait_for_timeout(5000)
    print("URL_AFTER_LOGIN:", page.url)
    print("TITLE:", page.title())
    # check for error message
    body_text = page.inner_text("body")[:1500]
    print("BODY_SNIPPET_START>>>")
    print(body_text)
    print("<<<BODY_SNIPPET_END")
    ctx.storage_state(path=STATE)
    page.screenshot(path="C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_after_login.png", full_page=True)
    browser.close()
