"""index.html을 GitHub Pages(comimi12/vegas-food-map)에 공개 배포.
실행: python build/deploy.py  (build.py 먼저)
첫 실행 시 public 저장소 생성 + Pages 활성화.
"""
import shutil, subprocess, tempfile
from pathlib import Path

REPO = "comimi12/vegas-food-map"
ROOT = Path(__file__).resolve().parent.parent

def sh(*a, cwd=None, check=True):
    return subprocess.run(a, cwd=cwd, check=check, capture_output=True, text=True, encoding="utf-8")

exists = sh("gh", "repo", "view", REPO, check=False).returncode == 0
if not exists:
    sh("gh", "repo", "create", REPO, "--public", "--description", "라스베가스 맛집 지도 (캐치테이블 스타일)")

with tempfile.TemporaryDirectory() as d:
    d = Path(d)
    sh("git", "clone", f"https://github.com/{REPO}.git", str(d / "r"))
    r = d / "r"
    shutil.copy(ROOT / "index.html", r / "index.html")
    (r / ".nojekyll").write_text("")
    sh("git", "add", "index.html", ".nojekyll", cwd=r)
    if sh("git", "status", "--porcelain", cwd=r).stdout.strip():
        sh("git", "commit", "-m", "update dashboard", cwd=r)
        sh("git", "branch", "-M", "main", cwd=r)
        sh("git", "push", "-u", "origin", "main", cwd=r)
        print("pushed")
    else:
        print("no changes")

if not exists:
    sh("gh", "api", "-X", "POST", f"repos/{REPO}/pages", "-f", "source[branch]=main", "-f", "source[path]=/", check=False)
print(f"https://{REPO.split('/')[0]}.github.io/{REPO.split('/')[1]}/")
