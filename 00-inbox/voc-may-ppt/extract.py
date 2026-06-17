# -*- coding: utf-8 -*-
import io, json, openpyxl
from collections import Counter, defaultdict
WD=r"C:\Users\owner\do-better-workspace-v2\00-inbox\voc-may-ppt"
p=r"C:\Users\owner\Desktop\교육팀\0. 온라인리뷰\리뷰집계파일\AI매장리뷰_260611\review_analysis_output\review_analysis_tables_202606111853.xlsx"
wb=openpyxl.load_workbook(p, read_only=True, data_only=True)
ws=wb["업로드리뷰원본"]
rows=ws.iter_rows(values_only=True)
hdr=list(next(rows)); ix={h:i for i,h in enumerate(hdr)}
B=ix['브랜드명']; D=ix['방문일자']; St=ix['매장명']; G=ix['리뷰감성(Gemini)']; Txt=ix['리뷰내용']; Rt=ix['평점']

targets={"S.방배점","I.잠실롯데월드몰점","H.롯데수원점"}
neg_reviews=defaultdict(list)

# keyword themes
pos_themes={
 "음식 맛":["맛있","존맛","꿀맛","맛집","맛이","풍미","담백","고소","불고기","딤섬","스시","음식"],
 "직원 친절도":["친절","서비스","응대","직원"],
 "매장 청결/분위기":["깔끔","청결","분위기","넓","쾌적","인테리어","깨끗"],
 "재방문/추천":["재방문","또 갈","또 올","추천","단골"],
 "가성비/양":["가성비","푸짐","양이 많","넉넉"],
}
neg_themes={
 "메뉴 품질/맛":["품질","맛이 없","간이","짜","비림","비려","식었","차갑","덜 익","퀄리티","신선도"],
 "가격/양":["비싸","가격","양이 적","양 대비","가성비"],
 "직원 서비스":["불친절","응대","서비스","직원","무시","태도"],
 "위생":["위생","더러","청결","머리카락","벌레","오염"],
 "대기/웨이팅":["웨이팅","대기","기다"],
 "주문/오류":["오주문","주문","누락","결제","계산"],
}
pos_cnt=Counter(); neg_cnt=Counter()

for r in rows:
    if str(r[D])[:7]!="2026-05": continue
    s=r[St]; g=r[G]; t=str(r[Txt] or "")
    if g=="긍정":
        for th,kws in pos_themes.items():
            if any(k in t for k in kws): pos_cnt[th]+=1
    if g=="부정":
        for th,kws in neg_themes.items():
            if any(k in t for k in kws): neg_cnt[th]+=1
        if s in targets:
            neg_reviews[s].append({"rating":r[Rt],"text":t[:300]})

out={
 "pos_keyword_top": pos_cnt.most_common(6),
 "neg_keyword_top": neg_cnt.most_common(6),
 "neg_reviews": {k:v for k,v in neg_reviews.items()},
}
io.open(WD+r"\extract.json","w",encoding="utf-8").write(json.dumps(out,ensure_ascii=False,indent=1))
# readable
o=io.open(WD+r"\extract.txt","w",encoding="utf-8")
o.write("POS KW TOP: "+str(pos_cnt.most_common(6))+"\n")
o.write("NEG KW TOP: "+str(neg_cnt.most_common(6))+"\n\n")
for s in targets:
    o.write(f"\n##### {s} 5월 부정리뷰 ({len(neg_reviews[s])}건) #####\n")
    for rv in neg_reviews[s]:
        o.write(f" [{rv['rating']}] {rv['text']}\n")
o.close()
print("done")
