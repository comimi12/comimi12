# -*- coding: utf-8 -*-
r"""
매뉴얼 사진 반입기 — 정식 반출한 이미지를 대시보드 뷰에 꽂는다.

배경
  교육팀 원본은 Fasoo DRM 이라 PowerPoint/Acrobat 의 이미지 내보내기 결과물이
  다시 DRM 으로 재암호화된다(실측: 슬라이드 PNG 344KB → 매직바이트 0x9b).
  따라서 자동 추출은 불가. **정식 반출로 뽑아 온 평문 이미지**만 이 스크립트로 반입한다.

사용
  1) 원본에서 필요한 사진을 파수 정식 절차로 반출
  2) 00-inbox/secure-export/manual-images/ 에 넣는다.
     파일명 앞에 슬롯 ID 를 붙이면 자동으로 그 자리에 들어간다.  예) hair-1_어쩌고.png
     (슬롯 목록은 --slots 로 확인)
  3) python manuals_images.py            # 반입 → assets/manual/ + manuals_images.js
     python manuals_images.py --mosaic hair-1:120,80,90,70
                                          # 특정 슬롯의 지정 영역(x,y,w,h)을 모자이크

옵션
  --slots            정의된 슬롯과 현재 채움 상태만 출력
  --mosaic S:x,y,w,h 해당 슬롯 이미지의 사각 영역을 모자이크 (여러 번 지정 가능)
  --max-width N      긴 변 축소 기준 (기본 1200px)

결과: manuals_images.js (window.MANUAL_IMAGES). 슬롯이 비어 있으면 뷰에서 그 자리는 그냥 생략된다.
"""
import io
import json
import os
import re
import shutil
import sys
import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
WORKSPACE = os.path.abspath(os.path.join(HERE, "..", ".."))
INBOX = os.path.join(WORKSPACE, "00-inbox", "secure-export", "manual-images")
ASSETS = os.path.join(HERE, "assets", "manual")
OUT = os.path.join(HERE, "manuals_images.js")

MAX_WIDTH = 1200
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp"}

# 뷰에 마련된 사진 자리. manuals_svc.js 의 figure 블록이 이 ID 로 사진을 찾는다.
SLOTS = [
    ("firstimpression", "Ⅰ 용모·복장", "첫인상 관리 (용모/복장) 참고자료"),
    ("expression",      "Ⅰ 용모·복장", "표정의 연출 — 밝은 표정의 효과"),
    ("uniform-f",       "Ⅰ 용모·복장", "여직원 유니폼 착장 기준"),
    ("uniform-m",       "Ⅰ 용모·복장", "남직원 유니폼 착장 기준"),
    ("hair-f",          "Ⅰ 용모·복장", "여직원 헤어 기준"),
    ("hair-m",          "Ⅰ 용모·복장", "남직원 헤어 기준"),
    ("hair-pin",        "Ⅰ 용모·복장", "삔·망 사용 방법"),
    ("nail",            "Ⅰ 용모·복장", "손톱 / 액세서리 기준"),
    ("phone-3",         "Ⅱ 전화 응대", "전화응대의 3원칙"),
    ("claim-5",         "Ⅲ 클레임 대응", "고객 복원 5단계 도식"),
    ("claim-3min",      "Ⅲ 클레임 대응", "3분 이내 클레임 처리"),
    ("voc-flow",        "Ⅲ 클레임 대응", "VOC 운영 방안 흐름도"),
    ("voc-reply",       "Ⅲ 클레임 대응", "고객 답변 작성 시 주의 사항"),
    ("vip",             "Ⅳ VIP 서비스", "VIP 응대 참고 이미지"),
    ("greeting",        "Ⅴ 인사",       "인사 자세 기준"),
    ("golf-poster",     "행사 응대",     "우승 기념 행사 안내물"),
]
SLOT_IDS = [s[0] for s in SLOTS]


def is_plain_image(path):
    """Fasoo DRM 으로 재암호화된 파일인지 매직바이트로 거른다."""
    try:
        with open(path, "rb") as f:
            h = f.read(12)
    except OSError:
        return False, "읽기 실패"
    if h[:8] == b"\x89PNG\r\n\x1a\n":
        return True, "PNG"
    if h[:3] == b"\xff\xd8\xff":
        return True, "JPG"
    if h[:4] == b"RIFF" and h[8:12] == b"WEBP":
        return True, "WEBP"
    if h[:6] in (b"GIF87a", b"GIF89a"):
        return True, "GIF"
    if h[:2] == b"BM":
        return True, "BMP"
    if h[:1] == b"\x9b":
        return False, "Fasoo DRM (정식 반출 필요)"
    return False, "알 수 없는 형식 " + h[:4].hex()


def slot_of(filename):
    stem = os.path.splitext(os.path.basename(filename))[0].lower()
    for sid in sorted(SLOT_IDS, key=len, reverse=True):
        if stem == sid or stem.startswith(sid + "_") or stem.startswith(sid + "-"):
            return sid
    return None


def mosaic(im, box, blocks=7):
    """지정 사각형(x,y,w,h)을 블록 모자이크 처리.
       확대할 때 NEAREST 를 써야 블록이 뭉개지지 않고 형태가 확실히 지워진다
       (기본 보간으로 늘리면 흐릿해질 뿐 눈코입 윤곽이 남는다)."""
    from PIL import Image as _Image
    x, y, w, h = box
    x, y = max(0, x), max(0, y)
    w, h = min(w, im.width - x), min(h, im.height - y)
    if w <= 0 or h <= 0:
        return im
    region = im.crop((x, y, x + w, y + h))
    bw = max(1, blocks)
    bh = max(1, round(blocks * h / max(1, w)))
    small = region.resize((bw, bh), _Image.BOX)          # 평균으로 축소
    im.paste(small.resize((w, h), _Image.NEAREST), (x, y))   # 각진 블록으로 확대
    return im


def main():
    args = sys.argv[1:]
    if "--slots" in args:
        have = {}
        if os.path.isdir(INBOX):
            for f in os.listdir(INBOX):
                s = slot_of(f)
                if s:
                    have[s] = f
        print(f"사진 반입 폴더: {INBOX}\n")
        print(f"{'슬롯 ID':<18}{'장':<16}{'설명':<34}상태")
        print("-" * 96)
        for sid, ch, desc in SLOTS:
            print(f"{sid:<18}{ch:<16}{desc:<34}{'✅ ' + have[sid] if sid in have else '— 비어 있음'}")
        return 0

    mos = {}
    for i, a in enumerate(args):
        if a == "--mosaic" and i + 1 < len(args):
            sid, _, box = args[i + 1].partition(":")
            try:
                mos.setdefault(sid, []).append(tuple(int(v) for v in box.split(",")))
            except ValueError:
                print(f"[무시] 모자이크 좌표 형식 오류: {args[i+1]} (S:x,y,w,h)")
    maxw = MAX_WIDTH
    if "--max-width" in args:
        try:
            maxw = int(args[args.index("--max-width") + 1])
        except (IndexError, ValueError):
            pass

    os.makedirs(INBOX, exist_ok=True)
    os.makedirs(ASSETS, exist_ok=True)

    files = [f for f in os.listdir(INBOX)
             if os.path.splitext(f)[1].lower() in EXTS] if os.path.isdir(INBOX) else []
    if not files:
        print(f"[안내] 반입할 사진이 없습니다.\n       {INBOX}\n"
              f"       에 정식 반출한 이미지를 넣고 다시 실행하세요. (슬롯 확인: --slots)")

    from PIL import Image

    manifest, skipped = {}, []
    for f in sorted(files):
        src = os.path.join(INBOX, f)
        ok, why = is_plain_image(src)
        if not ok:
            skipped.append((f, why))
            continue
        sid = slot_of(f)
        if not sid:
            skipped.append((f, "슬롯 ID 를 파일명 앞에 붙여주세요 (예: hair-f_사진.png)"))
            continue
        try:
            im = Image.open(src)
            im.load()
        except Exception as e:
            skipped.append((f, f"이미지 열기 실패 {type(e).__name__}"))
            continue
        if im.mode not in ("RGB", "RGBA"):
            im = im.convert("RGB")
        for box in mos.get(sid, []):
            im = mosaic(im, box)
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)))
        dst_name = f"{sid}.jpg"
        dst = os.path.join(ASSETS, dst_name)
        im.convert("RGB").save(dst, "JPEG", quality=86, optimize=True)
        desc = next((d for s, _, d in SLOTS if s == sid), sid)
        manifest[sid] = {"file": f"assets/manual/{dst_name}", "cap": desc,
                         "w": im.width, "h": im.height,
                         "mosaic": len(mos.get(sid, []))}
        print(f"[반입] {sid:<18} {im.width}×{im.height}"
              + (f"  모자이크 {len(mos[sid])}곳" if sid in mos else "")
              + f"  ← {f}")

    with open(OUT, "w", encoding="utf-8") as fp:
        fp.write("window.MANUAL_IMAGES = " + json.dumps(
            {"generated": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"), "slots": manifest},
            ensure_ascii=False, indent=1) + ";\n")

    print(f"\n[OK] manuals_images.js — 사진 {len(manifest)}/{len(SLOTS)} 슬롯")
    if skipped:
        print(f"[건너뜀] {len(skipped)}건")
        for f, why in skipped:
            print(f"   · {f} — {why}")
    print("     다음: python build_share.py → python deploy_site.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
