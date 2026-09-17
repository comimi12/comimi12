# -*- coding: utf-8 -*-
"""'우대갈비 서비스 가이드' HTML 합성물 -> 그릴 영상 탭에 넣을 mp4 한 편.

원본은 영상 파일이 아니라 1920x1080 무대 위에서 클립 2개와 자막을 타임라인으로
돌리는 HTML이다. 그대로는 <video>에 넣을 수 없어 실제 mp4로 만든다.

  1) 소스 클립(HEVC)을 H.264로 — 크로미움이 HEVC를 못 열면 화면이 검게 녹화된다
  2) Playwright로 60초 재생을 그대로 화면 녹화 (webm, 무음)
  3) 오디오는 따로 만든다 — HTML이 클립을 느리게 돌리므로(atempo) 같은 배속으로 맞춘다
  4) 영상+오디오를 합쳐 720p mp4

HTML 타임라인(render 함수)에서 읽은 값:
  vA: 소스 1.0~18.0s  ->  T 0~21.4      (배속 17.0/21.4)
  vB: 소스 3.4~30.8s  ->  T 20.5~60.0   (배속 27.4/39.5)
  교차 구간 T 20.5~21.3
"""
import os, re, sys, glob, shutil, subprocess
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "src", "video")
WORK = os.path.join(HERE, "_woodae")
SRC = r"C:\Users\owner\Downloads\우대갈비 영상 편집 (4)"
HTML = "우대갈비 서비스 가이드 (오프라인 재생).html"
FF = imageio_ffmpeg.get_ffmpeg_exe()

A_SRC, A_IN, A_OUT, A_AT = "KakaoTalk_20260917_140220621.mp4", 1.0, 18.0, 0.0
B_SRC, B_IN, B_OUT, B_AT = "3.mp4", 3.4, 30.8, 20.5
A_SPAN, B_SPAN = 21.4, 39.5
END = 60.0


def run(args, **kw):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace", **kw)
    if r.returncode != 0:
        raise SystemExit("[ERR] " + " ".join(str(a) for a in args[:3]) + "\n" + (r.stderr or "")[-900:])
    return r


def prep():
    """소스 클립을 H.264로 바꾸고, 그걸 보도록 HTML을 고쳐 작업 폴더에 둔다."""
    os.makedirs(os.path.join(WORK, "uploads"), exist_ok=True)
    html = open(os.path.join(SRC, HTML), encoding="utf-8").read()
    for name in (A_SRC, B_SRC):
        dst = os.path.join(WORK, "uploads", os.path.splitext(name)[0] + ".h264.mp4")
        if not os.path.exists(dst):
            print("  소스 변환: " + name)
            run([FF, "-y", "-i", os.path.join(SRC, "uploads", name),
                 "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                 "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", dst])
        html = html.replace("uploads/" + name,
                            "uploads/" + os.path.splitext(name)[0] + ".h264.mp4")
    # 자동 재생: 열리면 바로 R(클린 런)과 같은 상태로 시작
    html = html.replace("var T = 0, playing = false,", "var T = 0, playing = true,")
    html = html.replace("<body>", "<body class=\"rec\">")
    open(os.path.join(WORK, "play.html"), "w", encoding="utf-8").write(html)


def record():
    """60초 재생을 그대로 녹화 (webm, 무음)."""
    from playwright.sync_api import sync_playwright
    vdir = os.path.join(WORK, "rec")
    shutil.rmtree(vdir, ignore_errors=True)
    with sync_playwright() as p:
        b = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        ctx = b.new_context(viewport={"width": 1280, "height": 720},
                            record_video_dir=vdir,
                            record_video_size={"width": 1280, "height": 720})
        pg = ctx.new_page()
        pg.goto("file:///" + os.path.join(WORK, "play.html").replace("\\", "/"))
        pg.wait_for_timeout(2500)          # 클립 로딩
        pg.evaluate("() => { try { localStorage.removeItem('wg-guide-t'); } catch(e){} }")
        pg.evaluate("() => { T = 0; playing = true; }")
        pg.wait_for_timeout(int(END * 1000) + 2000)
        ctx.close()
        b.close()
    webm = sorted(glob.glob(os.path.join(vdir, "*.webm")), key=os.path.getmtime)[-1]
    print("  녹화: %s (%.1f MB)" % (os.path.basename(webm), os.path.getsize(webm) / 1e6))
    return webm


def lead_in(webm):
    """녹화는 페이지가 그려지기 전 흰 화면부터 시작한다. 첫 실제 프레임 시각을 찾는다."""
    r = subprocess.run(
        [FF, "-hide_banner", "-t", "8", "-i", webm,
         "-vf", "fps=20,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
         "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    t = 0.0
    for m in re.finditer(r"pts_time:([0-9.]+)|YAVG=([0-9.]+)", r.stderr or ""):
        if m.group(1):
            t = float(m.group(1))
        elif float(m.group(2)) < 200:      # 흰 화면(235)을 벗어난 첫 프레임
            return round(t, 2)
    return 0.0


def build_audio():
    """타임라인대로 두 클립의 소리를 이어 붙인다 (HTML과 같은 배속)."""
    out = os.path.join(WORK, "audio.m4a")
    fc = (
        "[0:a]atrim=%.3f:%.3f,asetpts=PTS-STARTPTS,atempo=%.6f,"
        "afade=t=out:st=%.2f:d=0.8[a];"
        "[1:a]atrim=%.3f:%.3f,asetpts=PTS-STARTPTS,atempo=%.6f,"
        "afade=t=in:st=0:d=0.8,adelay=%d|%d[b];"
        "[a][b]amix=inputs=2:duration=longest:normalize=0,"
        "atrim=0:%.2f,alimiter=limit=0.95[out]"
    ) % (A_IN, A_OUT, (A_OUT - A_IN) / A_SPAN, A_SPAN - 0.9,
         B_IN, B_OUT, (B_OUT - B_IN) / B_SPAN, int(B_AT * 1000), int(B_AT * 1000), END)
    run([FF, "-y",
         "-i", os.path.join(SRC, "uploads", A_SRC),
         "-i", os.path.join(SRC, "uploads", B_SRC),
         "-filter_complex", fc, "-map", "[out]",
         "-c:a", "aac", "-b:a", "128k", out])
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    print("[1/4] 소스 준비")
    prep()
    print("[2/4] 화면 녹화 (60초)")
    keep = sorted(glob.glob(os.path.join(WORK, "rec", "*.webm")), key=os.path.getmtime)
    webm = keep[-1] if ("--reuse" in sys.argv and keep) else record()
    print("[3/4] 오디오 합성")
    audio = build_audio()
    print("[4/4] 합치기")
    mp4 = os.path.join(OUT, "woodae-galbi.mp4")
    off = lead_in(webm)
    print("     흰 화면 %.2fs 잘라냄" % off)
    run([FF, "-y", "-ss", str(off), "-i", webm, "-i", audio,
         "-map", "0:v:0", "-map", "1:a:0",
         "-vf", "scale=-2:720,fps=30",
         "-c:v", "libx264", "-preset", "medium", "-crf", "24",
         "-profile:v", "main", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "128k", "-ac", "2",
         "-shortest", "-movflags", "+faststart", mp4])
    run([FF, "-y", "-ss", "24", "-i", mp4, "-frames:v", "1",
         "-vf", "scale=-2:480", "-q:v", "4",
         os.path.join(OUT, "woodae-galbi.jpg")])
    print("[OK] %s (%.1f MB)" % (mp4, os.path.getsize(mp4) / 1e6))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
