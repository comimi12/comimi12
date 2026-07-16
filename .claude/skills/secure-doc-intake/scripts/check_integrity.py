#!/usr/bin/env python3
"""
secure-doc-intake 무결성 게이트.

이 스크립트는 DRM/암호화를 해제하지 않는다. 오직 "이 파일이 이미 평문(내보내기 완료)
상태인가"를 확장자 vs 실제 매직바이트로 판정할 뿐이다. 여전히 보호돼 있거나(암호화된
바이너리) 손상된 파일은 SUSPECT로 표시되고, 이 스킬은 그런 파일을 절대 열거나 변환하지
않는다 — 사용자가 정식 클라이언트로 다시 내보내야 한다.
"""

import sys
import zipfile
from pathlib import Path

if sys.stdout.encoding and sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# 확장자별 기대 매직바이트/구조
MAGIC = {
    ".pdf": (b"%PDF-", None),
    ".png": (b"\x89PNG\r\n\x1a\n", None),
    ".jpg": (b"\xff\xd8\xff", None),
    ".jpeg": (b"\xff\xd8\xff", None),
    ".gif": (b"GIF8", None),
    ".hwp": (b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1", None),  # OLE2 compound (구 HWP)
}
ZIP_BASED = {".xlsx", ".xls", ".docx", ".doc", ".pptx", ".hwpx", ".zip"}
TEXT_BASED = {".csv", ".txt", ".md", ".json"}


def check_file(path: Path) -> tuple[str, str]:
    """returns (status, reason). status: OK / SUSPECT / UNKNOWN"""
    ext = path.suffix.lower()
    try:
        head = path.read_bytes()[:8]
    except Exception as e:
        return "SUSPECT", f"읽기 실패: {e}"

    if ext in MAGIC:
        magic, _ = MAGIC[ext]
        if head.startswith(magic):
            return "OK", f"{ext} 매직바이트 일치"
        return "SUSPECT", f"{ext} 확장자인데 매직바이트 불일치 (head={head!r}) — 여전히 암호화/보호 상태이거나 손상된 파일일 수 있음"

    if ext in ZIP_BASED:
        try:
            with zipfile.ZipFile(path) as zf:
                bad = zf.testzip()
                if bad is not None:
                    return "SUSPECT", f"ZIP 내부 손상: {bad}"
                return "OK", "유효한 ZIP 기반 오피스 구조"
        except zipfile.BadZipFile:
            return "SUSPECT", f"{ext} 확장자인데 유효한 ZIP 구조가 아님 — 여전히 암호화/보호 상태이거나 손상된 파일일 수 있음"
        except Exception as e:
            return "SUSPECT", f"ZIP 검사 실패: {e}"

    if ext in TEXT_BASED:
        try:
            path.read_text(encoding="utf-8", errors="strict")
            return "OK", "UTF-8 텍스트로 정상 디코딩됨"
        except UnicodeDecodeError:
            try:
                path.read_text(encoding="cp949", errors="strict")
                return "OK", "CP949(EUC-KR) 텍스트로 정상 디코딩됨 — 필요시 UTF-8 변환 권장"
            except UnicodeDecodeError:
                return "SUSPECT", "텍스트 확장자인데 UTF-8/CP949 어느 쪽으로도 디코딩 안 됨 — 바이너리(암호화 가능성)"

    return "UNKNOWN", f"미지원 확장자({ext}) — 자동 판정 불가, 수동 확인 필요"


def main():
    if len(sys.argv) < 2:
        print("사용법: check_integrity.py <파일 또는 폴더> [...]")
        sys.exit(1)

    targets: list[Path] = []
    for arg in sys.argv[1:]:
        p = Path(arg)
        if p.is_dir():
            targets.extend(sorted(f for f in p.iterdir() if f.is_file()))
        elif p.is_file():
            targets.append(p)

    if not targets:
        print("대상 파일 없음.")
        sys.exit(0)

    exit_code = 0
    for f in targets:
        status, reason = check_file(f)
        print(f"[{status}] {f.name} — {reason}")
        if status == "SUSPECT":
            exit_code = 2
        elif status == "UNKNOWN" and exit_code == 0:
            exit_code = 1

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
