# -*- coding: utf-8 -*-
r"""
DRM PDF → 텍스트 추출 (Word COM). manuals_extract.py 의 PDF 경로 보완판.

왜 따로 있나
  manuals_extract.py 의 word 경로는 PDF 에서 매번 타임아웃했다. 원인은 DRM 거부가 아니라
  Word 의 **복구 확인 모달**이었다.
      "마지막으로 'X.pdf'을(를) 열었을 때 오류가 발생했습니다. 그래도 이 문서를 여시겠습니까?"
  Documents.Open 이 이 대화상자 뒤에서 멈춰 300초 타임아웃 → 0바이트.
  한 번 실패하면 Word 가 그 파일을 Resiliency\DisabledItems 에 올려 다음에도 같은 창이 뜬다.

대응
  1) 열기 전에 HKCU 의 Word Resiliency(DisabledItems / DocumentRecovery) 를 비운다.
  2) 감시 스레드가 #32770 대화상자를 찾아 '예/확인' 버튼을 눌러 준다.
  3) 그래도 안 열리면 OpenAndRepair 로 한 번 더 시도한다.

사용: python pdf_extract.py            # 기본 대상(TARGETS) 추출
      python pdf_extract.py "상대경로1" "상대경로2" ...
결과: manuals_text/<경로>.txt   (manuals_text/ 는 커밋 금지)
"""
import io
import os
import re
import sys
import time
import threading

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"C:\Users\owner\Desktop\교육팀\4. 신규매장매뉴얼, 교안"
OUTDIR = os.path.join(HERE, "manuals_text")

TARGETS = [
    "서비스 교육,가이드북/서비스 매뉴얼 PDF, 보안해제/SL&C 서비스 매뉴얼(교육용)_ver1.pdf",
    "서비스 교육,가이드북/서비스 매뉴얼 PDF, 보안해제/SL&C 현장 용어 백과사전.pdf",
    "골프우승/26년 4월 골프 우승 서비스 응대 매뉴얼.pdf",
]

# 자동으로 눌러 줄 버튼 (Word 복구/변환 확인 계열)
YES = ("예(&Y)", "예", "확인", "&OK", "OK", "Yes")
MAX_CHARS = 120000


def clear_resiliency():
    """Word 가 '문제 있는 문서'로 기억해 둔 목록을 지운다 → 복구 확인 창 자체를 없앤다."""
    import winreg
    removed = []
    base = r"Software\Microsoft\Office"
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, base) as k:
            vers = []
            i = 0
            while True:
                try:
                    vers.append(winreg.EnumKey(k, i)); i += 1
                except OSError:
                    break
    except OSError:
        return removed
    for v in vers:
        if not re.match(r"^\d+\.\d+$", v):
            continue
        for sub in ("DisabledItems", "DocumentRecovery"):
            p = rf"{base}\{v}\Word\Resiliency\{sub}"
            try:
                winreg.DeleteKey(winreg.HKEY_CURRENT_USER, p)
                removed.append(p)
            except OSError:
                pass
    return removed


def dismisser(stop):
    """뜨는 확인 대화상자를 눌러 주는 감시 스레드."""
    import win32gui
    import win32con
    seen = set()
    while not stop.is_set():
        dialogs = []

        def top(h, _):
            if win32gui.GetClassName(h) == "#32770":
                dialogs.append(h)
        try:
            win32gui.EnumWindows(top, None)
        except Exception:
            pass
        for h in dialogs:
            btn, label = None, ""

            def cb(c, _):
                nonlocal btn, label
                if win32gui.GetClassName(c) == "Button":
                    t = win32gui.GetWindowText(c)
                    if t in YES and btn is None:
                        btn, label = c, t
                return True
            try:
                win32gui.EnumChildWindows(h, cb, None)
            except Exception:
                continue
            if btn and h not in seen:
                seen.add(h)
                print(f"      [대화상자 자동응답] '{label}' 클릭", flush=True)
                try:
                    win32gui.SendMessage(btn, win32con.BM_CLICK, 0, 0)
                except Exception:
                    pass
        time.sleep(0.7)


def extract(app, path):
    doc = None
    for kwargs in ({"ConfirmConversions": False, "ReadOnly": True, "AddToRecentFiles": False,
                    "Visible": False},
                   {"ConfirmConversions": False, "ReadOnly": True, "AddToRecentFiles": False,
                    "Visible": False, "OpenAndRepair": True}):
        try:
            doc = app.Documents.Open(path, **kwargs)
            break
        except Exception as e:
            print(f"      Open 실패({'repair' if 'OpenAndRepair' in kwargs else '일반'}): "
                  f"{type(e).__name__}", flush=True)
    if doc is None:
        return None
    try:
        txt = doc.Range().Text or ""
        pages = doc.ComputeStatistics(2)          # wdStatisticPages
    finally:
        try:
            doc.Close(0)
        except Exception:
            pass
    txt = txt.replace("\r", "\n").replace("\x0b", "\n").replace("\x07", " ")
    txt = re.sub(r"[ \t]+", " ", txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
    return f"[{pages}쪽]\n\n" + txt[:MAX_CHARS]


def main():
    import pythoncom
    import win32com.client as win32

    rels = sys.argv[1:] or TARGETS
    os.makedirs(OUTDIR, exist_ok=True)

    rm = clear_resiliency()
    print(f"[준비] Word Resiliency 초기화 {len(rm)}건" + (f" — {rm}" if rm else ""))

    stop = threading.Event()
    th = threading.Thread(target=dismisser, args=(stop,), daemon=True)
    th.start()

    pythoncom.CoInitialize()
    app = win32.DispatchEx("Word.Application")
    app.Visible = False
    app.DisplayAlerts = 0
    for opt, val in (("ConfirmConversions", False), ("UpdateLinksAtOpen", False),
                     ("WarnBeforeSavingPrintingSendingMarkup", False),
                     ("CheckGrammarAsYouType", False), ("CheckSpellingAsYouType", False)):
        try:
            setattr(app.Options, opt, val)
        except Exception:
            pass
    try:
        app.AutomationSecurity = 3               # msoAutomationSecurityForceDisable (매크로 차단)
    except Exception:
        pass

    ok = fail = 0
    try:
        for rel in rels:
            full = os.path.join(ROOT, rel.replace("/", os.sep))
            outp = os.path.join(OUTDIR, rel.replace("/", "__") + ".txt")
            name = os.path.basename(rel)
            if not os.path.exists(full):
                print(f"[없음] {name}"); fail += 1; continue
            print(f"[추출] {name} ({os.path.getsize(full)/1048576:.1f}MB)", flush=True)
            t0 = time.time()
            try:
                txt = extract(app, full)
            except Exception as e:
                txt = None
                print(f"      예외: {type(e).__name__} {e}", flush=True)
            if txt and len(txt) > 30:
                with open(outp, "w", encoding="utf-8") as f:
                    f.write(txt)
                print(f"   → 완료 {len(txt):,}자 / {time.time()-t0:.0f}초", flush=True)
                ok += 1
            else:
                print(f"   → 실패 (본문 없음) / {time.time()-t0:.0f}초", flush=True)
                fail += 1
    finally:
        stop.set()
        try:
            app.Quit()
        except Exception:
            pass
        pythoncom.CoUninitialize()

    print(f"\n[완료] 성공 {ok} · 실패 {fail}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
