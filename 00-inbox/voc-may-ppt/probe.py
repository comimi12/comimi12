# -*- coding: utf-8 -*-
import io, openpyxl
from collections import Counter, defaultdict
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
o=io.open(WD+r"\probe.txt","w",encoding="utf-8")

# 1) raw reviews columns + date range
p=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_tables_202606111853.xlsx"
wb=openpyxl.load_workbook(p, read_only=True, data_only=True)
ws=wb["업로드리뷰원본"]
rows=ws.iter_rows(values_only=True)
hdr=next(rows)
o.write("업로드리뷰원본 HEADER: "+str(hdr)+"\n")
# find date-like column
sample=[]
for i,r in enumerate(rows):
    if i<3: sample.append(r)
    if i>=3: break
for s in sample: o.write("  sample: "+str(s)+"\n")

# 2) dashboard xlsx full dump
o.write("\n\n===== DASHBOARD XLSX =====\n")
p2=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_dashboard_202606111853.xlsx"
wb2=openpyxl.load_workbook(p2, read_only=True, data_only=True)
for s in wb2.worksheets:
    o.write(f"\n--- SHEET {s.title} ({s.max_row}x{s.max_column}) ---\n")
    for ri,row in enumerate(s.iter_rows(values_only=True),1):
        vals=[("" if v is None else str(v)[:40]) for v in row]
        o.write(f"R{ri}: {vals}\n")
        if ri>40: 
            o.write("...\n"); break
o.close()
print("done")
