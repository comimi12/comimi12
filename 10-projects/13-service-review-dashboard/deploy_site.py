# -*- coding: utf-8 -*-
"""
공유 사이트(GitHub Pages) 재배포: dashboard-share.html → comimi12/slnc-review-dashboard/index.html.
공개 URL: https://comimi12.github.io/slnc-review-dashboard/

사용: python deploy_site.py   (update_all.py 마지막 단계에서 자동 호출)
"""
import sys, io, os, shutil, subprocess, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SHARE = os.path.join(HERE, "dashboard-share.html")
CLONE = os.path.join(HERE, "_deploy")
REPO = "https://github.com/comimi12/slnc-review-dashboard.git"
IDENT = ["-c", "user.email=comimi12@gmail.com", "-c", "user.name=comimi12"]


def git(*args, cwd=CLONE, check=False):
    return subprocess.run(["git", *IDENT, *args], cwd=cwd, capture_output=True, text=True,
                          encoding="utf-8", errors="replace")


def main():
    if not os.path.exists(SHARE):
        print("[!] dashboard-share.html 없음 — build_share.py 먼저 실행")
        r = subprocess.run([sys.executable, os.path.join(HERE, "build_share.py")], cwd=HERE)
        if r.returncode != 0 or not os.path.exists(SHARE):
            raise SystemExit("[ERR] 공유파일 생성 실패")
    # 클론(최초) 또는 최신화
    if not os.path.isdir(os.path.join(CLONE, ".git")):
        print("[clone] slnc-review-dashboard")
        r = subprocess.run(["git", "clone", "--depth", "1", REPO, CLONE],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            raise SystemExit(f"[ERR] clone 실패: {r.stderr[-300:]}")
    else:
        git("pull", "--ff-only")
    shutil.copyfile(SHARE, os.path.join(CLONE, "index.html"))
    git("add", "index.html")
    st = git("status", "--porcelain")
    if not st.stdout.strip():
        print("[skip] 변경 없음 — 재배포 불필요"); return
    msg = f"update: {datetime.datetime.now():%Y-%m-%d %H:%M}"
    git("commit", "-m", msg)
    pr = git("push", "origin", "main")
    if pr.returncode == 0:
        print(f"[OK] 배포 완료 → https://comimi12.github.io/slnc-review-dashboard/  ({msg})")
    else:
        print(f"[ERR] push 실패: {pr.stderr[-300:]}")


if __name__ == "__main__":
    main()
