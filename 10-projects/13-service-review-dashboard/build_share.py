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
import re

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
    pat = re.compile(r'<script\b[^>]*\bsrc=["\']' + re.escape(filename) + r'["\'][^>]*></script>')
    repl = "<script>\n" + content + "\n</script>"
    new, n = pat.subn(lambda m: repl, html, count=1)
    if n == 0:
        raise SystemExit(f"[ERR] {filename} 스크립트 태그를 찾지 못했습니다.")
    return new


def main():
    html = read("dashboard.html")

    # 1) 외부 JS 인라인
    for fn in ("echarts.min.js", "data.js", "ai_notes.js", "eck_data.js", "kpi_data.js",
               "incentive_data.js", "manuals_data.js", "manuals_mot.js", "manuals_svc.js",
               "manuals_images.js", "campaign_data.js", "weekly_rank.js"):
        if os.path.exists(os.path.join(HERE, fn)):
            html = inline_script(html, fn)
        else:
            # 아직 없는 선택 데이터(예: 사진 미반입 시 manuals_images.js) → 태그를 빈 스크립트로.
            # 남겨두면 공유본이 존재하지 않는 파일을 참조해 '외부 참조'로 잡힌다.
            html = re.sub(
                r'<script\b[^>]*\bsrc=["\']' + re.escape(fn) + r'["\'][^>]*></script>',
                f"<script>/* {fn} 없음 — 해당 기능은 표시되지 않습니다 */</script>",
                html, count=1)

    # 2) memos.js(공유 의견 파일)은 동봉하지 않음 → 빈 MEMOS 로 대체
    html = re.sub(
        r'<script\b[^>]*\bsrc=["\']memos\.js["\'][^>]*></script>',
        "<script>window.MEMOS=window.MEMOS||null;</script>",
        html, count=1,
    )

    # 3) 로컬 이미지(로고·매뉴얼 사진 등) → data URI. 배포는 index.html 단일 파일만 올리므로
    #    <img src="..."> 가 하나라도 남으면 공유본에서 이미지가 깨진다.
    MIME = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".gif": "image/gif", ".svg": "image/svg+xml", ".webp": "image/webp"}

    def to_data_uri(m):
        src = m.group("src")
        if src.startswith(("data:", "http://", "https://", "//")):
            return m.group(0)
        if "${" in src:                      # 인라인된 JS 템플릿 리터럴 (예: src="${esc(im.file)}")
            return m.group(0)                # → 실제 경로는 아래 asset 치환에서 처리한다
        path = os.path.join(HERE, src.replace("/", os.sep))
        if not os.path.exists(path):
            print(f"[!] 이미지 없음 — 인라인 건너뜀: {src}")
            return m.group(0)
        mime = MIME.get(os.path.splitext(path)[1].lower())
        if not mime:
            print(f"[!] 지원하지 않는 이미지 형식: {src}")
            return m.group(0)
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        print(f"    이미지 인라인: {src} ({os.path.getsize(path)/1024:,.0f} KB)")
        return m.group(0).replace(src, f"data:{mime};base64,{b64}", 1)

    html = re.sub(r'<img\b[^>]*?\bsrc=["\'](?P<src>[^"\']+)["\']', to_data_uri, html)

    # 3-b) JS 데이터가 들고 있는 경로(manuals_images.js 의 "assets/manual/xxx.jpg")도 data URI 로.
    #      <img src="..."> 형태가 아니라 위 정규식에 안 잡히므로 따로 치환한다.
    def asset_to_data_uri(m):
        src = m.group(1)
        path = os.path.join(HERE, src.replace("/", os.sep))
        if not os.path.exists(path):
            return m.group(0)
        mime = MIME.get(os.path.splitext(path)[1].lower())
        if not mime:
            return m.group(0)
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode("ascii")
        print(f"    매뉴얼 사진 인라인: {src} ({os.path.getsize(path)/1024:,.0f} KB)")
        return '"data:%s;base64,%s"' % (mime, b64)

    html = re.sub(r'"(assets/(?:manual|campaign)/[^"]+)"', asset_to_data_uri, html)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)

    size = os.path.getsize(OUT) / 1024
    print(f"[OK] {os.path.basename(OUT)} 생성 ({size:,.0f} KB), 단일 파일/외부 의존 없음")
    # 남은 외부 참조 점검 (실제 외부 src 속성만; 인라인된 JS 내부 문자열 오탐 제외)
    leftover = re.findall(
        r'<script[^>]*\ssrc\s*=\s*["\'][^"\']+["\']'
        r'|<img[^>]*\ssrc\s*=\s*["\'](?!data:|\$\{)[^"\']+["\']',   # ${...} 는 JS 템플릿이라 제외
        html)
    if leftover:
        print(f"[!] 남은 외부 참조 {len(leftover)}건 - 확인 필요")
    else:
        print("[OK] 외부 참조 없음 (완전 포터블)")


if __name__ == "__main__":
    main()
