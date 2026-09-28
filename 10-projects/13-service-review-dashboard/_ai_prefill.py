# 1~8월(FULL_AI 구간) 전수 AI 감성 판정을 캐시에 미리 채우는 1회성 스크립트. 중단돼도 재실행하면 이어서 진행.
import io, contextlib, sys
import build, sentiment_ai
cap = {}
orig = build.refine_sentiment
def grab(rows):
    cap["rows"] = rows
    raise SystemExit
build.refine_sentiment = grab
try:
    with contextlib.redirect_stdout(io.StringIO()):
        build.build_reviews()
except SystemExit:
    pass
c = build.ai_targets(cap["rows"])
print(f"대상 {len(c)}건", flush=True)
sentiment_ai.judge([(r["store"], r["text"]) for r in c], max_batches=None,
                   log=lambda m: print(m, flush=True))
