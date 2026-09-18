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

소리는 없다. 원본 합성물이 클립을 muted 로 깔고 자막으로만 설명한다.
"""
import io, os, sys, glob, time, shutil, subprocess
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

# 소리: 합성물은 클립을 muted 로 깔지만, 클립에는 현장 그릴 소리가 들어 있다.
# 화면과 같은 구간을 같은 배속으로 꺼내 타임라인 자리에 얹는다.
#   at=놓을 시각, a=클립 시작, take=쓸 소스 길이(초), rate=화면 배속 (길이 = take/rate)
# 2번 장면(01-ignite)은 0.18배속이라 늘리면 소리가 뭉개진다 — 대신 앞 장면(02-temp)의
# 그릴 소리를 그 구간까지 이어 덮는다. 제목(0~3초)과 닫는 카드(56~60초)는 무음.
AUDIO = [
    dict(at=3.0,  src="02-temp",  a=0.0,  take=7.9, rate=1.0),   # 01~02 장면을 함께 덮는다
    dict(at=12.0, src="03-oil",   a=2.0,  take=6.0, rate=1.0),
    dict(at=18.0, src="04-place", a=4.0,  take=5.0, rate=1.0),
    dict(at=23.0, src="05-sear",  a=0.3,  take=7.0, rate=0.9),
    dict(at=31.0, src="06-grill", a=2.0,  take=9.0, rate=1.0),
    dict(at=40.0, src="07-cut",   a=5.0,  take=8.0, rate=1.0),
    dict(at=48.0, src="08-serve", a=20.0, take=8.0, rate=1.0),
]

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


def build_audio():
    """클립의 현장 소리를 타임라인 자리에 얹어 60초 한 트랙으로 만든다."""
    out = os.path.join(WORK, "audio.m4a")
    ins, fc, labels = [], [], []
    for k, s in enumerate(AUDIO):
        span = s["take"] / s["rate"]
        ins += ["-ss", "%.3f" % s["a"], "-t", "%.3f" % s["take"],
                "-i", os.path.join(SRC, "clips", s["src"] + ".mp4")]
        ch = []
        if abs(s["rate"] - 1.0) > 1e-6:
            ch.append("atempo=%.6f" % s["rate"])
        ch += ["aresample=48000",
               "afade=t=in:st=0:d=0.35",
               "afade=t=out:st=%.2f:d=0.5" % max(span - 0.5, 0.01),
               "adelay=%d|%d" % (int(s["at"] * 1000), int(s["at"] * 1000))]
        fc.append("[%d:a]%s[a%d]" % (k, ",".join(ch), k))
        labels.append("[a%d]" % k)
    # 장면마다 녹음 레벨이 달라(-22~-29dB) loudnorm 으로 고르게 맞춘다.
    fc.append("%samix=inputs=%d:duration=longest:normalize=0,"
              "loudnorm=I=-18:TP=-2:LRA=11,aresample=48000,"
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
