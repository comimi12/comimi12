# -*- coding: utf-8 -*-
"""
ECK(Solbitech SLNC) 자동 로그인 → 점포점검 리포트 60(CS 체크리스트)/59(QSCS 교육일지)
Excel 내보내기를 받아 data/eck/ 에 저장.

사용:
  python eck/eck_scrape.py                    # 이번 달, 두 리포트 모두
  python eck/eck_scrape.py 2026-05            # 특정 월
  python eck/eck_scrape.py 2026-01 2026-06    # 기간(월별 전부) — 두 달 인자 = 범위
  python eck/eck_scrape.py 2026-06 cs         # 특정 리포트만 (cs|qscs)
  python eck/eck_scrape.py 2026-01 2026-06 qscs  # 범위 + 특정 리포트

자격증명은 eck/eck_config.json (gitignore) 에서 읽음.
"""
import sys, io, os, json, time, datetime, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DL = os.path.join(HERE, "_dl"); os.makedirs(DL, exist_ok=True)
OUT = os.path.join(ROOT, "data", "eck"); os.makedirs(OUT, exist_ok=True)
CFG = json.load(open(os.path.join(HERE, "eck_config.json"), encoding="utf-8"))


def month_range(a, b):
    ya, ma = map(int, a.split("-")); yb, mb = map(int, b.split("-"))
    out = []; y, m = ya, ma
    while (y, m) <= (yb, mb):
        out.append(f"{y:04d}-{m:02d}")
        m += 1
        if m > 12:
            m = 1; y += 1
    return out


_args = sys.argv[1:]
_months = [a for a in _args if re.match(r"^\d{4}-\d{2}$", a)]
_reports = [a for a in _args if a in ("cs", "qscs")]
if len(_months) >= 2:
    MONTHS = month_range(min(_months), max(_months))
elif len(_months) == 1:
    MONTHS = [_months[0]]
else:
    MONTHS = [datetime.date.today().strftime("%Y-%m")]
ONLY = _reports[0] if _reports else None


def login(pg):
    pg.on("dialog", lambda d: d.accept())
    pg.goto(CFG["url"], wait_until="networkidle", timeout=60000)
    if pg.query_selector("#loginSubmit"):
        pg.fill("#user_security_key", CFG["user"])
        pg.fill("#user_security_value", CFG["password"])
        pg.click("#loginSubmit")
        time.sleep(4)
        pg.wait_for_load_state("networkidle", timeout=30000)
    if pg.query_selector("#loginSubmit"):
        raise SystemExit("[ERR] 로그인 실패 — 자격증명 확인")


def ecf(pg):
    return next((f for f in pg.frames if f.name == "eCheckFormFrame"), pg.main_frame)


def open_list(pg):
    # 깨끗한 상태로 복귀: 메인 재로드(세션 유지됨) → 좌측 메뉴 클릭
    try:
        pg.goto(CFG["url"], wait_until="networkidle", timeout=40000)
    except Exception:
        pass
    time.sleep(1.5)
    mf = pg.main_frame
    for txt in ["조회 및 통계", "점포 점검"]:
        try:
            mf.get_by_text(txt, exact=False).first.click(timeout=3000); time.sleep(1)
        except Exception:
            pass
    # 목록 표(코드 행)가 나타날 때까지 대기 (프레임 재취득)
    for _ in range(25):
        fr = ecf(pg)
        try:
            has = fr.evaluate("""()=>{for(const tr of document.querySelectorAll('tr')){
                const t=[...tr.querySelectorAll('td')].map(td=>td.innerText.trim());
                if(t.includes('59')||t.includes('60')) return true;} return false;}""")
        except Exception:
            has = False
        if has:
            break
        time.sleep(0.6)


def open_report(pg, code):
    fr = ecf(pg)
    ok = fr.evaluate("""(code)=>{
        for(const tr of document.querySelectorAll('tr')){
            const tds=[...tr.querySelectorAll('td')];
            if(tds.map(td=>td.innerText.trim()).includes(code)){
                const b=tr.querySelector('button,a,[onclick]'); if(b){b.click(); return true;}
            }
        } return false;
    }""", code)
    if not ok:
        raise SystemExit(f"[ERR] 코드 {code} 행을 목록에서 찾지 못함")
    time.sleep(3.5)
    try: pg.wait_for_load_state("networkidle", timeout=20000)
    except Exception: pass


def run_search(pg, month):
    fr = ecf(pg)
    # 월 설정 (readonly datepicker → JS로 값 주입)
    fr.evaluate("""(m)=>{const el=document.querySelector('input[name=inq_month]');
        if(el){el.removeAttribute('readonly'); el.value=m;
        el.dispatchEvent(new Event('change',{bubbles:true})); el.dispatchEvent(new Event('blur',{bubbles:true}));}}""", month)
    time.sleep(0.3)
    fr.evaluate("""()=>{const c=[...document.querySelectorAll('button,a')].find(e=>/rose/i.test(e.className)); if(c)c.click();}""")
    time.sleep(5)
    try: pg.wait_for_load_state("networkidle", timeout=25000)
    except Exception: pass


def export_excel(pg, key, code, month):
    rf = next((f for f in pg.frames if f.name == "reportFrame"), None)
    if not rf:
        raise SystemExit(f"[ERR] {key}: reportFrame 없음 (조회 결과 미생성)")
    dest = os.path.join(OUT, f"{key}_{month}.xlsx")
    try:
        with pg.expect_download(timeout=30000) as di:
            rf.evaluate("""()=>{ if(typeof ExcelConvert==='function'){ExcelConvert();}
                else{const a=[...document.querySelectorAll('a,button')].find(e=>/EXCEL/i.test(e.innerText)); if(a)a.click();} }""")
        dl = di.value
        dl.save_as(dest)
        print(f"[OK] {key}(코드 {code}) → {os.path.relpath(dest, ROOT)}  ({os.path.getsize(dest)//1024} KB)")
        return dest
    except Exception as e:
        # 다운로드가 새 탭/창으로 뜨는 경우 대비
        print(f"[!] {key} 다운로드 실패: {type(e).__name__} {e}")
        return None


def main():
    targets = CFG["reports"]
    if ONLY:
        targets = {ONLY: CFG["reports"][ONLY]}
    print(f"[ECK] months={MONTHS}, reports={list(targets)}")
    with sync_playwright() as p:
        br = p.chromium.launch(headless=True)
        ctx = br.new_context(ignore_https_errors=True, accept_downloads=True,
                             viewport={"width": 1600, "height": 1050})
        pg = ctx.new_page()
        login(pg); print("[OK] 로그인")
        for key, meta in targets.items():
            # 리포트 1회 열고 월만 바꿔가며 조회·내보내기
            open_list(pg)
            open_report(pg, meta["code"])
            for month in MONTHS:
                run_search(pg, month)
                export_excel(pg, key, meta["code"], month)
        ctx.storage_state(path=os.path.join(HERE, "eck_state.json"))
        br.close()
    print("[done]")


if __name__ == "__main__":
    main()
