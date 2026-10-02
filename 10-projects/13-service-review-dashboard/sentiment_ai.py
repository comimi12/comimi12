# -*- coding: utf-8 -*-
"""리뷰 감성 AI 판정 (claude CLI 헤드리스 호출 + 캐시).

키워드 분류는 문맥을 못 본다("위생적이라 좋다"→불만, "친구는 맛있었다던데 다신 안 감"→칭찬).
build.py 가 판정 대상을 넘기면 Claude 가 원문 전체를 읽고 칭찬/불만/중립/제외(매장과 무관)를 판정한다.
판정 결과는 리뷰 문장 기준으로 data/sentiment_ai_cache.json 에 저장해 재호출하지 않는다.
claude CLI 가 없거나 실패하면 판정 못 한 건은 결과에서 빠지고, build.py 가 규칙 판정으로 대체한다.
"""
import hashlib
import json
import os
import shutil
import subprocess
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE_PATH = os.path.join(HERE, "data", "sentiment_ai_cache.json")
LABELS = ("칭찬", "불만", "중립", "제외")
BATCH = 150
WORKERS = 4
TIMEOUT = 600
MAX_BATCHES = 30          # 1회 호출당 상한(매일 빌드 보호). 전수 판정은 max_batches=None 으로 호출

PROMPT = """너는 외식 브랜드(Chai797 중식·호우섬 홍콩식·서리재 한식·이타마에 스시·정육점·어온가 생선구이·스위트에디션 디저트) 매장 방문 리뷰의 감성을 판정한다.
입력은 JSON 배열(i, store, text)이다. 각 리뷰를 원문 전체 문맥으로 판단해 l(라벨)을 정한다.
- 불만: 음식·서비스·위생·가격·대기·운영에 대한 불만, 실망, 재방문 거부, 개선 요구가 주된 내용이거나 분명히 포함됨
  (칭찬이 섞여 있어도 뚜렷한 불만이 있으면 불만. 예: "맛은 나쁘지 않았으나 직원이…다시 안 가고 싶음")
- 칭찬: 전반적으로 만족·호평·추천. 부정 단어가 긍정 맥락이면 칭찬 ("위생적이라 좋다", "자극적이지 않아 좋다", "냄새까지 좋은")
  가벼운 아쉬움 한마디가 있어도 전체가 호평이면 칭찬
- 중립: 사실 나열·단순 기록·메뉴명만, 또는 장단점이 비슷해 어느 쪽도 아님
- 제외: 이 매장 방문 경험과 무관한 글 — 광고·홍보·스팸, 다른 가게/장소/상품 이야기, 의미 없는 문자열, 테스트 글,
  매장과 관계없는 개인 일상·잡담만 있는 글. 매장·음식·서비스 언급이 조금이라도 있으면 제외하지 않는다
  (블로그·홍보 문체, 이벤트 문구가 섞인 후기, "좋아요" 반복처럼 짧은 호평도 이 매장 이야기면 제외 아님)
r 은 불만·제외일 때만 근거를 12자 이내로 쓰고, 칭찬·중립은 빈 문자열로 둔다. 모든 i 에 대해 빠짐없이 답한다."""

SCHEMA = {
    "type": "object",
    "properties": {"items": {"type": "array", "items": {
        "type": "object",
        "properties": {"i": {"type": "integer"},
                       "l": {"type": "string", "enum": list(LABELS)},
                       "r": {"type": "string"}},
        "required": ["i", "l", "r"]}}},
    "required": ["items"],
}

_lock = threading.Lock()


def key_of(text):
    """리뷰 문장 기준 키(매장 무관 — 같은 문장은 같은 판정)."""
    return hashlib.sha1((text or "").strip().encode("utf-8")).hexdigest()[:16]


def load_cache():
    try:
        c = json.load(open(CACHE_PATH, encoding="utf-8"))
        return c if c.get("_v") == 2 else {"_v": 2}
    except (OSError, ValueError):
        return {"_v": 2}


def save_cache(cache):
    os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
    tmp = CACHE_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)
    os.replace(tmp, CACHE_PATH)


def _claude_exe():
    return shutil.which("claude") or os.path.expanduser(r"~\.local\bin\claude.exe")


def _judge_batch(exe, batch):
    payload = json.dumps([{"i": i, "store": s, "text": t} for i, (s, t) in enumerate(batch)],
                         ensure_ascii=False)
    cmd = [exe, "-p", PROMPT, "--model", "sonnet", "--output-format", "json",
           "--json-schema", json.dumps(SCHEMA, ensure_ascii=False), "--tools", ""]
    p = subprocess.run(cmd, input=payload, capture_output=True, text=True, encoding="utf-8",
                       timeout=TIMEOUT, cwd=os.path.expanduser("~"),
                       creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
    out = json.loads(p.stdout)
    items = (out.get("structured_output") or {}).get("items") or []
    return {it["i"]: it for it in items if it.get("l") in LABELS}


def judge(pairs, max_batches=MAX_BATCHES, log=print):
    """pairs: [(store, text)] → {key_of(text): {"label", "reason"}}. 캐시 우선, 미판정분만 호출."""
    cache = load_cache()
    todo, seen = [], set()
    for s, t in pairs:
        k = key_of(t)
        if k not in cache and k not in seen:
            seen.add(k)
            todo.append((s, t))
    exe = _claude_exe()
    if todo and os.path.exists(exe):
        batches = [todo[b:b + BATCH] for b in range(0, len(todo), BATCH)]
        if max_batches is not None and len(batches) > max_batches:
            log(f"[AI감성] 1회 상한 {max_batches}배치 — 남은 {len(batches) - max_batches}배치는 다음 빌드에서 판정")
            batches = batches[:max_batches]
        done, fail = 0, 0

        def run(batch):
            return batch, _judge_batch(exe, batch)

        with ThreadPoolExecutor(WORKERS) as ex:
            futs = [ex.submit(run, b) for b in batches]
            for n, f in enumerate(as_completed(futs), 1):
                try:
                    batch, res = f.result()
                except Exception as e:
                    fail += 1
                    log(f"[AI감성] 배치 실패({type(e).__name__}) — 다음 빌드에서 재시도")
                    continue
                with _lock:
                    for i, (s, t) in enumerate(batch):
                        if i in res:
                            cache[key_of(t)] = {"label": res[i]["l"], "reason": res[i].get("r", "")}
                            done += 1
                    save_cache(cache)
                if n % 10 == 0 or n == len(batches):
                    log(f"[AI감성] 진행 {n}/{len(batches)}배치 · 누적 {done}건")
        log(f"[AI감성] 신규 판정 {done}건 (대상 {len(pairs)} / 캐시 {len(cache) - 1}, 실패배치 {fail})")
    elif todo:
        log("[AI감성] claude CLI 없음 — 규칙 판정으로 대체")
    return {key_of(t): cache[key_of(t)] for s, t in pairs if key_of(t) in cache}
