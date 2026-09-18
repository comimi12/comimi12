# -*- coding: utf-8 -*-
u"""'꽃살 ROSE MEAT — 그릴 스탠다드' HTML 합성물 -> 그릴 영상 탭에 넣을 mp4 한 편.

원본(`Downloads\\export\\꽃살 그릴 교육영상.dc.html`)은 영상 파일이 아니라 1920x1080
무대 위에서 클립 8개와 자막을 60초 타임라인으로 돌리는 React 합성물이다.

woodae.py 처럼 실시간 화면 녹화를 하지 않는다. 이 합성물은 호스트가 프레임 단위로
장면을 요구하는 통로(`data-om-seek-to-time-frame` + `data-om-exportable-video-with-duration-secs`)
를 이미 갖고 있어서, **한 프레임씩 요구하고 한 장씩 찍는** 편이 더 정확하다.
녹화 프레임 드랍도, 흰 화면 잘라내기도 필요 없다.

  1. 클립 8개를 H.264로 변환 (원본이 HEVC라 크로미움이 못 연다)
  2. performance.now 를 얼려 합성물의 자체 재생 루프를 멈춘다
     (얼리지 않으면 마지막 seek 400ms 뒤 루프가 다시 돌아 화면이 어긋난다)
  3. t = 0, 1/30, 2/30 … 60초까지 seek -> 영상 디코드 대기 -> 스크린샷
  4. 프레임을 이어 붙여 720p H.264 (faststart) 로 인코딩

소리는 따로 얹는다. 원본 합성물은 클립을 muted 로 깔지만, 클립에는 8단계를 안내하는
영어 내레이션과 현장 그릴 소리가 들어 있다 — 아래 `VO` 주석 참고.
"""
import io, os, re, sys, glob, time, shutil, subprocess
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "src", "video")
WORK = os.path.join(HERE, "_kkotsal")
FRAMES = os.path.join(WORK, "frames")
SRC = r"C:\Users\owner\Downloads\export"
HTML = u"꽃살 그릴 교육영상.dc.html"
FF = imageio_ffmpeg.get_ffmpeg_exe()

VID = "kkotsal"
DUR, FPS = 60.0, 30
POSTER_AT = 26          # 05 시어링 장면 — 고기가 가장 잘 보인다

ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "26",
       "-maxrate", "1800k", "-bufsize", "3600k",
       "-g", "60", "-keyint_min", "30", "-sc_threshold", "0",
       "-profile:v", "main", "-level", "3.1", "-pix_fmt", "yuv420p"]

# ── 소리 ───────────────────────────────────────────────────────────────
# 클립에는 8단계를 안내하는 **영어 내레이션**과 현장 그릴 소리가 같이 들어 있다.
# 내레이션은 클립 경계와 따로 논다 — 점화 안내는 `02-temp`에, 온도 안내는 `03-oil`
# 끝에 있고, `01-ignite`·`05-sear`에는 말이 아예 없다.
#
# 그래서 합성물의 화면 in/out 지점을 그대로 소리에 쓰면 안 된다(처음엔 그렇게 했다):
# 문장이 중간에서 잘리고, 2번 장면(온도 체크) 위에 점화 안내가 얹히고,
# 4번 장면은 정작 제 안내("한 줄로 겹치지 않게")가 통째로 잘려 나갔다.
#
# 아래는 **문장 단위로 잘라 자막에 맞는 장면에 놓은 것**이다.
#   at=놓을 시각, src/a~b=클립에서 꺼낼 구간, cap=맞춰야 할 자막
VO = [
    dict(at=3.05,  src="02-temp",  a=3.55, b=7.45,  cap="01 가스불 점화"),
    dict(at=7.45,  src="03-oil",   a=8.20, b=10.70, cap="02 그릴 온도 체크"),
    dict(at=12.45, src="03-oil",   a=4.70, b=7.85,  cap="03 소기름 코팅"),
    dict(at=18.10, src="04-place", a=0.00, b=5.54,  cap="04 고기 올리기"),
    dict(at=24.10, src="04-place", a=5.54, b=10.94, cap="05 시어링"),
    dict(at=31.20, src="06-grill", a=3.30, b=12.10, cap="06 타지 않게 굽기"),
    dict(at=40.20, src="07-cut",   a=0.00, b=8.10,  cap="07 한입 크기 커팅"),
    dict(at=48.60, src="08-serve", a=0.00, b=4.36,  cap="08 담아서"),
    dict(at=53.20, src="08-serve", a=22.40, b=25.30, cap="08 코멘트와 함께 제공"),
]

# 말 사이가 비면 화면만 돌아 허전하다. 클립에서 **말이 없는 구간**만 모아
# 낮게 깔아 둔다 — 내레이션 구간과 겹쳐도 같은 말이 두 번 들리지 않는다.
BED = [("05-sear", 0.20, 7.20), ("07-cut", 8.60, 19.60),
       ("08-serve", 6.20, 19.60), ("04-place", 11.40, 16.00)]
BED_AT, BED_UNTIL = 3.0, 56.0     # 제목(0~3초)과 닫는 카드(56~60초)는 무음

VO_LEVEL, BED_LEVEL = -20.0, -34.0   # 구간마다 녹음 레벨이 달라 각각 맞춰 준다

# 브라우저 쪽 도우미: 재생 루프를 멈추고, 한 프레임씩 요구한다.
HOOK = """
window.__freeze = () => {                 // 합성물의 requestAnimationFrame 루프 정지
  const now = performance.now.bind(performance), t = now();
  performance.now = () => t;              // dt = 0, 그리고 seek 억제창이 영구히 열림
};
window.__seek = (t) => new Promise(res => {
  const root = document.querySelector('[data-om-exportable-video-with-duration-secs]');
  root.dispatchEvent(new CustomEvent('data-om-seek-to-time-frame',
                                     { detail: { time: t, sync: true } }));
  const raf2 = cb => requestAnimationFrame(() => requestAnimationFrame(cb));
  raf2(() => {                            // 자막은 그려졌고, 이제 영상 디코드를 기다린다
    const vs = [...document.querySelectorAll('video')].filter(v => v.seeking);
    if (!vs.length) return raf2(() => res(0));
    let n = vs.length;
    const tick = () => { if (--n === 0) raf2(() => res(vs.length)); };
    vs.forEach(v => v.addEventListener('seeked', tick, { once: true }));
    setTimeout(() => res(-1), 3000);      // 디코드가 막히면 그냥 찍는다
  });
});
"""


def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit("[ERR] " + " ".join(str(a) for a in args[:4]) + "\n" + (r.stderr or "")[-900:])
    return r


def prep():
    """클립을 H.264로 바꾸고, 합성물을 작업 폴더에 그대로 복사한다."""
    os.makedirs(os.path.join(WORK, "clips"), exist_ok=True)
    if not os.path.isdir(os.path.join(SRC, "clips")):
        # 원본 export 폴더는 한 번 쓰고 지워진다. 작업 폴더 사본으로 계속 간다.
        n = len(glob.glob(os.path.join(WORK, "clips", "*.mp4")))
        if n != 8 or not os.path.exists(os.path.join(WORK, "play.html")):
            raise SystemExit("[ERR] 원본(%s)도 작업 사본도 없다 — 합성물을 다시 내보내야 한다" % SRC)
        print("  원본 폴더 없음 — 작업 폴더 사본 %d개 사용" % n)
        return
    for f in sorted(os.listdir(os.path.join(SRC, "clips"))):
        dst = os.path.join(WORK, "clips", f)
        if os.path.exists(dst):
            continue
        print("  H.264 변환: " + f)
        run([FF, "-y", "-i", os.path.join(SRC, "clips", f),
             "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p",
             "-an", "-movflags", "+faststart", dst])
    shutil.copy(os.path.join(SRC, "support.js"), os.path.join(WORK, "support.js"))
    html = io.open(os.path.join(SRC, HTML), encoding="utf-8").read()
    io.open(os.path.join(WORK, "play.html"), "w", encoding="utf-8").write(html)


def capture():
    """t를 1/30초씩 밀면서 한 장씩 찍는다."""
    from playwright.sync_api import sync_playwright
    shutil.rmtree(FRAMES, ignore_errors=True)
    os.makedirs(FRAMES)
    n = int(DUR * FPS)
    t0 = time.time()
    with sync_playwright() as p:
        br = p.chromium.launch(args=["--autoplay-policy=no-user-gesture-required"])
        ctx = br.new_context(viewport={"width": 1280, "height": 720}, device_scale_factor=1)
        pg = ctx.new_page()
        pg.goto("file:///" + os.path.join(WORK, "play.html").replace("\\", "/"))
        pg.wait_for_timeout(4000)                      # React·웹폰트·영상 메타데이터
        pg.evaluate(HOOK)
        dur = pg.evaluate("[...document.querySelectorAll('video')].map(v => v.duration)")
        if len(dur) != 8 or not all(d and d > 0 for d in dur):
            raise SystemExit("[ERR] 클립 8개가 준비되지 않았다: %r" % (dur,))
        pg.evaluate("window.__freeze()")
        for i in range(n):
            pg.evaluate("t => window.__seek(t)", i / float(FPS))
            pg.screenshot(path=os.path.join(FRAMES, "%05d.jpg" % i), type="jpeg", quality=92)
            if i % 150 == 0 or i == n - 1:
                el = time.time() - t0
                print("  %4d/%d  %5.1f초  (경과 %.0f초, 남은 %.0f초)"
                      % (i + 1, n, i / float(FPS), el, el / (i + 1) * (n - i - 1)))
        ctx.close()
        br.close()
    return n


def clip(name):
    """원본 export 폴더가 지워졌으면 작업 폴더의 H.264 사본을 쓴다 (소리 동일)."""
    p = os.path.join(SRC, "clips", name + ".mp4")
    return p if os.path.exists(p) else os.path.join(WORK, "clips", name + ".mp4")


def mean_db(path, a, b):
    r = subprocess.run([FF, "-hide_banner", "-ss", "%.3f" % a, "-t", "%.3f" % (b - a),
                        "-i", path, "-af", "volumedetect", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"mean_volume:\s*(-?[\d.]+) dB", r.stderr or "")
    return float(m.group(1)) if m else -99.0


def build_bed():
    """말이 없는 구간만 이어 붙인 그릴 앰비언스 (필요한 길이만큼 반복)."""
    need = BED_UNTIL - BED_AT
    parts, total = [], 0.0
    while total < need:
        for i, (src, a, b) in enumerate(BED):
            p = os.path.join(WORK, "bed_%d_%d.m4a" % (len(parts), i))
            g = BED_LEVEL - mean_db(clip(src), a, b)
            run([FF, "-y", "-ss", "%.3f" % a, "-t", "%.3f" % (b - a), "-i", clip(src),
                 "-af", "volume=%.2fdB,aresample=48000,afade=t=in:st=0:d=0.4,"
                        "afade=t=out:st=%.2f:d=0.4" % (g, b - a - 0.4),
                 "-c:a", "aac", "-b:a", "128k", "-ac", "2", p])
            parts.append(p)
            total += b - a
            if total >= need:
                break
    lst = os.path.join(WORK, "bed_list.txt")
    with open(lst, "w", encoding="utf-8") as f:
        for p in parts:
            f.write("file '%s'\n" % p.replace("\\", "/"))
    out = os.path.join(WORK, "bed.m4a")
    run([FF, "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", out])
    return out


def build_audio():
    """내레이션을 자막에 맞는 장면에 놓고, 그 아래 앰비언스를 깔아 60초 한 트랙으로."""
    bed = build_bed()
    out = os.path.join(WORK, "audio.m4a")
    span = BED_UNTIL - BED_AT
    ins = ["-t", "%.3f" % span, "-i", bed]
    fc = ["[0:a]afade=t=in:st=0:d=1.2,afade=t=out:st=%.2f:d=1.5,adelay=%d|%d[bed]"
          % (span - 1.5, int(BED_AT * 1000), int(BED_AT * 1000))]
    labels = ["[bed]"]
    for k, s in enumerate(VO, start=1):
        d = s["b"] - s["a"]
        g = VO_LEVEL - mean_db(clip(s["src"]), s["a"], s["b"])
        ins += ["-ss", "%.3f" % s["a"], "-t", "%.3f" % d, "-i", clip(s["src"])]
        fc.append("[%d:a]volume=%.2fdB,aresample=48000,afade=t=in:st=0:d=0.15,"
                  "afade=t=out:st=%.2f:d=0.25,adelay=%d|%d[v%d]"
                  % (k, g, max(d - 0.25, 0.01), int(s["at"] * 1000), int(s["at"] * 1000), k))
        labels.append("[v%d]" % k)
        print("  %5.2f초  %-22s %s" % (s["at"], s["cap"], s["src"]))
    fc.append("%samix=inputs=%d:duration=longest:normalize=0,"
              "apad,atrim=0:%.2f,alimiter=limit=0.95[out]"
              % ("".join(labels), len(labels), DUR))
    run([FF, "-y"] + ins + ["-filter_complex", ";".join(fc), "-map", "[out]",
                            "-c:a", "aac", "-b:a", "128k", "-ac", "2", out])
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    print("[1/4] 클립 준비")
    prep()
    print("[2/4] 프레임 캡처 (%d장 · 10분 안팎)" % int(DUR * FPS))
    have = len(glob.glob(os.path.join(FRAMES, "*.jpg")))
    if "--reuse" in sys.argv and have:
        print("  캡처본 재사용: %d장" % have)
    else:
        capture()
    print("[3/4] 소리")
    audio = build_audio()
    print("[4/4] 인코딩")
    mp4 = os.path.join(OUT, VID + ".mp4")
    run([FF, "-y", "-framerate", str(FPS), "-i", os.path.join(FRAMES, "%05d.jpg"),
         "-i", audio, "-map", "0:v:0", "-map", "1:a:0",
         "-vf", "scale=-2:720", "-r", str(FPS)] + ENC
        + ["-c:a", "aac", "-b:a", "128k", "-ac", "2", "-shortest",
           "-movflags", "+faststart", mp4])
    run([FF, "-y", "-ss", str(POSTER_AT), "-i", mp4, "-frames:v", "1",
         "-vf", "scale=-2:480", "-q:v", "4", os.path.join(OUT, VID + ".jpg")])
    print("[OK] %s (%.1f MB)" % (mp4, os.path.getsize(mp4) / 1e6))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
