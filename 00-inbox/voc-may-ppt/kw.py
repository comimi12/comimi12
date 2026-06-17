# -*- coding: utf-8 -*-
import io, openpyxl
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
o=io.open(WD+r"\kw.txt","w",encoding="utf-8")
p=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_tables_202606111853.xlsx"
wb=openpyxl.load_workbook(p, read_only=True, data_only=True)
for name in ["키워드행분리","카테고리행분리","대표리뷰행분리"]:
    ws=wb[name]
    o.write(f"\n===== {name} ({ws.max_row}x{ws.max_column}) =====\n")
    for ri,row in enumerate(ws.iter_rows(values_only=True),1):
        vals=[("" if v is None else str(v)[:45]) for v in row]
        o.write(f"R{ri}: {vals}\n")
        if ri>=12: 
            o.write("...\n"); break
o.close()
print("done")
