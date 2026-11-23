# -*- coding: utf-8 -*-
"""상림숯집 테이블 배치도 — KSC 배치도(floorplan-ksc.jpg)와 같은 그림체로 직접 그린다.

근거: 목업 좌석배치도 pptx 1장(1안) 도면의 테이블 번호 + 2장(2안) 도면의 룸 배치(RM.A~D).
실측 도면이 아니라 '어디에 몇 번이 있는지'를 익히는 개념도다. 번호가 바뀌면 아래 표만 고친다.

  python build/sanglim_floor.py   → src/img/sanglim-floorplan.jpg
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "src", "img", "sanglim-floorplan.jpg")

S = 2                      # 2배로 그려서 줄인다 (가장자리 매끈하게)
W, H = 1800, 1010
BLUE = (11, 99, 206)
ORANGE = (200, 134, 50)
GRAY = (143, 152, 163)
LINE = (20, 20, 20)
HALL_A = (232, 241, 251)
HALL_B = (236, 244, 233)
ROOM = (251, 242, 226)
SERV = (226, 226, 226)


def F(size, bold=True):
    p = "C:/Windows/Fonts/malgunbd.ttf" if bold else "C:/Windows/Fonts/malgun.ttf"
    return ImageFont.truetype(p, size * S)


img = Image.new("RGB", (W * S, H * S), "white")
d = ImageDraw.Draw(img)


def R(x0, y0, x1, y1, **kw):
    d.rectangle((x0 * S, y0 * S, x1 * S, y1 * S), **kw)


def RR(x0, y0, x1, y1, r, **kw):
    d.rounded_rectangle((x0 * S, y0 * S, x1 * S, y1 * S), radius=r * S, **kw)


def text(x, y, s, size, fill, bold=True, anchor="mm"):
    d.text((x * S, y * S), s, font=F(size, bold), fill=fill, anchor=anchor)


def badge(x, y, n):
    r = 30
    d.ellipse(((x - r - 3) * S, (y - r - 3) * S, (x + r + 3) * S, (y + r + 3) * S), fill="white")
    d.ellipse(((x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S), fill=BLUE)
    text(x, y + 1, str(n), 28, "white")


def chair(x, y):
    RR(x - 11, y - 11, x + 11, y + 11, 4, fill="white", outline=(70, 70, 70), width=2 * S)


def table(x0, y0, x1, y1):
    R(x0, y0, x1, y1, fill="white", outline=LINE, width=2 * S)


def booth(x0, x1, y_bench, y_tab, chairs_y, n_list, bench_h=22):
    """벽 쪽 벤치(회색 띠) + 테이블 + 반대편 의자. n_list = [(테이블 중심 x, 번호)]"""
    R(x0, y_bench, x1, y_bench + bench_h, fill=GRAY)
    for cx, n in n_list:
        table(cx - 52, y_tab, cx + 52, y_tab + 62)
        for dx in (-26, 26):
            chair(cx + dx, chairs_y)
        badge(cx, y_tab + 31, n)


def zone(xy, fill, label, lx, ly):
    d.polygon([(x * S, y * S) for x, y in xy], fill=fill, outline=LINE, width=3 * S)
    text(lx, ly, label, 22, (90, 100, 115))


# ── 바깥 틀 · 구역 ───────────────────────────────────────
R(40, 40, 1400, 120, fill=SERV, outline=LINE, width=3 * S)
text(720, 80, "주방 · 복도", 24, (110, 110, 110))
zone([(40, 120), (760, 120), (760, 700), (40, 700)], HALL_A, "HALL A", 400, 410)
R(760, 120, 860, 700, fill=SERV, outline=LINE, width=3 * S)
text(810, 300, "S/T", 24, (110, 110, 110))
text(810, 335, "POS", 18, (130, 130, 130), bold=False)
zone([(860, 120), (1400, 120), (1400, 940), (860, 940)], HALL_B, "HALL B", 1130, 660)
for y in (706, 712):   # 창가 유리벽 (홀 A 아래 · 홀 B 아래)
    d.line((40 * S, y * S, 860 * S, y * S), fill=(120, 170, 220), width=2 * S)
    d.line((860 * S, (y + 240) * S, 1400 * S, (y + 240) * S), fill=(120, 170, 220), width=2 * S)
text(400, 740, "창가 (유리벽)", 18, (110, 140, 170), bold=False)
text(1130, 980, "창가 (유리벽)", 18, (110, 140, 170), bold=False)

# HALL A 위 줄 — 주방 쪽 벽에 붙은 부스
booth(60, 330, 132, 166, 252, [(130, 1), (262, 2)])
booth(345, 470, 132, 166, 252, [(407, 3)])
booth(485, 745, 132, 166, 252, [(552, 4), (680, 5)])
# HALL A 아래 줄 — 창가 부스 (벤치가 창 쪽)
for x0, x1, nums in [(60, 210, [(135, 9)]), (225, 545, [(305, 8), (465, 7)]), (560, 745, [(652, 6)])]:
    R(x0, 660, x1, 682, fill=GRAY)
    for cx, n in nums:
        table(cx - 56, 578, cx + 56, 645)
        for dx in (-28, 28):
            chair(cx + dx, 555)
        badge(cx, 611, n)

# HALL B 위 줄 — 11(큰 부스) · 12(부스) · 13(사선 테이블)
R(880, 132, 1120, 154, fill=GRAY)
table(890, 166, 1010, 250)
for dx in (-30, 30):
    chair(950 + dx, 272)
badge(950, 208, 11)
table(1030, 166, 1110, 228)
for dx in (-20, 20):
    chair(1070 + dx, 250)
badge(1070, 197, 12)
table(1170, 180, 1250, 250)
for dy in (-18, 18):
    chair(1155, 215 + dy)
    chair(1265, 215 + dy)
badge(1210, 215, 13)

# HALL B 가운데 긴 테이블 — 19 · 20 (D-1 · D-2)
RR(900, 380, 1240, 460, 40, fill="white", outline=LINE, width=2 * S)
d.line((1070 * S, 380 * S, 1070 * S, 460 * S), fill=(120, 120, 120), width=2 * S)
for cx in (950, 1010, 1130, 1190):
    chair(cx, 360)
    chair(cx, 480)
badge(985, 420, 19)
badge(1155, 420, 20)

# HALL B 룸 쪽 사선 벽 테이블 — 14 · 15
for cy, n in [(330, 14), (520, 15)]:
    table(1290, cy - 40, 1370, cy + 40)
    for dy in (-20, 20):
        chair(1275, cy + dy)
    badge(1330, cy, n)
R(1384, 250, 1400, 600, fill=GRAY)

# HALL B 창가 — 18 · 17 · 16 (4인 테이블)
for cx, n in [(330, 18)]:
    pass
for cx, n in [(980, 18), (1130, 17), (1280, 16)]:
    table(cx - 45, 800, cx + 45, 870)
    for dx in (-22, 22):
        chair(cx + dx, 780)
        chair(cx + dx, 890)
    badge(cx, 835, n)

# ── 룸 (RM.A ~ RM.D) ────────────────────────────────────
def room(y0, y1, label, seats=3):
    R(1420, y0, 1760, y1, fill=ROOM, outline=LINE, width=3 * S)
    cy = (y0 + y1) / 2
    R(1500, cy - 26, 1680, cy + 26, fill="white", outline=LINE, width=2 * S)
    for i in range(seats):
        x = 1530 + i * 60
        chair(x, cy - 46)
        chair(x, cy + 46)
    RR(1528, cy - 22, 1652, cy + 22, 8, fill=ORANGE)
    text(1590, cy, label, 22, "white")


room(40, 190, "RM. D")
text(1590, 215, "복도", 18, (130, 130, 130), bold=False)
room(240, 420, "RM. A")
room(420, 600, "RM. B")
room(600, 780, "RM. C")
for y in (420, 600):   # 무빙월
    for x in range(1424, 1760, 24):
        d.line((x * S, y * S, (x + 12) * S, y * S), fill=(200, 60, 40), width=4 * S)
text(1590, 820, "RM.A·B·C 사이 = 무빙월", 18, (200, 60, 40))
text(1590, 848, "(열면 단체석으로 연결)", 16, (150, 90, 70), bold=False)


img = img.resize((W, H), Image.LANCZOS)
img.save(OUT, "JPEG", quality=90, optimize=True)
print("[OK]", OUT, img.size)
