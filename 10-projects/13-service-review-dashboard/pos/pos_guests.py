# -*- coding: utf-8 -*-
r"""
신세계 Cloud POS BackOffice → 매장별·일자별 고객수(객수) 수집 → data/pos/guests.json

로그인: pos_config.json 의 사번·비밀번호로 자동 로그인(무인 실행용). 저장된 세션(pos_state.json)이
살아 있으면 로그인 없이 재사용하고, 만료됐으면 다시 로그인해 세션을 갱신한다.
OTP 가 요구되면 무인 로그인은 불가 → 로그에 남기고 종료(그때만 pos_login.py 를 창 띄워 실행).

사용: python pos/pos_guests.py                  # 지난주가 속한 달 1일~어제 (월요일 예약 실행)
      python pos/pos_guests.py 2026-10-01 2026-10-31
      python pos/pos_guests.py --probe          # 로그인 + 화면/통신 구조 덤프(pos/_probe/)

화면: 즐겨찾기 '일자별매출조회'(SLB001M) → 매장 미지정 조회 = 전 매장×일자 행, 객수=CUST_CNT.
요청 본문이 AES-GCM 암호화라 API 직접 호출 대신 WebSquare 컴포넌트 API(setValue·getRowJSON)로 화면 조회.
"""
import datetime
import io
import json
import os
import sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
URL = "https://cloudposoffice.shinsegae.com/"
STATE = os.path.join(HERE, "pos_state.json")
PROBE = os.path.join(HERE, "_probe")
OUT = os.path.join(ROOT, "data", "pos", "guests.json")



# 이 PC 시간대가 한국이 아닐 수 있음(미국 출장 등) → 날짜 계산은 항상 한국 시간 기준
KST = datetime.timezone(datetime.timedelta(hours=9))


def kst_now():
    return datetime.datetime.now(KST)

def is_login_page(pg):
    try:
        el = pg.query_selector("#mf_ibx_empCd")
        return el is not None and el.is_visible()
    except Exception:
        return True


def do_login(pg, cfg, wait_sec=60):
    pg.wait_for_selector("#mf_ibx_empCd", timeout=30000)
    # WebSquare 컴포넌트는 DOM value 만 바꾸면 바인딩이 안 됨 → 컴포넌트 API 로 값 설정
    pg.evaluate("""([e, p]) => {
        const set = (id, v) => { const c = window.WebSquare && WebSquare.util.getComponentById(id);
            if (c && c.setValue) c.setValue(v);
            const el = document.getElementById(id); if (el) { el.value = v;
            el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); el.dispatchEvent(new Event('blur')); } };
        set('mf_ibx_empCd', e); set('mf_sct_password', p);
    }""", [cfg["emp"], cfg["pw"]])
    pg.click("#mf_btn_login")
    for _ in range(wait_sec):
        pg.wait_for_timeout(1000)
        if not is_login_page(pg):
            return True
        otp = pg.query_selector("#mf_ibx_optAuthNo")
        if otp and otp.is_visible():
            print("[!] OTP 인증 요구 — 무인 로그인 불가. pos_login.py 를 실행해 직접 인증하세요.")
            return False
    return False


def open_session(p, headless=True):
    cfg = json.load(open(os.path.join(HERE, "pos_config.json"), encoding="utf-8"))
    b = p.chromium.launch(headless=headless)
    ctx = b.new_context(viewport={"width": 1600, "height": 950},
                        storage_state=STATE if os.path.exists(STATE) else None)
    pg = ctx.new_page()
    reqs = []
    pg.on("requestfinished", lambda r: reqs.append(r))
    pg.goto(URL, wait_until="networkidle", timeout=60000)
    pg.wait_for_timeout(2500)
    if is_login_page(pg):
        print("로그인 중…")
        if not do_login(pg, cfg):
            b.close()
            raise SystemExit("[ERR] 로그인 실패")
        pg.wait_for_load_state("networkidle")
        pg.wait_for_timeout(3000)
    ctx.storage_state(path=STATE)
    print("[OK] 로그인 상태 · 세션 저장")
    return b, ctx, pg, reqs


def dump_requests(reqs, name):
    os.makedirs(PROBE, exist_ok=True)
    out = []
    for r in reqs:
        if r.resource_type not in ("xhr", "fetch", "document"):
            continue
        item = {"url": r.url, "method": r.method, "type": r.resource_type, "post": (r.post_data or "")[:3000]}
        try:
            resp = r.response()
            item["status"] = resp.status if resp else None
            item["body"] = (resp.text() if resp else "")[:4000]
        except Exception as e:
            item["body"] = f"<{e}>"
        out.append(item)
    json.dump(out, open(os.path.join(PROBE, name), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"    통신 {len(out)}건 → _probe/{name}")


def probe():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b, ctx, pg, reqs = open_session(p)
        dump_requests(reqs, "01_login_main.json")
        open(os.path.join(PROBE, "01_main.html"), "w", encoding="utf-8").write(pg.content())
        open(os.path.join(PROBE, "01_main.txt"), "w", encoding="utf-8").write(pg.inner_text("body"))
        b.close()
    print("[OK] 탐색 덤프 완료 — Claude 가 이 결과로 고객수 수집 단계를 완성합니다.")


MENU = "mf_wfm_side_gen_fav_0_btn_fav"          # 즐겨찾기 '일자별매출조회' (SLB001M)
P = "mf_tac_layout_contents_003002001_body_"    # 일자별매출조회 화면 컴포넌트 접두어
CLICK = """(id)=>{const e=document.getElementById(id);
  ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(t=>e.dispatchEvent(new MouseEvent(t,{bubbles:true})));}"""
START = "2026-10-01"   # 주차별 리뷰순위 시작월


def open_daily_sales(pg):
    favs = pg.evaluate("""()=>[...document.querySelectorAll('[id^=mf_wfm_side_gen_fav_][id$=_btn_fav]')]
                          .map(e=>[e.id,e.innerText.trim()])""")
    fid = next((i for i, t in favs if t == "일자별매출조회"), MENU)
    pg.evaluate(CLICK, fid)
    pg.wait_for_selector("#" + P + "btn_SSearch", state="attached", timeout=30000)
    pg.wait_for_timeout(2500)


def fetch(pg, d0, d1):
    """매장 미지정(전 매장) 조회 → [{TNANT_CD, TNANT_CD_NM, SALE_DATE, CUST_CNT}] (최대 31일씩)"""
    pg.evaluate("""([P,a,b])=>{const g=id=>WebSquare.util.getComponentById(P+id);
        g('ibx_sTnantCd').setValue(''); g('ibx_sTnantCdNm').setValue('');
        g('ica_startDate').setValue(a); g('ica_endDate').setValue(b);}""",
                [P, d0.strftime("%Y%m%d"), d1.strftime("%Y%m%d")])
    pg.evaluate("(P)=>{const g=WebSquare.util.getComponentById(P+'grd_tab1'); g.setNoResultMessage && 0; window.__posN=-1;}", P)
    pg.evaluate(CLICK, P + "btn_SSearch")
    rows, last = [], -1
    for _ in range(90):                     # 조회 완료 대기 (행 수가 안정되면 끝)
        pg.wait_for_timeout(1000)
        n = pg.evaluate("(P)=>WebSquare.util.getComponentById(P+'grd_tab1').getRowCount()", P)
        if n and n == last:
            break
        last = n
    rows = pg.evaluate("""(P)=>{const g=WebSquare.util.getComponentById(P+'grd_tab1'); const out=[];
        for(let i=0;i<g.getRowCount();i++){const r=g.getRowJSON(i);
          out.push({cd:r.TNANT_CD, nm:r.TNANT_CD_NM, d:r.SALE_DATE, c:r.CUST_CNT, total:r.TOTAL_CNT});}
        return out;}""", P)
    if rows and rows[0].get("total") and rows[0]["total"] > len(rows):
        print(f"    ⚠ 화면 행 {len(rows)} < 전체 {rows[0]['total']} — 기간을 줄여 재조회 필요")
    return rows


def collect(d0, d1):
    from playwright.sync_api import sync_playwright
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    try:
        g = json.load(open(OUT, encoding="utf-8"))
    except (OSError, ValueError):
        g = {"stores": {}, "codes": {}}
    with sync_playwright() as p:
        b, ctx, pg, _ = open_session(p)
        open_daily_sales(pg)
        cur = d0
        while cur <= d1:
            end = min(d1, cur + datetime.timedelta(days=6))     # 1주씩 끊어 조회(행 수 제한 대비)
            rows = fetch(pg, cur, end)
            for r in rows:
                if not r["nm"] or not r["d"]:
                    continue
                d = f"{r['d'][:4]}-{r['d'][4:6]}-{r['d'][6:8]}"
                g["stores"].setdefault(r["nm"], {})[d] = int(r["c"] or 0)
                g["codes"][r["nm"]] = r["cd"]
            print(f"  {cur}~{end}: {len(rows)}행 · 매장 {len({r['nm'] for r in rows})}")
            cur = end + datetime.timedelta(days=1)
        ctx.storage_state(path=STATE)
        b.close()
    g["updated"] = kst_now().strftime("%Y-%m-%d %H:%M")
    g["range"] = [min(min(v) for v in g["stores"].values()), max(max(v) for v in g["stores"].values())] if g["stores"] else None
    json.dump(g, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"[OK] guests.json · 매장 {len(g['stores'])} · {g['range']}")


def main():
    if "--probe" in sys.argv:
        return probe()
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    yday = kst_now().date() - datetime.timedelta(days=1)
    if len(args) >= 2:
        d0, d1 = (datetime.date.fromisoformat(a) for a in args[:2])
    else:   # 기본: 지난주가 속한 달 1일(최소 START) ~ 어제 — 월 최종까지 매번 다시 맞춘다
        lw = kst_now().date() - datetime.timedelta(days=7)
        d0 = max(datetime.date.fromisoformat(START), lw.replace(day=1))
        d1 = yday
    print(f"[POS 고객수] {d0} ~ {d1}")
    collect(d0, d1)


if __name__ == "__main__":
    main()
