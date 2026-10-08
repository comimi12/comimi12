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


def render():
    """PDF 에서 배치도를 잘라 src/img 에 저장. PDF 가 없으면 기존 이미지를 그대로 쓴다."""
    if not os.path.exists(PDF):
        print('[!] 플로어플랜 PDF 없음 → 기존 이미지 유지: ' + PDF)
        return
    doc = fitz.open(PDF)
    for pno, clip, name in PLANS.values():
        pix = doc[pno - 1].get_pixmap(dpi=DPI, clip=fitz.Rect(*clip))
        pix.save(os.path.join(IMGDIR, name), jpg_quality=88)
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
