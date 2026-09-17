# -*- coding: utf-8 -*-
"""SOP 대시보드 배포: src/ → GitHub Pages 저장소.

  python build/deploy.py                 # 기본 저장소로 배포
  python build/deploy.py --repo <url>    # 다른 저장소로 배포
  python build/deploy.py --dry           # 복사만 하고 push 안 함

빌드 토큰을 주입해 캐시를 우회하므로, 배포 직후 새로고침하면 최신본이 보인다.
"""
import os, re, sys, shutil, subprocess, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, "src")
CLONE = os.path.join(ROOT, "_deploy")
REPO = "https://github.com/comimi12/slnc-sop-dashboard.git"
IDENT = ["-c", "user.email=comimi12@gmail.com", "-c", "user.name=comimi12"]
TEXT = (".html", ".css", ".js")


def git(*args, cwd=None, check=True):
    r = subprocess.run(["git", *IDENT, *args], cwd=cwd or CLONE,
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if check and r.returncode != 0:
        raise SystemExit("[ERR] git %s\n%s" % (" ".join(args), (r.stderr or r.stdout)[-500:]))
    return r


def main():
    repo = REPO
    if "--repo" in sys.argv:
        repo = sys.argv[sys.argv.index("--repo") + 1]
    dry = "--dry" in sys.argv

    if not os.path.exists(os.path.join(SRC, "data.json")):
        raise SystemExit("[ERR] src/data.json 없음 — 먼저 `python build/extract.py` 실행")

    if not os.path.isdir(os.path.join(CLONE, ".git")):
        print("[clone] %s" % repo)
        r = subprocess.run(["git", "clone", "--depth", "1", repo, CLONE],
                           capture_output=True, text=True, encoding="utf-8", errors="replace")
        if r.returncode != 0:
            os.makedirs(CLONE, exist_ok=True)
            git("init", check=False)
            git("remote", "add", "origin", repo, check=False)
            git("checkout", "-b", "main", check=False)
            print("[init] 원격이 비어 있어 새 저장소로 시작합니다")
    else:
        git("fetch", "origin", check=False)
        git("reset", "--hard", "origin/main", check=False)

    token = "%s" % datetime.datetime.now().strftime("%Y%m%d-%H%M%S")

    # 기존 산출물 제거(.git 보존) 후 src/ 전체 복사
    for name in os.listdir(CLONE):
        if name == ".git":
            continue
        p = os.path.join(CLONE, name)
        shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    shutil.copytree(SRC, CLONE, dirs_exist_ok=True)

    # 캐시 우회용 빌드 토큰 주입
    for dirpath, _, files in os.walk(CLONE):
        if ".git" in dirpath:
            continue
        for f in files:
            if not f.endswith(TEXT):
                continue
            fp = os.path.join(dirpath, f)
            with open(fp, "r", encoding="utf-8") as fh:
                s = fh.read()
            if "__BUILD_TOKEN__" in s:
                with open(fp, "w", encoding="utf-8") as fh:
                    fh.write(s.replace("__BUILD_TOKEN__", token))

    with open(os.path.join(CLONE, ".nojekyll"), "w", encoding="utf-8") as f:
        f.write("")
    with open(os.path.join(CLONE, "ver.txt"), "w", encoding="utf-8") as f:
        f.write(token)

    n = sum(len(fs) for _, _, fs in os.walk(os.path.join(CLONE, "img")))
    print("[copy] 페이지 + 이미지 %d개 (build %s)" % (n, token))

    if dry:
        print("[dry] push 생략 — %s 확인" % CLONE)
        return

    git("add", "-A")
    if not git("status", "--porcelain").stdout.strip():
        print("[skip] 변경 없음")
        return
    git("commit", "-m", "update: SOP dashboard %s" % token)
    r = git("push", "-u", "origin", "main", check=False)
    if r.returncode != 0:
        print("[ERR] push 실패:\n%s" % (r.stderr or r.stdout)[-600:])
        raise SystemExit(1)
    url = "https://%s.github.io/%s/" % tuple(
        re.search(r"github\.com[:/]([^/]+)/([^/.]+)", repo).groups())
    print("[OK] 배포 완료 → %s" % url)


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
