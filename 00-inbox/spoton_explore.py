import sys
from playwright.sync_api import sync_playwright

URL = "https://restaurantreports.spoton.com/search?startDate=06-09-2026&endDate=06-16-2026&comparisonPeriod=12-25-2025&location_key=1818994375889661568"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()
    page.goto(URL, wait_until="domcontentloaded", timeout=60000)
    # wait for any input to appear (login form)
    try:
        page.wait_for_selector("input", timeout=30000)
    except Exception as e:
        print("no input yet:", e)
    page.wait_for_timeout(4000)
    print("URL_NOW:", page.url)
    print("TITLE:", page.title())
    for f in page.frames:
        try:
            inputs = f.query_selector_all("input")
        except Exception:
            continue
        for i, el in enumerate(inputs):
            print(f"[frame={f.url[:50]}] INPUT type={el.get_attribute('type')} name={el.get_attribute('name')} id={el.get_attribute('id')} placeholder={el.get_attribute('placeholder')}")
        buttons = f.query_selector_all("button")
        for i, el in enumerate(buttons):
            try:
                t = (el.inner_text() or '').strip()[:40]
            except Exception:
                t = ''
            print(f"[frame={f.url[:50]}] BUTTON text={t} type={el.get_attribute('type')} value={el.get_attribute('value')}")
    page.screenshot(path="C:/Users/owner/do-better-workspace-v2/00-inbox/spoton_login.png", full_page=True)
    browser.close()
