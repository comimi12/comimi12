#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Shift+Enter 줄바꿈 키바인딩을 사용자의 VS Code 계열 keybindings.json에 자동 설치.

setup-workspace 스킬이 호출한다. 완전 초보자(터미널 모름)도 "워크스페이스 세팅해줘"
한 번으로 줄바꿈 키가 잡히도록, /terminal-setup을 직접 치지 않아도 되게 한다.

설치하는 바인딩 (Claude Code /terminal-setup의 VS Code 출력과 동일):
  Shift+Enter (터미널 포커스 시) → ESC+CR 전송 → Claude Code가 줄바꿈으로 해석.

안전장치:
  - macOS / Linux만 자동 처리. Windows는 안내만(WSL·경로 복잡).
  - VS Code 계열 4종(Code / Code - Insiders / VSCodium / Cursor) 중 설치된 것에만.
  - 이미 동일 바인딩 있으면 건드리지 않음(멱등).
  - 기존 파일은 .bak 백업 후 수정.
  - JSONC(주석·trailing comma) 파싱 실패 시 그 파일은 건드리지 않고 건너뜀(클로버 방지).
경로는 $HOME 기준 — 하드코딩 없음(Mac↔WSL 동기화 안전).
"""
import json
import platform
import re
import sys
from pathlib import Path

BINDING = {
    "key": "shift+enter",
    "command": "workbench.action.terminal.sendSequence",
    "args": {"text": "\x1b\r"},
    "when": "terminalFocus",
}

VARIANTS = ["Code", "Code - Insiders", "VSCodium", "Cursor"]


def user_dirs():
    """OS별 VS Code 계열 User 디렉터리 후보 (존재하는 것만)."""
    home = Path.home()
    system = platform.system()
    bases = []
    if system == "Darwin":
        root = home / "Library" / "Application Support"
        bases = [root / v / "User" for v in VARIANTS]
    elif system == "Linux":
        root = home / ".config"
        bases = [root / v / "User" for v in VARIANTS]
    else:
        return None  # Windows 등 → 안내 fallback
    return [b for b in bases if b.is_dir()]


def strip_jsonc(s: str) -> str:
    """// 와 /* */ 주석 제거(문자열 리터럴 보존) 후 trailing comma 제거."""
    out, i, n, in_str = [], 0, len(s), False
    while i < n:
        c = s[i]
        if in_str:
            out.append(c)
            if c == "\\" and i + 1 < n:
                out.append(s[i + 1]); i += 2; continue
            if c == '"':
                in_str = False
            i += 1; continue
        if c == '"':
            in_str = True; out.append(c); i += 1; continue
        if c == "/" and i + 1 < n and s[i + 1] == "/":
            while i < n and s[i] != "\n":
                i += 1
            continue
        if c == "/" and i + 1 < n and s[i + 1] == "*":
            i += 2
            while i + 1 < n and not (s[i] == "*" and s[i + 1] == "/"):
                i += 1
            i += 2; continue
        out.append(c); i += 1
    stripped = "".join(out)
    return re.sub(r",(\s*[}\]])", r"\1", stripped)


def has_binding(arr) -> bool:
    for e in arr:
        if isinstance(e, dict) and e.get("key") == "shift+enter" \
           and e.get("command") == "workbench.action.terminal.sendSequence":
            return True
    return False


def ensure_file(kb_path: Path) -> str:
    """keybindings.json에 바인딩 보장. 결과 코드 문자열 반환."""
    if not kb_path.exists() or not kb_path.read_text(encoding="utf-8").strip():
        kb_path.write_text(json.dumps([BINDING], indent=4, ensure_ascii=False) + "\n",
                           encoding="utf-8")
        return "created"
    raw = kb_path.read_text(encoding="utf-8")
    try:
        arr = json.loads(strip_jsonc(raw))
        if not isinstance(arr, list):
            raise ValueError("keybindings.json 최상위가 배열이 아님")
    except Exception as e:
        return f"skip-unparseable ({e})"
    if has_binding(arr):
        return "already"
    kb_path.with_suffix(".json.bak").write_text(raw, encoding="utf-8")  # 백업
    arr.append(BINDING)
    kb_path.write_text(json.dumps(arr, indent=4, ensure_ascii=False) + "\n", encoding="utf-8")
    return "added"


def main():
    dirs = user_dirs()
    if dirs is None:
        print("MANUAL")
        print("이 OS에서는 자동 설정을 건너뜁니다.")
        print("Claude Code 프롬프트에 /terminal-setup 을 한 번 입력하면 줄바꿈 키가 설정됩니다.")
        return 0
    if not dirs:
        print("MANUAL")
        print("VS Code 계열 편집기를 찾지 못했습니다(설치 위치 비표준일 수 있음).")
        print("Claude Code 프롬프트에 /terminal-setup 을 한 번 입력하세요.")
        return 0

    results = []
    for d in dirs:
        kb = d / "keybindings.json"
        code = ensure_file(kb)
        results.append((d.parent.name, code))  # editor 이름

    print("DONE")
    any_ok = False
    for editor, code in results:
        if code in ("created", "added"):
            any_ok = True
            print(f"✓ {editor}: Shift+Enter 줄바꿈 설정 완료")
        elif code == "already":
            any_ok = True
            print(f"✓ {editor}: 이미 설정돼 있음 (변경 없음)")
        else:
            print(f"⚠️  {editor}: 자동 설정 건너뜀 — {code}")
            print("    → Claude Code 프롬프트에 /terminal-setup 입력으로 대체하세요.")
    if any_ok:
        print("적용: 새 입력부터 바로 동작합니다. 안 되면 VS Code 창을 한 번 재시작하세요.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
