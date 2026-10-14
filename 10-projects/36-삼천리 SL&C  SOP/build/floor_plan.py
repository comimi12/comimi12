# -*- coding: utf-8 -*-
"""Brea Floor Plan PDF → 브랜드별 테이블 배치도 이미지 → STORE FACT SHEET 페이지에 삽입.

원본 PDF(3장): 1장=KSC 홀, 2장=KSC 바(사용자 지시로 제외), 3장=WASA 홀+야외 패티오.
각 장 오른쪽의 NOTES / SOLD OUT 빈 서식 칸은 잘라내고 배치도만 남긴다.

store_info.py 가 끝에서 apply() 를 호출하므로 extract → store_info 순서만 지키면 된다.
단독 실행도 가능:
    python build/floor_plan.py
"""
import json
import os

import fitz  # PyMuPDF
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, 'src', 'data.json')
IMGDIR = os.path.join(ROOT, 'src', 'img')
PDF = os.path.join(
    os.path.expanduser('~'), 'Desktop', '교육팀',
    '4. 신규매장매뉴얼, 교안', '오픈매장 매뉴얼', 'Brea Floor Plan 10.7.26.pdf')
PAGE_TITLE = 'STORE FACT SHEET'

# 덱 id → (PDF 페이지 번호, 잘라낼 영역 pt[x0,y0,x1,y1], 저장 파일명)
PLANS = {
    'ksc-manual': (1, (68, 64, 476, 581), 'floorplan-ksc.jpg'),
    'wasa-manual': (3, (16, 40, 612, 595.4), 'floorplan-wasa.jpg'),
}
DPI = 220

# 배치도에서 지울 영역(pt, 같은 PDF 좌표). 주변 바탕색으로 덮는다.
# WASA 패티오 윗줄 P5~P7(테이블+의자)은 사용자 지시로 삭제(2026-10-07).
ERASE = {
    'wasa-manual': [(114, 450, 453, 518)],
}

# 아래 두 보정은 잘라낸 이미지의 픽셀 좌표(DPI 220 기준). 같은 그림에 다시 칠해도 결과가
# 같으므로, PDF 를 못 열 때는 기존 이미지 위에 그대로 다시 적용한다.
# WASA 테이블 번호 개편(2026-10-14, 사용자 지시): 옛 5번(대각선 2인석+의자)은 삭제.
ERASE_POLY = {
    'wasa-manual': [
        [(1593, 150), (1673, 266), (1570, 337), (1490, 220)],  # 옛 5번 테이블
        [(1452, 257), (1538, 257), (1538, 340), (1452, 340)],  # 옛 5번 의자
    ],
}
# (중심 x, 중심 y, 새 번호, 글자 기울기°)
RELABEL = {
    'wasa-manual': [
        (1035, 133, '11', 0), (1159, 132, '12', 0), (1272, 132, '13', 0), (1402, 132, '14', 0),
        (1085, 507, '21', 0), (1413, 507, '22', 0),
        (957, 913, '31', 0), (1088, 915, '32', 0), (1223, 914, '33', 0), (1353, 913, '34', 0),
        (1566, 798, '35', 28),
        (527, 754, '41', 0), (209, 754, '42', 0),
        (521, 1022, '51', 0), (197, 1022, '52', 0),
        (204, 1518, '71', 0), (611, 1518, '72', 0), (1017, 1518, '73', 0), (1430, 1518, '74', 0),
    ],
}
BADGE = (0, 120, 201)
FONT = os.path.join(os.environ.get('WINDIR', r'C:\Windows'), 'Fonts', 'arialbd.ttf')


def retouch(did, img):
    """옛 테이블 지우기 + 번호 배지 새로 쓰기."""
    draw = ImageDraw.Draw(img)
    for poly in ERASE_POLY.get(did, []):
        draw.polygon(poly, fill=(234, 243, 252))
    font = ImageFont.truetype(FONT, 30)
    for cx, cy, text, rot in RELABEL.get(did, []):
        draw.ellipse([cx - 27, cy - 27, cx + 27, cy + 27], fill=BADGE)
        tile = Image.new('RGBA', (80, 80), (0, 0, 0, 0))
        ImageDraw.Draw(tile).text((40, 40), text, font=font, fill='white', anchor='mm')
        if rot:
            tile = tile.rotate(rot, resample=Image.BICUBIC)
        img.paste(tile, (cx - 40, cy - 40), tile)
    return img


def render():
    """PDF 에서 배치도를 잘라 src/img 에 저장. PDF 가 없거나 DRM 으로 잠겨 있으면
    기존 이미지에 retouch() 만 다시 적용한다."""
    try:
        doc = fitz.open(PDF)
    except Exception as e:
        print('[!] 플로어플랜 PDF 못 엶(%s) → 기존 이미지에 보정만 적용' % type(e).__name__)
        for did, (_, _, name) in PLANS.items():
            path = os.path.join(IMGDIR, name)
            if os.path.exists(path) and (did in RELABEL or did in ERASE_POLY):
                retouch(did, Image.open(path).convert('RGB')).save(path, quality=88)
        return
    for did, (pno, clip, name) in PLANS.items():
        pix = doc[pno - 1].get_pixmap(dpi=DPI, clip=fitz.Rect(*clip))
        img = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
        k = DPI / 72.0
        for x0, y0, x1, y1 in ERASE.get(did, []):
            box = [round((x0 - clip[0]) * k), round((y0 - clip[1]) * k),
                   round((x1 - clip[0]) * k), round((y1 - clip[1]) * k)]
            ImageDraw.Draw(img).rectangle(box, fill=img.getpixel((box[0], box[1])))
        retouch(did, img)
        img.save(os.path.join(IMGDIR, name), quality=88)
        print('  %-20s %dx%d' % (name, pix.width, pix.height))


def apply(decks):
    """STORE FACT SHEET 의 응대 멘트 바로 위에 배치도를 넣는다(재실행해도 중복 없음)."""
    for deck in decks:
        plan = PLANS.get(deck.get('id'))
        if not plan:
            continue
        name = plan[2]
        path = os.path.join(IMGDIR, name)
        if not os.path.exists(path):
            continue
        for page in deck['pages']:
            if PAGE_TITLE not in page.get('title', ''):
                continue
            imgs = [im for im in page.get('images', []) if not im.get('plan')]
            blocks = page.get('blocks', [])
            script = [b['y'] for b in blocks if b.get('kind') == 'script']
            y = (min(script) - 0.05) if script else max([b['y'] for b in blocks] + [0]) + 0.5
            w, h = fitz.Pixmap(path).width, fitz.Pixmap(path).height
            imgs.append({'src': 'img/' + name, 'x': 0.55, 'y': y, 'w': 7.1,
                         'h': round(7.1 * h / w, 2), 'plan': True})
            page['images'] = imgs
            print('  %s p%d ← %s' % (deck['id'], page['n'], name))


def main():
    os.makedirs(IMGDIR, exist_ok=True)
    render()
    decks = json.load(open(DATA, encoding='utf-8'))
    apply(decks)
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(decks, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == '__main__':
    main()
