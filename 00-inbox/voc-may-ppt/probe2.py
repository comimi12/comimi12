# -*- coding: utf-8 -*-
import io, openpyxl
from collections import Counter, defaultdict
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
o=io.open(WD+r"\probe.txt","w",encoding="utf-8")
p=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_tables_202606111853.xlsx"
wb=openpyxl.load_workbook(p, read_only=True, data_only=True)
ws=wb["업로드리뷰원본"]
rows=ws.iter_rows(values_only=True)
hdr=next(rows)
o.write("업로드리뷰원본 HEADER: "+str(hdr)+"\n\n")
sample=[]
ym=Counter()
date_idx=None
for ci,h in enumerate(hdr):
    if h and ("날짜" in str(h) or "일자" in str(h) or "date" in str(h).lower() or "작성" in str(h)):
        date_idx=ci
o.write(f"date_idx={date_idx} -> col '{hdr[date_idx] if date_idx is not None else None}'\n")
cnt=0
for i,r in enumerate(rows):
    cnt+=1
    if i<3: o.write("sample: "+str(r)+"\n")
    if date_idx is not None:
        v=r[date_idx]
        s=str(v)[:7]
        ym[s]+=1
o.write(f"\ntotal data rows={cnt}\n")
o.write("\nYYYY-MM distribution (top): "+str(ym.most_common(15))+"\n")
o.close()
print("done")
