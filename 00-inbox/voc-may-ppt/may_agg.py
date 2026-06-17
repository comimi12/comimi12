# -*- coding: utf-8 -*-
import io, openpyxl
from collections import Counter, defaultdict
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
o=io.open(WD+r"\may_agg.txt","w",encoding="utf-8")
p=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_tables_202606111853.xlsx"
wb=openpyxl.load_workbook(p, read_only=True, data_only=True)
ws=wb["업로드리뷰원본"]
rows=ws.iter_rows(values_only=True)
hdr=list(next(rows))
ix={h:i for i,h in enumerate(hdr)}
B=ix['브랜드명']; D=ix['방문일자']; St=ix['매장명']; G=ix['리뷰감성(Gemini)']; Iv=ix['리뷰감성(내부추정)']

# brand-level (May), store-level (May)
brand=defaultdict(lambda:Counter())          # gemini sentiment
brand_iv=defaultdict(lambda:Counter())       # internal sentiment
brand_stores=defaultdict(set)
store=defaultdict(lambda:Counter())          # gemini
store_brand={}
for r in rows:
    dv=str(r[D])[:7]
    if dv!="2026-05": continue
    b=r[B]; s=r[St]
    brand_stores[b].add(s)
    store_brand[s]=b
    g=r[G]; iv=r[Iv]
    brand[b][g]+=1; brand[b]['총']+=1
    brand_iv[b][iv]+=1; brand_iv[b]['총']+=1
    store[s][g]+=1; store[s]['총']+=1
    store[s]['_'+str(iv)]+=1

def line(b,c,stores):
    tot=c['총']; pos=c.get('긍정',0); neg=c.get('부정',0); neu=c.get('중립',0)
    rate = (neg/tot*100) if tot else 0
    return f"{b}: 매장{len(stores)} 총{tot} 칭찬(긍정){pos} 불만(부정){neg} 중립{neu} 불만율{rate:.1f}%"

o.write("=== 브랜드별 (May, Gemini 감성) ===\n")
gt=Counter(); allstores=set()
for b in sorted(brand, key=lambda x:-brand[x]['총']):
    o.write(line(b,brand[b],brand_stores[b])+"\n")
    for k,v in brand[b].items(): gt[k]+=v
    allstores|=brand_stores[b]
o.write(line("합계",gt,allstores)+"\n")

o.write("\n=== 브랜드별 (May, 내부추정 감성) ===\n")
gt2=Counter()
for b in sorted(brand_iv, key=lambda x:-brand_iv[x]['총']):
    o.write(line(b,brand_iv[b],brand_stores[b])+"\n")
    for k,v in brand_iv[b].items(): gt2[k]+=v
o.write(line("합계",gt2,allstores)+"\n")

# TOP3 칭찬 매장 (by 긍정 count), TOP3 불만 (by 부정 count)
o.write("\n=== TOP3 칭찬매장 (긍정 건수, Gemini) ===\n")
for s,c in sorted(store.items(), key=lambda kv:-kv[1].get('긍정',0))[:6]:
    o.write(f"  {s} [{store_brand[s]}] 긍정{c.get('긍정',0)} 총{c['총']}\n")
o.write("\n=== TOP3 불만매장 (부정 건수, Gemini) ===\n")
for s,c in sorted(store.items(), key=lambda kv:-kv[1].get('부정',0))[:8]:
    o.write(f"  {s} [{store_brand[s]}] 부정{c.get('부정',0)} 총{c['총']}\n")
o.write("\n=== TOP3 불만매장 (부정 건수, 내부추정) ===\n")
for s,c in sorted(store.items(), key=lambda kv:-kv[1].get('_부정',0))[:8]:
    o.write(f"  {s} [{store_brand[s]}] 내부부정{c.get('_부정',0)} 총{c['총']}\n")
o.close()
print("done")
