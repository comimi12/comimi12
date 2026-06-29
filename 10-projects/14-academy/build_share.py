# -*- coding: utf-8 -*-
"""
공유용 단일 HTML 빌드: output/academy-dashboard.html + data/data.js
→ dashboard-share.html (data.js 인라인 = self-contained, 경로/CORS 문제 없음)
+ 카카오톡 인앱 캐시 우회용 빌드토큰/ver.txt 자동 새로고침 스니펫 주입.

사용: python build_share.py
"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "output", "academy-dashboard.html")
DATA = os.path.join(HERE, "data", "data.js")
OUT = os.path.join(HERE, "dashboard-share.html")

CACHE_BUST = """<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
<script>
/* 새 버전 자동 반영: 배포 시 주입된 빌드토큰과 ver.txt(캐시 우회) 비교 → 다르면 최신으로 새로고침 */
window.__BUILD__='__BUILD_TOKEN__';
(function(){
  try{
    if(location.protocol==='file:') return;
    fetch('ver.txt?_='+Date.now(),{cache:'no-store'})
      .then(function(r){return r.ok?r.text():null;})
      .then(function(v){
        if(v && v.trim() && window.__BUILD__ && window.__BUILD__.indexOf('TOKEN')<0
           && v.trim()!==window.__BUILD__ && location.search.indexOf('upd=')<0){
          location.replace(location.pathname+'?upd='+encodeURIComponent(v.trim()));
        }
      }).catch(function(){});
  }catch(e){}
})();
</script>
"""


def main():
    with open(SRC, "r", encoding="utf-8") as f:
        html = f.read()
    with open(DATA, "r", encoding="utf-8") as f:
        data_js = f.read()

    # 1) data.js 인라인 (외부 참조 제거 → 단일 파일)
    html = html.replace('<script src="../data/data.js"></script>',
                         '<script>\n' + data_js + '\n</script>')

    # 2) 캐시버스팅 + 자동 새로고침 스니펫을 <title> 뒤에 주입
    marker = "<title>조리 아카데미 누계 대시보드</title>"
    html = html.replace(marker, marker + "\n" + CACHE_BUST)

    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("[OK] dashboard-share.html 생성 (data.js 인라인 + 캐시버스팅)")


if __name__ == "__main__":
    main()
