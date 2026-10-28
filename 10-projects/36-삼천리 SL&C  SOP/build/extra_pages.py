# -*- coding: utf-8 -*-
"""원본 매뉴얼에 없는 추가 교육 페이지·메뉴 사진을 넣는다.

- 안전교육(2026-10-14): Downloads\\📋직원 추가 교육 자료1.docx
  "Restaurant Safety Call-outs / 레스토랑 안전 소통 교육" → 서비스 10단계 바로 뒤.
- 86 Item(안전교육 뒤), Clock in/out(직급별 역할 뒤) (2026-10-15):
  Downloads\\📋직원 추가 교육 자료.docx

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


# 2026-10-15 추가: Downloads\📋직원 추가 교육 자료.docx — 86 Item(안전교육 뒤), Clock in/out(직급별 역할 뒤)
CLOCK = {
    'title': 'CLOCK-IN & CLOCK-OUT POLICY  |  클락인 · 클락아웃 규정',
    'badge': 'TIME & ATTENDANCE',
    'blocks': [
        ('CLOCK-IN POLICY  ·  클락인 규정', [
            'Please do NOT clock in more than 1 minute before your scheduled shift time, '
            'unless specifically requested by a manager.',
            '배정된 스케줄 시간 기준 1분보다 빠르게 클락인하지 마세요. '
            '단, 관리자가 사전에 일찍 출근하여 클락인할 것을 요청한 경우는 예외입니다.',
        ]),
        ('CLOCK-OUT POLICY  ·  클락아웃 규정', [
            'You must always get approval from a manager before clocking out and leaving.',
            '퇴근 시에는 반드시 관리자의 허가를 받은 후 클락아웃을 진행하고 귀가해 주세요.',
            'Even if your scheduled shift time shows a set end time, do not clock out arbitrarily '
            '— always confirm with a manager first.',
            'POS나 스케줄 상에 퇴근 시간이 정해져 있더라도, 임의로 퇴근하지 말고 반드시 관리자에게 확인을 받아야 합니다.',
        ]),
    ],
}
ITEM86 = {
    'title': '86 ITEM  |  86 (품절) 처리',
    'badge': 'OUT OF STOCK',
    'blocks': [
        ('WHAT DOES "86" MEAN?  ·  \'86\'이란 무슨 뜻인가요?', [
            'A term used to indicate that a menu item is out of stock / unavailable or needs to be discontinued.',
            '메뉴가 품절(품귀)되었거나, 판매를 중단해야 함을 의미하는 용어입니다.',
        ]),
        ('WHEN DO WE "86" AN ITEM?  ·  언제 \'86\'을 하나요?', [
            'Out of Stock: When ingredients or finished items are completely out of stock.',
            '재고 소진: 재료나 완제품이 모두 떨어졌을 때',
            'Quality Control: When the condition of ingredients is not suitable for serving.',
            '품질 문제: 재료의 상태가 서빙하기에 적합하지 않을 때',
            'Kitchen Request: When a specific menu item cannot be prepared due to kitchen conditions.',
            '주방 요청: 주방 상황에 따라 특정 메뉴 조리가 불가능할 때',
        ]),
        ('HOW TO COMMUNICATE — INTERNAL TEAM  ·  주방 / 홀 팀원 간 소통', [
            '"Please 86 the [Item Name] on the POS!"',
            '"주방/POS에 [메뉴명] 86 처리 부탁드립니다!"',
        ]),
    ],
}
# (페이지, 바로 앞에 올 페이지 제목 앞부분). 새 번호는 이 순서대로 덱 최대+1 을 받는다.
EXTRA = [
    (SAFETY, AFTER),
    (ITEM86, 'RESTAURANT SAFETY CALL-OUTS'),
    (CLOCK, 'POSITION MAP'),
]


# 2026-10-21 서버 4대 행동강령: Downloads\서버 4대 행동강령 (KSC · IZAKAYA WASA).docx
# 서버 페이지(내 포지션 SOP) 맨 위에 강조 카드로 넣는다 (사용자 지시). 원문은 국문 + 영문 멘트라
# 영문 줄은 번역해 채움. 단계마다 t=[영문, 국문], sum=한눈에 보기 표의 칸, lines=[영문, 국문, ...],
# say=영문 멘트(번역 없이 그대로 말하는 문장). ○○ 는 원문 그대로 둔다(매장 시그니처로 바꿔 말함).
_GREET = ['Greet within 1 minute of seating.', '착석 후 1분 이내 응대']
_RETURN = ['Returning guest: say "Welcome back!", take drinks, then go straight to the food order.',
           '재방문: "Welcome back!" 인사 후 음료 받고 바로 주문 응대']
_SEND = ['After payment, keep eye contact and say goodbye as guests walk to the door.',
         '계산 후 출입구까지 시선 맞추고 인사']
# 3단계(중간 체크)의 프리버싱 — 2026-10-21 사용자 추가 지시 "접시 정리 잘 될 수 있도록"
_PREBUS = ['Pre-bus on every pass: never walk by empty-handed — clear finished plates, empty glasses '
           'and empty side dishes right away.',
           '프리버싱: 테이블을 지날 때마다 빈손으로 지나가지 않기 — 다 드신 접시·빈 잔·빈 반찬 그릇은 바로 정리',
           'Ask "May I take this for you?" before clearing, and make room before the next dish arrives.',
           '치우기 전 "May I take this for you?"로 여쭙고, 다음 요리가 나오기 전 테이블 공간 확보']
SERVER_CODE = {
    'ksc-manual': {
        'lines': ['Servers also work as grill attendants — in Step 3 you grill the first round yourself.',
                  '서버가 그릴 어텐던트를 겸무하므로 3단계에서 첫 고기 굽기를 직접 진행합니다.'],
        'steps': [
            {'t': ['GREET THE TABLE', '테이블 인사'],
             'sum': ['Ask about first visit + drink order', '방문 여부 질문 + 음료 주문'],
             'lines': _GREET + [
                 'First visit: after the drink order, let them know the server grills the meat for them.',
                 '첫 방문: 음료 주문 후, 서버가 고기를 구워드린다는 점 안내'] + _RETURN,
             'say': ['"Hi, welcome to Kalbi Social Club! Have you dined with us before?"',
                     '"Would you like to start with some drinks while you look over the menu?"']},
            {'t': ['RECOMMEND THE MENU', '메뉴 추천'],
             'sum': ['Suggest our signature meats', '시그니처 고기 제안'],
             'lines': ['Suggest the right amount of meat and the right combo for the party size.',
                       '인원에 맞는 고기 양·콤보 제안',
                       'Suggest side dishes and drink pairings together.',
                       '사이드·주류 페어링 함께 제안'],
             'say': ['"For first-timers, our ○○ Kalbi is the most popular."']},
            {'t': ['GRILL CARE', '그릴 케어'],
             'sum': ['Grill, check satisfaction & pre-bus', '굽기·만족도 확인·프리버싱'],
             'lines': ['Grill the first round yourself and explain how to enjoy each cut.',
                       '첫 고기는 서버가 직접 굽고 부위별 먹는 법 안내',
                       'Change the grill plate, refill banchan and offer more before guests have to ask.',
                       '불판 교체·반찬 리필·추가 주문 선제 확인'] + _PREBUS,
             'say': ['"Let me grill the first round for you. How is everything tasting?"']},
            {'t': ['SEND-OFF', '배웅 인사'],
             'sum': ['Invite them back', '재방문 유도'],
             'lines': _SEND + [
                 'First-time guests: recommend dishes for next time and tell them about our lunch menu.',
                 '첫 방문 고객: 다음 방문 추천 메뉴·런치 메뉴 안내'],
             'say': ['"Thank you for coming! Hope to see you again soon."']},
        ],
        'note': ['○○ = say the name of our signature kalbi.', '○○ 은 매장 시그니처 메뉴명으로 바꿔 말합니다.'],
    },
    'wasa-manual': {
        'lines': ['As an izakaya, we take the drink order first and serve shared plates one after another.',
                  '이자카야 특성상 음료를 먼저 받고, 셰어 플레이트를 순차적으로 서빙합니다.'],
        'steps': [
            {'t': ['GREET THE TABLE', '테이블 인사'],
             'sum': ['Ask about first visit + drink order', '방문 여부 질문 + 음료 주문'],
             'lines': _GREET + [
                 'First visit: after the drink order, explain how to order several shared plates.',
                 '첫 방문: 음료 주문 후, 셰어 플레이트로 여러 개 주문하는 방식 안내'] + _RETURN,
             'say': ['"Irasshaimase! Welcome to Izakaya Wasa. Is this your first time with us?"',
                     '"Can I start you off with some drinks first? We have a great selection of sake and highballs."']},
            {'t': ['RECOMMEND THE MENU', '메뉴 추천'],
             'sum': ['Suggest our signature robata', '시그니처 로바타 제안'],
             'lines': ['When you serve the drinks, recommend a signature robata dish.',
                       '음료 서빙 시 로바타 시그니처 메뉴 추천',
                       'Guide guests to start with 2–3 plates, depending on party size.',
                       '인원 기준 2~3개 플레이트부터 시작하도록 가이드'],
             'say': ['"Our ○○ is a must-try, and it pairs great with your drink."']},
            {'t': ['CHECK-BACK', '중간 체크'],
             'sum': ['Pace the plates, pre-bus & offer more', '순차 서빙·프리버싱·추가 주문 확인'],
             'lines': ['Return to the table as each dish comes out.',
                       '요리 나오는 순서에 맞춰 테이블 재방문',
                       'Suggest more dishes and drinks before glasses run empty.',
                       '잔이 비기 전 추가 요리·음료 제안'] + _PREBUS,
             'say': ['"How is everything so far? Would you like another round of drinks?"']},
            {'t': ['SEND-OFF', '배웅 인사'],
             'sum': ['Invite them back', '재방문 유도'],
             'lines': _SEND + [
                 'First-time guests: recommend dishes for their next visit.',
                 '첫 방문 고객: 다음 방문 추천 메뉴 안내'],
             'say': ['"Arigatou gozaimashita! Thank you, see you next time."']},
        ],
        'note': ['○○ = say the name of our signature dish. For sake and highballs, name items from our actual drink list.',
                 '○○ 은 매장 시그니처 메뉴명, sake·highball 은 실제 주류 라인업으로 바꿔 말합니다.'],
    },
}


# 착석 후 서버 첫 인사 시간 = 1분 이내로 통일 (2026-10-21 사용자 지시, 행동강령 기준).
# 호스트의 입구 인사(3초 · POSITION MAP 의 HOST greet <30 sec)와 배웅의 '마지막 30초'는 다른 얘기라 그대로 둔다.
GREET_FIX = [
    ('Greet within 30 seconds:', 'Greet within 1 minute of seating:'),
    ('착석 30초 내 인사', '착석 1분 내 인사'),
    ('Greet the table within 60 seconds of seating', 'Greet the table within 1 minute of seating'),
    ('착석 후 60초 내 인사', '착석 후 1분 내 인사'),
    ('greeting within 30 seconds of being seated', 'greeting within 1 minute of being seated'),
    ('착석 30초 안에', '착석 1분 안에'),
    ('SERVER (within 30 sec of seating)', 'SERVER (within 1 min of seating)'),
]


def _fix_greet(page):
    def fx(s):
        for a, b in GREET_FIX:
            s = s.replace(a, b)
        return s
    blocks = page.get('blocks', [])
    for i, b in enumerate(blocks):
        b['head'] = fx(b['head'])
        b['lines'] = [fx(t) for t in b['lines']]
        # 서비스 10단계의 시간 칩은 별도 블록 — SERVER GREET 바로 뒤의 '≤ 30 sec'
        if b['head'] == '≤ 30 sec' and i and blocks[i - 1]['head'].startswith('SERVER GREET'):
            b['head'] = '≤ 1 min'
    page['tables'] = [[[fx(c) for c in r] for r in t] for t in page.get('tables', [])]


def apply_server_code(decks):
    for deck in decks:
        if deck.get('id') in SERVER_CODE:
            for p in deck['pages']:
                _fix_greet(p)
    for deck in decks:
        spec = SERVER_CODE.get(deck.get('id'))
        if not spec:
            continue
        page = next((p for p in deck['pages'] if p['title'].upper().startswith('SERVER')), None)
        if not page:
            print('[!] %s: SERVER 페이지 없음 → 행동강령 미삽입' % deck['id'])
            continue
        # y 는 원본 첫 블록(1.22)·사진(1.04)보다 0.25 이상 위 → 페이지 맨 위 단독 줄
        page['blocks'] = [b for b in page['blocks'] if b.get('kind') != 'code']
        page['blocks'].insert(0, {'head': 'SERVER CODE OF CONDUCT  |  서버 4대 행동강령', 'kind': 'code',
                                  'lines': spec['lines'], 'steps': spec['steps'], 'note': spec['note'],
                                  'x': 0.55, 'y': 0.4, 'w': 7.1})
        print('  %s p%d 서버 4대 행동강령' % (deck['id'], page['n']))


def build_page(n, ref, spec=SAFETY):
    blocks = [{'head': h, 'lines': lines, 'kind': 'normal', 'x': 0.55, 'y': 1.2 + i, 'w': 7.1}
              for i, (h, lines) in enumerate(spec['blocks'])]
    return {'n': n, 'title': spec['title'], 'badge': spec['badge'],
            'chapter': ref.get('chapter'), 'ch': ref.get('ch'), 'divider': False,
            'blocks': blocks, 'images': [], 'tables': [], 'extra': True}


def apply(decks):
    for deck in decks:
        if deck.get('id') not in DECKS:
            continue
        pages = deck['pages']
        for spec, after in EXTRA:
            old = [p for p in pages if p.get('title') == spec['title']]
            n = old[0]['n'] if old else max(p['n'] for p in pages) + 1
            pages[:] = [p for p in pages if p.get('title') != spec['title']]
            at = next((i for i, p in enumerate(pages) if p['title'].upper().startswith(after)), None)
            if at is None:
                print('[!] %s: %s 페이지 없음 → %s 미삽입' % (deck['id'], after, spec['title']))
                continue
            pages.insert(at + 1, build_page(n, pages[at], spec))
            print('  %s p%d %s (p%d 뒤)' % (deck['id'], n, spec['title'].split('|')[-1].strip(), pages[at]['n']))


# KSC 메뉴 교육자료 중 사진 없던 메뉴에 매장 촬영 사진(2026-10-14) 채움.
# 원본: 오픈매장 매뉴얼\KSC_US\메뉴사진\*.JPG — 어두운 나무 배경이라 다른 메뉴 톤에 맞춰
# 음식만 분리해 밝은 회색 바탕에 합성한 결과물을 src/img/ksc-*.jpg 로 둔다.
# 키 = 메뉴 국문명(kr).
KSC_MENU_PHOTOS = {
    '소고기 순두부': 'ksc-soontofu.jpg',
    '설렁탕': 'ksc-seolleongtang.jpg',
    '물냉면': 'ksc-mul-naengmyeon.jpg',
    '비빔냉면': 'ksc-bibim-naengmyeon.jpg',
    '차돌 부추 덮밥': 'ksc-chadol-buchu-bowl.jpg',
    '제육쭈꾸미': 'ksc-jeyuk-jjukkumi.jpg',
    # 2026-10-15 추가 촬영본 — 사용자 지시로 이번엔 흰 바탕(255) 합성(rembg u2net)
    '육회': 'ksc-yukhoe.jpg',
    # 아래는 국문명(kr)이 비어 있어 영문명으로 매칭
    'ORANDA ICE CREAM': 'ksc-oranda-icecream.jpg',
    'HOTTEOK': 'ksc-hotteok.jpg',
    'TTEOKKALBI + RICEBALL + BANCHAN': 'ksc-kids-menu.jpg',
    # 2026-10-27 매장 촬영본(검은 대리석 위) — 그릇·음식만 누끼, 흰 바탕(u2net ∪ 밝은 접시 영역)
    'WHITE CUCUMBER': 'ksc-white-cucumber.jpg',
}
# 기존 사진이 있어도 덮어쓰는 메뉴 (영문명 앞부분 → 파일)
#  - LUNCH SET: 쭈꾸미제육+된장찌개 사진을 메인으로(사용자 지시)
#  - KALBI SELECTION: 원본에 맞는 사진이 없어 PREMIUM EXPERIENCE 사진에서 브리스킷 그릇만
#    LaMa 인페인팅으로 지운 합성본(사용자 지시, 2026-10-14)
KSC_MENU_OVERRIDE = {
    'LUNCH SET': 'ksc-lunch-set.jpg',
    'KALBI SELECTION EXPERIENCE': 'ksc-kalbi-selection.jpg',
}
# 분류(chip)까지 맞아야 덮어쓰는 메뉴 — 같은 영문명이 다른 분류에도 있을 때
#  - ART OF KALBI 의 LA KALBI: 기존 사진이 안 예쁘다고 해 오늘 촬영본으로 교체(SIDES 의 LA KALBI 는 유지)
KSC_MENU_OVERRIDE_IN = {
    ('ART OF KALBI', 'LA KALBI'): 'ksc-la-kalbi.jpg',
}
# 사진 대신 영상: 인스타그램 릴스 id (제3자 @mat_thagoras 게시물 → 내려받지 않고 공식 임베드만, 2026-10-14)
KSC_MENU_VIDEOS = {
    '겉절이 김치': 'DOcQjPGDzl-',
}


# 교육자료에서 빼는 메뉴: (덱 id, 분류 chip, 영문명) — 사용자 지시
#  - WASA 로바타 랑구스틴(2026-10-15)
MENU_REMOVE = {
    ('wasa-menu', 'ROBATA', 'Langoustine'),
}


# WASA 메뉴 중 사진 없던 곳 (영문명 → 파일). WASA 사진은 원래 매장 실사 톤이라 배경 제거 없이 그대로.
#  - Kids Bento: 매장 카톡 사진(2026-10-15)
WASA_MENU_PHOTOS = {
    'Kids Bento': 'wasa-kids-bento.jpg',
}


def apply_menu_photos(decks):
    for deck in decks:
        if deck.get('id') == 'wasa-menu':
            for it in deck.get('items', []):
                if not it.get('img') and it.get('en') in WASA_MENU_PHOTOS:
                    it['img'] = 'img/' + WASA_MENU_PHOTOS[it['en']]
                    print('  wasa-menu %-14s ← %s' % (it['en'], it['img']))
    for deck in decks:
        before = deck.get('items', [])
        keep = [it for it in before if (deck.get('id'), it.get('chip'), it.get('en')) not in MENU_REMOVE]
        if len(keep) != len(before):
            deck['items'] = keep
            print('  %s 메뉴 %d개 삭제' % (deck['id'], len(before) - len(keep)))
    for deck in decks:
        if deck.get('id') != 'ksc-menu':
            continue
        for it in deck.get('items', []):
            src = None
            hit = [f for k, f in KSC_MENU_OVERRIDE.items() if (it.get('en') or '').startswith(k)]
            if (it.get('chip'), it.get('en')) in KSC_MENU_OVERRIDE_IN:
                src = KSC_MENU_OVERRIDE_IN[(it.get('chip'), it.get('en'))]
            elif hit:
                src = hit[0]
            elif not it.get('img') and (it.get('kr') or it.get('en')) in KSC_MENU_PHOTOS:
                src = KSC_MENU_PHOTOS[it.get('kr') or it.get('en')]
            if it.get('kr') in KSC_MENU_VIDEOS:
                it['video'] = {'ig': KSC_MENU_VIDEOS[it['kr']]}
                print('  ksc-menu %-14s ← video ig/%s' % (it['kr'], it['video']['ig']))
            if src:
                it['img'] = 'img/' + src
                print('  ksc-menu %-14s ← %s' % (it.get('kr') or it.get('en'), src))


def main():
    decks = json.load(open(DATA, encoding='utf-8'))
    apply(decks)
    apply_server_code(decks)
    apply_menu_photos(decks)
    with open(DATA, 'w', encoding='utf-8') as f:
        json.dump(decks, f, ensure_ascii=False, separators=(",", ":"))


if __name__ == '__main__':
    main()
