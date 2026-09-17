# -*- coding: utf-8 -*-
"""'우대갈비 서비스 가이드' HTML 합성물 -> 그릴 영상 탭에 넣을 mp4 한 편.

원본은 영상 파일이 아니라 1920x1080 무대 위에서 클립 2개와 자막을 타임라인으로
돌리는 HTML이다. 그대로는 <video>에 넣을 수 없어 실제 mp4로 만든다.

**끊김의 원인과 대처**
원본 HTML은 클립을 1배속으로 재생하면서, 타임라인이 요구하는 위치(want)와
0.34초 이상 벌어지면 되감는다:

    if (Math.abs(el.currentTime - want) > 0.34) el.currentTime = want;

그런데 타임라인은 소스를 0.79~0.10배속으로 느리게 요구하므로 재생이 매초
0.2초씩 앞서 나가고, 약 1.6초마다 0.34초씩 뒤로 튕긴다. 화면을 녹화하면
이 튕김이 그대로 찍힌다.

그래서 **클립을 미리 타임라인 배속대로 늘려 두고**(setpts/atempo) HTML은
1:1로 재생만 하게 바꾼다. 되감을 일이 없어 매끄럽게 녹화된다.

타임라인(HTML render 함수):
  vA: 소스 1.0~18.0 -> T 0~21.4                    (한 구간)
  vB: 소스 3.4~20.0~30.2~30.8 -> T 20.5~38~54~60   (세 구간, 끝은 10배 슬로우)
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
END = 60.0

A_SRC = "KakaoTalk_20260917_140220621.mp4"
B_SRC = "3.mp4"
A_SEGS = [(1.0, 18.0, 21.4)]                                   # (소스 시작, 끝, 늘린 길이)
B_SEGS = [(3.4, 20.0, 17.5), (20.0, 30.2, 16.0), (30.2, 30.8, 6.0)]
B_AT = 20.5
A_SPAN = sum(s[2] for s in A_SEGS)
B_SPAN = sum(s[2] for s in B_SEGS)

ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "26",
       "-maxrate", "1800k", "-bufsize", "3600k",
       "-g", "60", "-keyint_min", "30", "-sc_threshold", "0",
       "-profile:v", "main", "-level", "3.1", "-pix_fmt", "yuv420p"]


def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit("[ERR] " + " ".join(str(a) for a in args[:4]) + "\n" + (r.stderr or "")[-900:])
    return r


def atempo_chain(rate):
    """atempo는 0.5~2.0만 받으므로 극단적 배속은 여러 번 건다."""
    out = []
    while rate < 0.5:
        out.append("atempo=0.5")
        rate /= 0.5
    while rate > 2.0:
        out.append("atempo=2.0")
        rate /= 2.0
    out.append("atempo=%.6f" % rate)
    return ",".join(out)


def warp(name, segs, dst):
    """구간별로 소스를 늘려 이어 붙인다 (영상·소리 함께)."""
    src = os.path.join(SRC, "uploads", name)
    tag = os.path.splitext(name)[0][:6]
    parts = []
    for i, (a, b, span) in enumerate(segs):
        v = b - a
        p = os.path.join(WORK, "seg_%s_%d.mp4" % (tag, i))
        run([FF, "-y", "-ss", "%.3f" % a, "-t", "%.3f" % v, "-i", src,
             "-filter_complex",
             "[0:v]setpts=%.6f*PTS,fps=30[v];[0:a]%s,aresample=48000[a]"
             % (span / v, atempo_chain(v / span)),
             "-map", "[v]", "-map", "[a]"] + ENC + ["-c:a", "aac", "-b:a", "128k", p])
        parts.append(p)
    lst = os.path.join(WORK, "list_%s.txt" % tag)
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '%s'\n" % p.replace("\\", "/"))
    run([FF, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", dst])
    return dst


def prep():
    """타임라인 배속대로 늘린 클립을 만들고, HTML은 1:1 재생만 하도록 고친다."""
    os.makedirs(os.path.join(WORK, "uploads"), exist_ok=True)
    a = os.path.join(WORK, "uploads", "a.warp.mp4")
    b = os.path.join(WORK, "uploads", "b.warp.mp4")
    if not os.path.exists(a):
        print("  클립 A 배속 변환")
        warp(A_SRC, A_SEGS, a)
    if not os.path.exists(b):
        print("  클립 B 배속 변환 (3구간)")
        warp(B_SRC, B_SEGS, b)

    html = open(os.path.join(SRC, HTML), encoding="utf-8").read()
    html = html.replace("uploads/" + A_SRC, "uploads/a.warp.mp4")
    html = html.replace("uploads/" + B_SRC, "uploads/b.warp.mp4")
    # 늘려 둔 클립이므로 타임라인 위치를 그대로(1:1) 요구 -> 되감기 없음
    html = html.replace("sync(vA, seg(T, [0, 21.4], [1.0, 18.0]),", "sync(vA, T,")
    html = html.replace("sync(vB, seg(T, [20.5, 38, 54, 60], [3.4, 20.0, 30.2, 30.8]),",
                        "sync(vB, T - 20.5,")
    html = html.replace("> 0.34)", "> 1.5)")      # 미세 오차로 다시 튕기지 않게
    html = html.replace("var T = 0, playing = false,", "var T = 0, playing = true,")
    html = html.replace("<body>", "<body class=\"rec\">")
    open(os.path.join(WORK, "play.html"), "w", encoding="utf-8").write(html)
    return a, b


def record():
    from playwright.sync_api import sync_playwright
    vdir = os.path.join(WORK, "rec")
    shutil.rmtree(vdir, ignore_errors=True)
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        ctx = br.new_context(viewport={"width": 1280, "height": 720},
                             record_video_dir=vdir,
                             record_video_size={"width": 1280, "height": 720})
        pg = ctx.new_page()
        pg.goto("file:///" + os.path.join(WORK, "play.html").replace("\\", "/"))
        pg.wait_for_timeout(3000)
        pg.evaluate("() => { try { localStorage.removeItem('wg-guide-t'); } catch(e){} }")
        pg.evaluate("() => { T = 0; playing = true; }")
        pg.wait_for_timeout(int(END * 1000) + 2500)
        ctx.close()
        br.close()
    webm = sorted(glob.glob(os.path.join(vdir, "*.webm")), key=os.path.getmtime)[-1]
    print("  녹화: %.1f MB" % (os.path.getsize(webm) / 1e6))
    return webm


def lead_in(webm):
    """녹화는 페이지가 그려지기 전 흰 화면부터 시작한다. 첫 실제 프레임 시각."""
    r = subprocess.run(
        [FF, "-hide_banner", "-t", "10", "-i", webm,
         "-vf", "fps=20,signalstats,metadata=print:key=lavfi.signalstats.YAVG",
         "-f", "null", "-"],
        capture_output=True, text=True, encoding="utf-8", errors="replace")
    t = 0.0
    for m in re.finditer(r"pts_time:([0-9.]+)|YAVG=([0-9.]+)", r.stderr or ""):
        if m.group(1):
            t = float(m.group(1))
        elif float(m.group(2)) < 200:
            return round(t, 2)
    return 0.0


def build_audio(a, b):
    """배속까지 맞춰진 클립에서 소리만 꺼내 타임라인대로 겹친다."""
    out = os.path.join(WORK, "audio.m4a")
    fc = ("[0:a]afade=t=out:st=%.2f:d=0.8[x];"
          "[1:a]afade=t=in:st=0:d=0.8,afade=t=out:st=%.2f:d=3,adelay=%d|%d[y];"
          "[x][y]amix=inputs=2:duration=longest:normalize=0,atrim=0:%.2f,"
          "alimiter=limit=0.95[out]"
          % (A_SPAN - 0.9, B_SPAN - 8, int(B_AT * 1000), int(B_AT * 1000), END))
    run([FF, "-y", "-i", a, "-i", b, "-filter_complex", fc, "-map", "[out]",
         "-c:a", "aac", "-b:a", "128k", out])
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    print("[1/4] 클립을 타임라인 배속으로 미리 늘리기")
    a, b = prep()
    print("[2/4] 화면 녹화 (60초)")
    keep = sorted(glob.glob(os.path.join(WORK, "rec", "*.webm")), key=os.path.getmtime)
    webm = keep[-1] if ("--reuse" in sys.argv and keep) else record()
    print("[3/4] 오디오")
    audio = build_audio(a, b)
    print("[4/4] 합치기")
    mp4 = os.path.join(OUT, "woodae-galbi.mp4")
    off = lead_in(webm)
    print("     흰 화면 %.2fs 잘라냄" % off)
    run([FF, "-y", "-ss", str(off), "-i", webm, "-i", audio,
         "-map", "0:v:0", "-map", "1:a:0", "-vf", "scale=-2:720,fps=30"]
        + ENC + ["-c:a", "aac", "-b:a", "128k", "-ac", "2",
                 "-shortest", "-movflags", "+faststart", mp4])
    run([FF, "-y", "-ss", "24", "-i", mp4, "-frames:v", "1",
         "-vf", "scale=-2:480", "-q:v", "4", os.path.join(OUT, "woodae-galbi.jpg")])
    print("[OK] %s (%.1f MB)" % (mp4, os.path.getsize(mp4) / 1e6))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
