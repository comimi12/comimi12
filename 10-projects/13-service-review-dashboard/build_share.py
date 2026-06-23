# -*- coding: utf-8 -*-
"""
공유용 단일 파일 생성기.
dashboard.html 이 외부로 불러오는 echarts.min.js / data.js / ai_notes.js / logo.png 를
하나의 HTML 안에 인라인하여 어디서든 더블클릭으로 열리는 포터블 파일(dashboard-share.html)을 만든다.

사용: python build_share.py   (먼저 build.py 로 data.js 를 최신화한 뒤 실행)

⚠️ 결과 파일에는 SL&C VOC 원문(작성자 마스킹됨)이 그대로 포함된다. 외부 공유 시 개인정보 유의.
"""
import base64
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "dashboard.html")
OUT = os.path.join(HERE, "dashboard-share.html")


def read(name):
    with open(os.path.join(HERE, name), "r", encoding="utf-8") as f:
        return f.read()


def inline_script(html, filename):
    """<script src="filename"...></script> → 내용 인라인."""
    content = read(filename)
    # src 속성으로 시작하는 해당 태그를 찾아 통째로 교체 (속성 순서 무관하게 src="filename" 기준)
    import re
    pat = re.compile(r'<script\b[^>]*\bsrc=["\']' + re.escape(filename) + r'["\'][^>]*></script>')
    repl = "<script>\n" + content + "\n</script>"
    new, n = pat.subn(lambda m: repl, html, count=1)
    if n == 0:
        raise SystemExit(f"[ERR] {filename} 스크립트 태그를 찾지 못했습니다.")
    return new


def main():
    html = read("dashboard.html")

    # 1) 외부 JS 인라인
    for fn in ("echarts.min.js", "data.js", "ai_notes.js", "eck_data.js"):
        if os.path.exists(os.path.join(HERE, fn)):
            html = inline_script(html, fn)

    # 2) memos.js(공유 의견 파일)은 동봉하지 않음 → 빈 MEMOS 로 대체
    import re
    html = re.sub(
        r'<script\b[^>]*\bsrc=["\']memos\.js["\'][^>]*></script>',
        "<script>window.MEMOS=window.MEMOS||null;</script>",
        html, count=1,
    )

    # 3) 로고 PNG → data URI
    logo_path = os.path.join(HERE, "logo.png")
    if os.path.exists(logo_path):
        with open(logo_path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        html = re.sub(
            r'<img\s+src=["\']logo\.png["\']',
            '<img src="data:image/png;base64,' + b64 + '"',
            html, count=1,
        )

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    size = os.path.getsize(OUT) / 1024
    print(f"[OK] {os.path.basename(OUT)} 생성 ({size:,.0f} KB), 단일 파일/외부 의존 없음")
    # 남은 외부 참조 점검 (실제 외부 src 속성만; 인라인된 JS 내부 문자열 오탐 제외)
    leftover = re.findall(
        r'<script[^>]*\ssrc\s*=\s*["\'][^"\']+["\']|<img[^>]*\ssrc\s*=\s*["\'](?!data:)[^"\']+["\']',
        html)
    if leftover:
        print(f"[!] 남은 외부 참조 {len(leftover)}건 - 확인 필요")
    else:
        print("[OK] 외부 참조 없음 (완전 포터블)")


if __name__ == "__main__":
    main()
