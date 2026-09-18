# -*- coding: utf-8 -*-
"""그릴 영상 변환: 8K HEVC 원본 -> 휴대폰용 720p H.264 + 포스터 이미지.

원본은 7680x4320 HEVC 50Mbps라 파일 하나가 400~600MB다. 그대로는
GitHub Pages 업로드 한도(파일당 100MB)를 넘고, HEVC라 브라우저 재생도 안 된다.
720p H.264로 줄이고 moov를 앞으로 보내(faststart) 스트리밍 재생이 되게 한다.
"""
import os, sys, json, subprocess
import imageio_ffmpeg

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "src", "video")
SRC = r"C:\Users\owner\Desktop\교육팀\9. AI영상\미국\KSC\완료"
FF = imageio_ffmpeg.get_ffmpeg_exe()

# 휴대폰에서 끊기지 않게: 순수 CRF는 구간마다 3.4Mbps까지 튀어 약한 회선에서 멈춘다.
# maxrate/bufsize로 천장을 두고, GOP 2초로 시작·탐색을 빠르게.
ENC = ["-vf", "scale=-2:720", "-r", "30",
       "-c:v", "libx264", "-preset", "medium", "-crf", "27",
       "-maxrate", "1800k", "-bufsize", "3600k",
       "-g", "60", "-keyint_min", "30", "-sc_threshold", "0",
       "-profile:v", "main", "-level", "3.1", "-pix_fmt", "yuv420p"]

VIDEOS = [
    # 아래 항목은 build/woodae.py 가 만든다 (HTML 합성물 -> mp4). 여기서는 목록에만 올린다.
    dict(id="woodae-galbi", file=None,
         en="WOODAE GALBI SERVICE", kr="우대갈비 서비스 가이드",
         note="한 대 통구이 · 커팅 · 세팅 3단계 — 홀 직원용 60초 가이드 (자막 포함)."),
    # 아래 항목은 build/kkotsal.py 가 만든다 (HTML 합성물 -> mp4).
    dict(id="kkotsal", file=None,
         en="ROSE MEAT", kr="꽃살",
         note="꽃살 그릴 스탠다드 — 점화·온도 확인부터 커팅·제공까지 8단계 (영어 안내 음성·자막)."),
    dict(id="brisket", file="Brisket.mp4",
         en="PRIME BRISKET", kr="차돌",
         note="차돌 굽는 법 — 얇은 고기를 빠르게, 한 번만 뒤집어 굽습니다."),
    dict(id="la-kalbi", file="LA kalbi.mp4",
         en="LA KALBI", kr="LA 갈비",
         note="LA 갈비 굽는 법 — 뼈 쪽을 먼저 세워 굽고, 양념이 타지 않게 자리를 옮깁니다."),
    dict(id="non-marinated-kalbi", file="Nom marinated kalbi.mp4",
         en="NON-MARINATED KALBI", kr="생갈비",
         note="생갈비 굽는 법 — 양념이 없어 불 조절과 굽기 정도가 맛을 좌우합니다."),
]


def run(args):
    r = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise SystemExit("[ERR] ffmpeg 실패\n" + (r.stderr or "")[-800:])


def main():
    os.makedirs(OUT, exist_ok=True)
    meta = []
    for v in VIDEOS:
        mp4 = os.path.join(OUT, v["id"] + ".mp4")
        jpg = os.path.join(OUT, v["id"] + ".jpg")
        if not v["file"]:                      # 별도 스크립트가 만든 영상
            if not os.path.exists(mp4):
                print("[!] %s.mp4 없음 — build/woodae.py 를 먼저 실행" % v["id"])
                continue
            src = None
        else:
            src = os.path.join(SRC, v["file"])
            if not os.path.exists(src):
                print("[!] 원본 없음: " + src)
                continue
        if src and not os.path.exists(mp4):
            print("  변환 중: %s (%.0f MB)" % (v["file"], os.path.getsize(src) / 1e6))
            run([FF, "-y", "-i", src] + ENC + [
                 "-c:a", "aac", "-b:a", "96k", "-ac", "2",
                 "-movflags", "+faststart", mp4])
        if not os.path.exists(jpg):
            run([FF, "-y", "-ss", "2", "-i", mp4, "-frames:v", "1",
                 "-vf", "scale=-2:480", "-q:v", "4", jpg])
        v2 = dict(v)
        v2.pop("file")
        v2["mb"] = round(os.path.getsize(mp4) / 1e6, 1)
        meta.append(v2)
        print("  [OK] %-22s %5.1f MB" % (v["id"], v2["mb"]))

    with open(os.path.join(OUT, "index.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=1)
    tot = sum(x["mb"] for x in meta)
    print("[OK] 영상 %d개 / 합계 %.1f MB -> %s" % (len(meta), tot, OUT))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
