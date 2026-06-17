# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw, ImageFont
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
S=4
W,H=927,360
img=Image.new("RGB",(W*S,H*S),"white")
d=ImageDraw.Draw(img)
FB=r"C:\Windows\Fonts\malgunbd.ttf"; FR=r"C:\Windows\Fonts\malgun.ttf"
def f(sz,bold=True): return ImageFont.truetype(FB if bold else FR, sz*S)
GREEN=(21,128,61); RED=(180,35,24); DARK=(34,42,53)
def ctext(cx,cy,txt,ft,fill):
    bb=d.textbbox((0,0),txt,font=ft); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
    d.text((cx*S-tw/2,cy*S-th/2-bb[1]),txt,font=ft,fill=fill)
def badge(cx,cy,n,color,r=17):
    d.ellipse([(cx-r)*S,(cy-r)*S,(cx+r)*S,(cy+r)*S],fill=color)
    ctext(cx,cy,n,f(18),"white")
def row(half_top,header,hc,items):
    cy=half_top+90
    # header chip (left)
    cw,ch=150,40
    d.rounded_rectangle([20*S,(cy-ch/2)*S,(20+cw)*S,(cy+ch/2)*S],radius=10*S,fill=hc)
    ctext(20+cw/2,cy,header,f(19),"white")
    x0=200; x1=915; col=(x1-x0)/3
    for i,(label,val) in enumerate(items):
        cx=x0+col*i+col/2
        badge(cx,cy-44,str(i+1),hc)
        ctext(cx,cy+2,label,f(19,bold=False),DARK)
        ctext(cx,cy+44,val,f(26),hc)
row(0,"칭찬 TOP 3",GREEN,[("음식 맛","3,716건"),("매장 청결·분위기","1,235건"),("직원 친절도","823건")])
d.line([20*S,180*S,(W-20)*S,180*S],fill=(228,231,235),width=2*S)
row(180,"불만 TOP 3",RED,[("메뉴 품질·맛","30건"),("직원 서비스","24건"),("가격·양","18건")])
img=img.resize((W,H),Image.LANCZOS)
img.save(WD+r"\kw_new.png")
print("saved")
