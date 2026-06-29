# -*- coding: utf-8 -*-
"""
공유 사이트(GitHub Pages) 배포: dashboard-share.html → comimi12/academy-dashboard/index.html
공개 URL: https://comimi12.github.io/academy-dashboard/

- 공개(public) repo + GitHub Pages → 로그인/권한 없이 누구나 열림 ("관리자 권한 없음" 안 뜸)
- 빌드토큰 + ver.txt 로 카카오톡 인앱 캐시 우회 자동 새로고침

사용: python deploy_site.py
"""
import sys, io, os, subprocess, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SHARE = os.path.join(HERE, "dashboard-share.html")
CLONE = os.path.join(HERE, "_deploy")
REPO = "https://github.com/comimi12/academy-dashboard.git"
PAGES_URL = "https://comimi12.github.io/academy-dashboard/"
IDENT = ["-c", "user.email=comimi12@gmail.com", "-c", "user.name=comimi12"]


def git(*args, cwd=CLONE):
    return subprocess.run(["git", *IDENT, *args], cwd=cwd, capture_output=True,
                          text=True, encoding="utf-8", errors="replace")


def main():
    if not os.path.exists(SHARE):
        print("[!] dashboard-share.html 없음 — build_share.py 먼저 실행")
        r = subprocess.run([sys.executable, os.path.join(HERE, "build_share.py")], cwd=HERE)
        if r.returncode != 0 or not os.path.exists(SHARE):
            raise SystemExit("[ERR] 공유파일 생성 실패")

    if not os.path.isdir(os.path.join(CLONE, ".git")):
        print("[clone] academy-dashboard")
        r = subprocess.run(["git", "clone", "--depth", "1", REPO, CLONE],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise SystemExit(f"[ERR] clone 실패: {r.stderr[-300:]}")
    else:
        git("pull", "--ff-only")

    token = f"{datetime.datetime.now():%Y%m%d-%H%M%S}"
    with open(SHARE, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace("__BUILD_TOKEN__", token)
    with open(os.path.join(CLONE, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    with open(os.path.join(CLONE, "ver.txt"), "w", encoding="utf-8") as f:
        f.write(token)
    # .nojekyll → Pages 빌드 지연/무시 방지
    open(os.path.join(CLONE, ".nojekyll"), "w").close()

    git("add", "-A")
    st = git("status", "--porcelain")
    if not st.stdout.strip():
        print("[skip] 변경 없음 — 재배포 불필요"); return
    git("commit", "-m", f"update: {datetime.datetime.now():%Y-%m-%d %H:%M}")
    pr = git("push", "origin", "main")
    if pr.returncode == 0:
        print(f"[OK] 배포 완료 → {PAGES_URL}")
    else:
        print(f"[ERR] push 실패: {pr.stderr[-300:]}")


if __name__ == "__main__":
    main()
