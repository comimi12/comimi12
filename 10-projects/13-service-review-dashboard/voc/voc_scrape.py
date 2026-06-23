# -*- coding: utf-8 -*-
"""
SLNC 고객의 소리(manager_tool) 자동 로그인 → 고객의소리 엑셀 내보내기 다운로드 → data/voc/.
사이트에서 직접 받으므로 DRM 미적용(평문) → build.py 의 VOC(View 3) 자동 갱신.

사용: python voc/voc_scrape.py
설정: voc/voc_config.json (url/id/password)
"""
import sys, io, os, json, glob, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import requests

MONTHS_BACK = 12  # 최근 N개월만 (대시보드 View 3 범위)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "data", "voc")
CFG = json.load(open(os.path.join(HERE, "voc_config.json"), encoding="utf-8"))
BASE = "https://www.slnc.co.kr/manager_tool"


def main():
    os.makedirs(OUT, exist_ok=True)
    s = requests.Session()
    s.headers["User-Agent"] = "Mozilla/5.0"
    r = s.post(f"{BASE}/login_ok.php",
               data={"admin_id": CFG["id"], "admin_pwd": CFG["password"]}, timeout=30)
    if "PHPSESSID" not in s.cookies:
        raise SystemExit("[ERR] 로그인 실패 (세션 쿠키 없음)")
    print("[OK] 로그인")
    # 최근 N개월 기간 지정
    today = datetime.date.today()
    y, m = today.year, today.month - (MONTHS_BACK - 1)
    while m <= 0:
        m += 12; y -= 1
    start = f"{y:04d}-{m:02d}-01"
    end = today.strftime("%Y-%m-%d")
    params = {
        "s_list_kind": "", "s_branch_name": "", "s_list_kind2": "", "s_list_kind3": "",
        "search_kind": "", "search_text": "", "board_name": "customer",
        "s_start_date": start, "s_end_date": end, "excel_page_count": "100000", "excel_page_num": "1",
    }
    print(f"[기간] {start} ~ {end}")
    # 옛 customer_list 파일 정리(최신 1개만 유지, DRM 잠긴 구파일 제거)
    for old in glob.glob(os.path.join(OUT, "customer_list*.xls")):
        try: os.remove(old)
        except OSError: pass
    er = s.get(f"{BASE}/customer/excel_customer_list.php", params=params, timeout=120)
    er.raise_for_status()
    dest = os.path.join(OUT, f"customer_list_{datetime.date.today():%Y%m%d}.xls")
    with open(dest, "wb") as f:
        f.write(er.content)
    head = er.content[:16]
    drm = head[:8].find(b"DRMONE") >= 0 or head[:1] == b"\x9b"
    print(f"[OK] 다운로드: {os.path.relpath(dest, ROOT)} ({len(er.content)//1024} KB) "
          f"{'⚠ DRM 의심' if drm else '평문'}")
    # 파싱 검증
    try:
        import warnings; warnings.filterwarnings("ignore")
        import pandas as pd
        tables = pd.read_html(dest)
        df = max(tables, key=lambda d: d.shape[0])
        print(f"[OK] 파싱 검증: {df.shape[0]}행 × {df.shape[1]}열")
    except Exception as e:
        print(f"[!] 파싱 실패: {type(e).__name__} {e}")
    print("[done]")


if __name__ == "__main__":
    main()
