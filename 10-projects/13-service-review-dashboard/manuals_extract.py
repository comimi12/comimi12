# -*- coding: utf-8 -*-
r"""
교육팀 매뉴얼 원문 추출기 (사내 문서보안/Fasoo DRM 문서 → 텍스트).

원본 317건은 전부 Fasoo DRM(\x9b DRMONE)으로 암호화돼 파이썬이 직접 못 읽는다.
정식 권한자(본인) PC에서 Office COM 으로 열면 DRM 클라이언트가 투명 복호화하므로,
그 객체 모델에서 텍스트만 뽑아 manuals_text/*.txt 로 저장한다. (원본은 읽기 전용 접근, 수정 없음)

  PPTX/PPT   → PowerPoint COM (슬라이드별 제목·본문·표)
  PDF/DOCX/DOC → Word COM (PDF 는 Word 변환 열기)
  XLSX/XLS   → Excel COM (시트별 UsedRange)

안전장치
  · DispatchEx 로 **전용 인스턴스**를 띄운다 → 사용자가 열어둔 Office 문서를 건드리지 않음
  · 파일 묶음마다 별도 프로세스 + 타임아웃. 멈추면 그 프로세스와 자기가 띄운 Office 만 정리
  · 이미 뽑은 파일은 건너뜀(resume). 실패/스킵은 manuals_text/_log.json 기록

사용: python manuals_extract.py
"""
import io
import json
import os
import re
import subprocess
import sys
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", write_through=True)

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = r"C:\Users\owner\Desktop\교육팀\4. 신규매장매뉴얼, 교안"
OUTDIR = os.path.join(HERE, "manuals_text")
LOG = os.path.join(OUTDIR, "_log.json")

SKIP_TOP = {"브랜드 로고", "(25년) 매니저 대상 교육", "플로어플랜"}
CAP_MB = {".pptx": 140, ".ppt": 140, ".docx": 45, ".doc": 45,
          ".pdf": 30, ".xlsx": 40, ".xls": 40}

MAX_CHARS = 60000
MAX_SHEET_ROWS = 400
CHUNK = 5                    # 한 프로세스가 처리할 파일 수 (앱 재기동 비용 절감)
CHUNK_TIMEOUT = 300          # 초
SOLO_TIMEOUT = 150


def route(ext):
    e = ext.lower()
    if e in (".pptx", ".ppt"):
        return "ppt"
    if e in (".pdf", ".docx", ".doc"):
        return "word"
    if e in (".xlsx", ".xls"):
        return "excel"
    return None


def clean(t):
    t = t.replace("\r", "\n").replace("\x0b", "\n").replace("\x07", " ")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    return t.strip()


# ════════════════════════ worker ════════════════════════

def new_app(kind):
    """DispatchEx = 전용 인스턴스. 사용자가 열어둔 Office 세션과 분리된다."""
    import win32com.client as win32
    if kind == "ppt":
        a = win32.DispatchEx("PowerPoint.Application")
        try:
            a.DisplayAlerts = 0
        except Exception:
            pass
    elif kind == "word":
        a = win32.DispatchEx("Word.Application")
        a.Visible = False
        a.DisplayAlerts = 0
        try:
            a.Options.ConfirmConversions = False
            a.Options.UpdateLinksAtOpen = False
            a.Options.WarnBeforeSavingPrintingSendingMarkup = False
        except Exception:
            pass
    else:
        a = win32.DispatchEx("Excel.Application")
        a.Visible = False
        a.DisplayAlerts = False
        a.AskToUpdateLinks = False
        a.EnableEvents = False
    return a


def x_ppt(app, path):
    pres = app.Presentations.Open(path, ReadOnly=1, WithWindow=0)
    try:
        out, n = [], pres.Slides.Count
        for i in range(1, n + 1):
            parts = []
            for sh in pres.Slides(i).Shapes:
                try:
                    if sh.HasTextFrame and sh.TextFrame.HasText:
                        parts.append(sh.TextFrame.TextRange.Text)
                except Exception:
                    pass
                try:
                    if sh.Type == 6:
                        for g in sh.GroupItems:
                            if g.HasTextFrame and g.TextFrame.HasText:
                                parts.append(g.TextFrame.TextRange.Text)
                except Exception:
                    pass
                try:
                    if sh.HasTable:
                        tb = sh.Table
                        for r in range(1, tb.Rows.Count + 1):
                            parts.append(" | ".join(
                                tb.Cell(r, c).Shape.TextFrame.TextRange.Text.strip()
                                for c in range(1, tb.Columns.Count + 1)))
                except Exception:
                    pass
            out.append(f"--- slide {i} ---\n" + clean("\n".join(parts)))
            if sum(len(x) for x in out) > MAX_CHARS:
                out.append(f"... (이하 생략, 총 {n}슬라이드)")
                break
        return f"[슬라이드 {n}장]\n\n" + "\n\n".join(out)
    finally:
        try:
            pres.Close()
        except Exception:
            pass


def x_word(app, path):
    doc = app.Documents.Open(path, ReadOnly=True, ConfirmConversions=False,
                             AddToRecentFiles=False, Visible=False)
    try:
        pages = 0
        try:
            pages = doc.ComputeStatistics(2)
        except Exception:
            pass
        txt = clean(doc.Range().Text)[:MAX_CHARS]
        return (f"[{pages}페이지]\n\n" if pages else "") + txt
    finally:
        try:
            doc.Close(0)
        except Exception:
            pass


def x_excel(app, path):
    wb = app.Workbooks.Open(path, ReadOnly=True, UpdateLinks=0)
    try:
        out = []
        for ws in wb.Worksheets:
            name = ws.Name
            lines = []
            try:
                ur = ws.UsedRange
                nr, nc = ur.Rows.Count, ur.Columns.Count
                r0, c0 = ur.Row, ur.Column
                rows, cols = min(nr, MAX_SHEET_ROWS), min(nc, 40)
                if rows and cols:
                    vals = ws.Range(ws.Cells(r0, c0), ws.Cells(r0 + rows - 1, c0 + cols - 1)).Value2
                    if not isinstance(vals, tuple):
                        vals = ((vals,),)
                    for r in vals:
                        if not isinstance(r, tuple):
                            r = (r,)
                        cells = ["" if v is None else str(v).strip() for v in r]
                        if any(cells):
                            lines.append(" | ".join(cells).rstrip(" |"))
            except Exception as e:
                lines.append(f"(셀 읽기 실패: {str(e)[:80]})")
            # 시트 위 도형/텍스트박스도 수집 (양식 문서는 본문이 도형에 있는 경우가 많다)
            try:
                for sh in ws.Shapes:
                    try:
                        if sh.TextFrame2.HasText:
                            t = sh.TextFrame2.TextRange.Text.strip()
                            if t:
                                lines.append(t)
                    except Exception:
                        pass
            except Exception:
                pass
            if lines:
                out.append(f"--- sheet: {name} ({nr if 'nr' in dir() else '?'}행) ---\n" + "\n".join(lines))
            if sum(len(x) for x in out) > MAX_CHARS:
                out.append("... (이하 생략)")
                break
        return clean("\n\n".join(out))
    finally:
        try:
            wb.Close(False)
        except Exception:
            pass


def worker(kind, jobfile):
    jobs = json.load(open(jobfile, encoding="utf-8"))
    fn = {"ppt": x_ppt, "word": x_word, "excel": x_excel}[kind]
    app = new_app(kind)
    try:
        for full, outp in jobs:
            try:
                txt = fn(app, full)
                with open(outp, "w", encoding="utf-8") as f:
                    f.write(txt)
                print(f"OK\t{len(txt)}\t{os.path.basename(full)}")
            except Exception as e:
                with open(outp + ".err", "w", encoding="utf-8") as f:
                    f.write(str(e)[:500])
                print(f"FAIL\t0\t{os.path.basename(full)}\t{str(e)[:120]}")
    finally:
        try:
            app.Quit()
        except Exception:
            pass


# ════════════════════════ driver ════════════════════════

def office_pids():
    """현재 떠 있는 Office 프로세스 PID (창 제목 없는 = 자동화용 숨김 인스턴스)."""
    try:
        out = subprocess.run(
            ["powershell", "-NoProfile", "-Command",
             "Get-Process WINWORD,EXCEL,POWERPNT -ErrorAction SilentlyContinue | "
             "Where-Object { $_.MainWindowTitle -eq '' } | Select-Object -Expand Id"],
            capture_output=True, text=True, timeout=30)
        return {int(x) for x in out.stdout.split() if x.strip().isdigit()}
    except Exception:
        return set()


def kill(pids):
    for p in pids:
        subprocess.run(["taskkill", "/PID", str(p), "/T", "/F"],
                       capture_output=True, timeout=30)


def run_chunk(kind, jobs, timeout):
    """jobs = [(full, outp)] → 별도 프로세스로 실행. 반환: 타임아웃 여부."""
    jf = os.path.join(OUTDIR, "_job.json")
    json.dump(jobs, open(jf, "w", encoding="utf-8"), ensure_ascii=False)
    before = office_pids()
    proc = subprocess.Popen([sys.executable, os.path.abspath(__file__), "--worker", kind, jf],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True, encoding="utf-8", errors="replace")
    try:
        out, _ = proc.communicate(timeout=timeout)
        for ln in (out or "").splitlines():
            if ln.strip():
                print("   " + ln.strip()[:150])
        return False
    except subprocess.TimeoutExpired:
        proc.kill()
        try:
            proc.communicate(timeout=15)
        except Exception:
            pass
        leaked = office_pids() - before          # 이 워커가 띄운 숨김 인스턴스만 정리
        kill(leaked)
        print(f"   [TIMEOUT] {timeout}s 초과 — 프로세스 정리 ({len(leaked)}개)")
        return True


def main():
    os.makedirs(OUTDIR, exist_ok=True)
    log = {"skip": [], "fail": []}
    if os.path.exists(LOG):
        try:
            log = json.load(open(LOG, encoding="utf-8"))
            log.setdefault("skip", []); log.setdefault("fail", [])
        except Exception:
            pass

    targets, skipped = [], []
    for dp, dn, fns in os.walk(ROOT):
        rel = os.path.relpath(dp, ROOT)
        top = "." if rel == "." else rel.replace("\\", "/").split("/")[0]
        if top in SKIP_TOP:
            dn[:] = []
            continue
        for fn in fns:
            if fn.startswith("~$"):
                continue
            ext = os.path.splitext(fn)[1].lower()
            kind = route(ext)
            if not kind:
                continue
            full = os.path.join(dp, fn)
            r = os.path.relpath(full, ROOT).replace("\\", "/")
            outp = os.path.join(OUTDIR, r.replace("/", "__") + ".txt")
            if os.path.exists(outp):
                continue
            mb = os.path.getsize(full) / 1048576
            if mb > CAP_MB.get(ext, 40):
                skipped.append(f"{r} ({mb:,.0f}MB)")
                continue
            targets.append((os.path.getsize(full), kind, full, outp, r))

    targets.sort()
    log["skip"] = skipped
    print(f"[시작] 추출 대상 {len(targets)}건 / 용량초과 스킵 {len(skipped)}건")

    # 종류별로 묶어야 앱 재기동이 줄어든다
    by_kind = {}
    for t in targets:
        by_kind.setdefault(t[1], []).append(t)

    t0, done = time.time(), 0
    for kind in ("excel", "word", "ppt"):
        items = by_kind.get(kind, [])
        for i in range(0, len(items), CHUNK):
            chunk = items[i:i + CHUNK]
            print(f"[{kind}] {i+1}~{i+len(chunk)}/{len(items)}  "
                  f"({sum(c[0] for c in chunk)/1048576:,.0f}MB)")
            timed_out = run_chunk(kind, [(c[2], c[3]) for c in chunk], CHUNK_TIMEOUT)
            if timed_out:                      # 묶음이 멈추면 남은 건 한 건씩 재시도
                for c in chunk:
                    if os.path.exists(c[3]):
                        continue
                    print(f"   [재시도] {c[4]}")
                    if run_chunk(kind, [(c[2], c[3])], SOLO_TIMEOUT):
                        log["fail"].append({"f": c[4], "e": "timeout"})
            done += sum(1 for c in chunk if os.path.exists(c[3]))
            json.dump(log, open(LOG, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    err = [f for f in os.listdir(OUTDIR) if f.endswith(".err")]
    print(f"\n[완료] 추출 {done}건, 오류 {len(err)}건, 용량초과 스킵 {len(skipped)}건, "
          f"소요 {(time.time()-t0)/60:.1f}분")


if __name__ == "__main__":
    if len(sys.argv) > 3 and sys.argv[1] == "--worker":
        worker(sys.argv[2], sys.argv[3])
    else:
        main()
