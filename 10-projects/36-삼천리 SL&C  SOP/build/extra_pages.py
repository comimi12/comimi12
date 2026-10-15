# -*- coding: utf-8 -*-
"""원본 매뉴얼에 없는 추가 교육 페이지·메뉴 사진을 넣는다.

- 안전교육(2026-10-14): Downloads\\📋직원 추가 교육 자료1.docx
  "Restaurant Safety Call-outs / 레스토랑 안전 소통 교육" → 서비스 10단계 바로 뒤.

페이지 번호(n)는 기존 번호를 밀지 않도록 덱의 최대 번호 + 1 을 쓰고, 배열 위치만
서비스 10단계 뒤에 끼운다(기기에 저장된 진도 키가 그대로 유지됨). 학습 순서는
app.js 의 COURSE 가 정한다. 재실행해도 중복되지 않는다.

store_info.py 가 끝에서 apply() 를 호출한다. 단독 실행:
    python build/extra_pages.py
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), 'src', 'data.json')

AFTER = 'STEPS OF SERVICE'
DECKS = ('ksc-manual', 'wasa-manual')

# 영문·국문은 줄을 나눠 적는다 — app.js pairLines 가 [영문, 국문] 한 쌍으로 묶는다.
# 영문 줄에 한글을 섞으면 화면에서 문장이 끊기므로 주의.
SAFETY = {
    'title': 'RESTAURANT SAFETY CALL-OUTS  |  안전교육',
    'badge': 'BEHIND!  ·  CORNER!',
    'blocks': [
        ('WHY CALL OUT  ·  왜 외치나요?', [
            'The kitchen and floor are busy areas with hot food, sharp tools, and glassware. '
            'Calling out loudly and clearly keeps you and your team safe!',
            '주방과 홀은 뜨거운 음식, 날카로운 도구, 유리그릇 등이 오가는 바쁜 공간입니다. '
            '미리 크게 외치는 한마디가 나 자신과 동료의 안전을 지킵니다!',
        ]),
        ('BEHIND!  ·  비하인드 / 뒤로 지나갑니다! — WHEN TO USE  ·  언제 사용하나요?', [
            'Walking directly behind a coworker or in their blind spot.',
            '동료의 바로 뒤나 시야가 미치지 않는 뒷공간을 지나갈 때',
            'Carrying hot food, heavy trays, knives, or soup behind someone.',
            '뜨거운 국물, 무거운 쟁반, 칼 등을 들고 뒤를 지날 때',
        ]),
        ('BEHIND! — WHY  ·  왜 외쳐야 하나요?', [
            'Prevents collisions if the person in front turns around or steps back suddenly.',
            '앞사람이 갑자기 뒤돌아서거나 물러서면서 부딪히는 사고를 방지합니다.',
        ]),
        ('BEHIND! — RULES OF CONDUCT  ·  행동 수칙', [
            'Say "Behind!" clearly and loudly 2–3 steps before passing.',
            '지나가기 2~3걸음 전에 명확하고 큰 목소리로 "Behind!"라고 외칩니다.',
            'If carrying something dangerous, specify: "Behind, Hot!" or "Behind, Sharp!"',
            '위험한 것을 들고 있다면 "Behind, Hot!"(뜨거운 거 뒤로 갑니다) 또는 '
            '"Behind, Sharp!"(칼 뒤로 갑니다)라고 알립니다.',
            'When you hear "Behind": Do NOT turn around or step back! Hold your position until they pass.',
            '"Behind" 소리를 들었을 때는? 갑자기 뒤돌거나 물러서지 말고, 지나갈 때까지 제자리에서 하던 일을 유지합니다.',
        ]),
        ('CORNER!  ·  코너 / 모퉁이 돌겠습니다! — WHEN TO USE  ·  언제 사용하나요?', [
            'Turning around blind corners, walls, pillars, or kitchen entrances.',
            '벽, 기둥, 주방 입구 등 반대편이 보이지 않는 사각지대(모퉁이)를 돌아 진입할 때',
            'Passing through swinging kitchen doors.',
            '주방과 홀을 연결하는 스윙도어(Door)를 지나갈 때',
        ]),
        ('CORNER! — WHY  ·  왜 외쳐야 하나요?', [
            'Prevents head-on collisions when two people meet unexpectedly around a corner.',
            '양쪽에서 서로 보이지 않는 상태로 코너를 돌다가 정면충돌하는 사고를 예방합니다.',
        ]),
        ('CORNER! — RULES OF CONDUCT  ·  행동 수칙', [
            'Call out "Corner!" loudly right before turning the corner.',
            '코너에 진입하기 직전에 "Corner!"라고 크게 외칩니다.',
            'Slow down, widen your turn, and check for oncoming team members.',
            '외침과 동시에 속도를 줄이고 반대편에서 사람이 오지 않는지 확인하며 크게 돕니다.',
        ]),
    ],
}


def build_page(n, ref):
    blocks = [{'head': h, 'lines': lines, 'kind': 'normal', 'x': 0.55, 'y': 1.2 + i, 'w': 7.1}
              for i, (h, lines) in enumerate(SAFETY['blocks'])]
    return {'n': n, 'title': SAFETY['title'], 'badge': SAFETY['badge'],
            'chapter': ref.get('chapter'), 'ch': ref.get('ch'), 'divider': False,
            'blocks': blocks, 'images': [], 'tables': [], 'extra': True}


def apply(decks):
    for deck in decks:
        if deck.get('id') not in DECKS:
            continue
        pages = deck['pages']
        old = [p for p in pages if p.get('title') == SAFETY['title']]
        n = old[0]['n'] if old else max(p['n'] for p in pages) + 1
        pages[:] = [p for p in pages if p.get('title') != SAFETY['title']]
        at = next((i for i, p in enumerate(pages) if p['title'].upper().startswith(AFTER)), None)
        if at is None:
            print('[!] %s: %s 페이지 없음 → 안전교육 미삽입' % (deck['id'], AFTER))
            continue
        pages.insert(at + 1, build_page(n, pages[at]))
        print('  %s p%d 안전교육 (서비스 10단계 p%d 뒤)' % (deck['id'], n, pages[at]['n']))


# KSC 메뉴 교육자료 중 사진 없던 메뉴에 매장 촬영 사진(2026-10-14) 채움.
# 원본: 오픈매장 매뉴얼\KSC_US\메뉴사진\*.JPG — 어두운 나무 배경이라 다른 메뉴 톤에 맞춰
# 음식만 분리해 밝은 회색 바탕에 합성한 결과물을 src/img/ksc-*.jpg 로 둔다.
# 키 = 메뉴 국문명(kr). LUNCH SET 은 사용자 지시로 쭈꾸미제육+된장찌개 사진을 메인으로(기존 사진 있어도 덮어씀).
KSC_MENU_PHOTOS = {
    '소고기 순두부': 'ksc-soontofu.jpg',
    '설렁탕': 'ksc-seolleongtang.jpg',
    '물냉면': 'ksc-mul-naengmyeon.jpg',
    '비빔냉면': 'ksc-bibim-naengmyeon.jpg',
    '차돌 부추 덮밥': 'ksc-chadol-buchu-bowl.jpg',
    '제육쭈꾸미': 'ksc-jeyuk-jjukkumi.jpg',
}
KSC_LUNCH_SET = ('LUNCH SET', 'ksc-lunch-set.jpg')


def apply_menu_photos(decks):
    for deck in decks:
        if deck.get('id') != 'ksc-menu':
            continue
        for it in deck.get('items', []):
            src = None
            if it.get('en') == KSC_LUNCH_SET[0]:
                src = KSC_LUNCH_SET[1]
            elif not it.get('img') and it.get('kr') in KSC_MENU_PHOTOS:
                src = KSC_MENU_PHOTOS[it['kr']]
            if src:
                it['img'] = 'img/' + src
                print('  ksc-menu %-14s ← %s' % (it.get('kr') or it.get('en'), src))


def main():
    decks = json.load(open(DATA, encoding='utf-8'))
    apply(decks)
    apply_menu_photos(decks)
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(decks, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == '__main__':
    main()
