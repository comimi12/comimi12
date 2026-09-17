# -*- coding: utf-8 -*-
"""메뉴 카드용 축소본 생성: src/img/*  ->  src/img/t/*.jpg (긴 변 360px).

카드는 화면에서 180px 안팎으로 보이는데 원본은 1000px·평균 115KB다.
메뉴 탭 한 화면이 3.7MB씩 내려받는 원인이라 카드용 축소본을 따로 둔다.
상세(시트)와 SOP 본문 사진은 원본을 그대로 쓴다.
"""
import os, sys, glob
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(HERE), "src", "img")
DST = os.path.join(SRC, "t")
MAX = 360


def main():
    os.makedirs(DST, exist_ok=True)
    made = skipped = 0
    before = after = 0
    for f in glob.glob(os.path.join(SRC, "*.*")):
        name = os.path.splitext(os.path.basename(f))[0] + ".jpg"
        out = os.path.join(DST, name)
        before += os.path.getsize(f)
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(f):
            after += os.path.getsize(out)
            skipped += 1
            continue
        im = Image.open(f)
        if im.mode not in ("RGB",):
            im = im.convert("RGB")
        im.thumbnail((MAX, MAX), Image.LANCZOS)
        im.save(out, "JPEG", quality=72, optimize=True, progressive=True)
        after += os.path.getsize(out)
        made += 1
    print("[OK] 축소본 %d개 생성 / %d개 유지" % (made, skipped))
    print("     원본 %.1f MB  ->  축소본 %.1f MB" % (before / 1e6, after / 1e6))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
