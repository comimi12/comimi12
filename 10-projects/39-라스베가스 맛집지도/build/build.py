"""index.html 생성: template.html + 원본 데이터(CATS·SRC·R) + images.json(공식 홈페이지·대표 이미지).
실행: python build/build.py  (폴더 루트에서)
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "원본" / "index.html").read_text(encoding="utf-8")
data = src[src.index("const CATS = {"):src.index("const st = {")].rstrip()

meta = {}
mp = ROOT / "build" / "images.json"
if mp.exists():
    for m in json.loads(mp.read_text(encoding="utf-8")):
        meta[m["n"]] = {k: m.get(k) for k in ("home", "img", "kind", "credit", "credit_url")}

t = (ROOT / "build" / "template.html").read_text(encoding="utf-8")
t = t.replace('<div class="sg">🍽 ${r.s}</div>${badges(r)}',
              '<div class="sg">🍽 ${r.s}</div><div class="sg">🕒 ${r.h}</div>${badges(r)}')
t = t.replace('<div class="ln">1인 ${r.pp} · ${priceTxt(r.p)}</div></div></div>`).join("");',
              '<div class="ln">1인 ${r.pp} · ${priceTxt(r.p)}</div><div class="ln">🕒 ${r.h}</div></div></div>`).join("");')
t = t.replace("/*__DATA__*/", data)
t = t.replace("/*__META__*/", "const META = " + json.dumps(meta, ensure_ascii=False) + ";")
(ROOT / "index.html").write_text(t, encoding="utf-8")
print(f"index.html 생성 · 이미지 {sum(1 for v in meta.values() if v['img'])}/{len(meta)}")
