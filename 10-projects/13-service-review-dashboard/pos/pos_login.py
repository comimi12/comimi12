# -*- coding: utf-8 -*-
r"""
신세계 Cloud POS BackOffice 로그인 → 세션 저장 (pos/pos_state.json)

창이 뜬 브라우저에서 pos_config.json 의 사번·비밀번호로 로그인한다.
OTP·비밀번호 변경 안내가 나오면 그 창에서 직접 처리하면 된다(최대 5분 대기).
로그인되면 세션(쿠키)을 pos_state.json 에 저장 → pos_guests.py 가 재사용.

사용: python pos/pos_login.py
"""
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)
HERE = os.path.dirname(os.path.abspath(__file__))
URL = "https://cloudposoffice.shinsegae.com/"
STATE = os.path.join(HERE, "pos_state.json")


def logged_in(pg):
    try:
        el = pg.query_selector("#mf_ibx_empCd")
        return el is None or not el.is_visible()
    except Exception:
        return False


def login(pg, cfg):
    pg.goto(URL, wait_until="networkidle", timeout=60000)
    pg.wait_for_selector("#mf_ibx_empCd", timeout=30000)
    # WebSquare 컴포넌트는 DOM value 만 바꾸면 바인딩이 안 됨 → 컴포넌트 API 로 값 설정
    pg.evaluate("""([e, p]) => {
        const g = id => (window.WebSquare && WebSquare.util.getComponentById(id));
        const set = (id, v) => { const c = g(id); if (c && c.setValue) c.setValue(v);
            const el = document.getElementById(id); if (el) { el.value = v;
            el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); el.dispatchEvent(new Event('blur')); } };
        set('mf_ibx_empCd', e); set('mf_sct_password', p);
    }""", [cfg["emp"], cfg["pw"]])
    pg.click("#mf_btn_login")


def main():
    from playwright.sync_api import sync_playwright
    cfg = json.load(open(os.path.join(HERE, "pos_config.json"), encoding="utf-8"))
    with sync_playwright() as p:
        b = p.chromium.launch(headless=False)
        ctx = b.new_context(viewport={"width": 1500, "height": 900})
        pg = ctx.new_page()
        login(pg, cfg)
        print("로그인 시도… OTP·안내창이 뜨면 브라우저 창에서 처리하세요 (최대 5분 대기)")
        for _ in range(300):
            pg.wait_for_timeout(1000)
            if logged_in(pg):
                pg.wait_for_timeout(4000)
                ctx.storage_state(path=STATE)
                print("[OK] 로그인 성공 → 세션 저장:", STATE)
                break
        else:
            print("[!] 5분 안에 로그인 화면을 벗어나지 못했습니다.")
        b.close()


if __name__ == "__main__":
    main()
