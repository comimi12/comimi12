#!/usr/bin/env python3
"""
YouTube -> Notion 인사이트 DB 저장 헬퍼.

두 단계로 사용:
  1) fetch : URL에서 메타데이터/자막/썸네일을 수집해 JSON으로 출력 (Claude가 자막을 읽고 인사이트 요약)
  2) save  : 요약한 인사이트와 함께 Notion DB에 행 추가 (썸네일은 파일 업로드, 실패 시 외부 URL)

필요 환경변수: NOTION_TOKEN
필요 패키지: requests, youtube-transcript-api
"""

import os
import re
import sys
import json
import argparse
import datetime
import mimetypes

import requests

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
DEFAULT_DB_ID = "380d66c3-d4d2-8171-8135-c40d4bffef87"  # "유튜브 인사이트" DB
DEFAULT_THUMB_DIR = "50-resources/attachments"
INSIGHT_LIMIT = 1000

# 컬럼명 (DB 스키마와 정확히 일치해야 함)
COL_TITLE = "영상 제목"
COL_CHANNEL = "채널"
COL_URL = "영상 URL"
COL_INSIGHT = "인사이트 (1000자 내)"
COL_THUMB = "썸네일"
COL_CATEGORY = "카테고리"
COL_DATE = "정리일"


# ----------------------------------------------------------------------------
# 공통
# ----------------------------------------------------------------------------
def extract_video_id(url: str) -> str:
    """다양한 유튜브 URL 형식에서 video id 추출."""
    url = url.strip()
    patterns = [
        r"(?:v=|/watch\?.*v=)([0-9A-Za-z_-]{11})",
        r"youtu\.be/([0-9A-Za-z_-]{11})",
        r"/shorts/([0-9A-Za-z_-]{11})",
        r"/embed/([0-9A-Za-z_-]{11})",
        r"/live/([0-9A-Za-z_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    # URL이 아니라 id만 준 경우
    if re.fullmatch(r"[0-9A-Za-z_-]{11}", url):
        return url
    raise ValueError(f"유튜브 video id를 찾을 수 없습니다: {url}")


def notion_headers(extra=None):
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        print("Error: NOTION_TOKEN 환경변수가 설정되지 않았습니다", file=sys.stderr)
        sys.exit(1)
    h = {
        "Authorization": f"Bearer {token}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }
    if extra:
        h.update(extra)
    return h


# ----------------------------------------------------------------------------
# fetch
# ----------------------------------------------------------------------------
def get_metadata(video_id: str) -> dict:
    """oEmbed로 제목/채널/썸네일 URL 수집 (API 키 불필요)."""
    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    r = requests.get(
        "https://www.youtube.com/oembed",
        params={"url": watch_url, "format": "json"},
        timeout=20,
    )
    r.raise_for_status()
    o = r.json()
    return {
        "title": o.get("title", ""),
        "channel": o.get("author_name", ""),
        "thumbnail_url": o.get("thumbnail_url", ""),
        "watch_url": watch_url,
    }


def download_thumbnail(video_id: str, out_dir: str) -> str:
    """최대 해상도 썸네일을 받아 파일로 저장. 경로 반환."""
    os.makedirs(out_dir, exist_ok=True)
    candidates = [
        f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg",
        f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        f"https://i.ytimg.com/vi/{video_id}/mqdefault.jpg",
    ]
    for url in candidates:
        try:
            r = requests.get(url, timeout=20)
            if r.status_code == 200 and len(r.content) > 1000:
                path = os.path.join(out_dir, f"youtube-insight_{video_id}.jpg")
                with open(path, "wb") as f:
                    f.write(r.content)
                return path
        except requests.RequestException:
            continue
    return ""


def get_transcript(video_id: str, langs) -> str:
    from youtube_transcript_api import YouTubeTranscriptApi

    api = YouTubeTranscriptApi()
    fetched = api.fetch(video_id, languages=langs)
    return " ".join(s.text for s in fetched).strip()


def cmd_fetch(args):
    video_id = extract_video_id(args.url)
    meta = get_metadata(video_id)
    thumb_path = download_thumbnail(video_id, args.thumb_dir)
    langs = [s.strip() for s in args.langs.split(",") if s.strip()]

    transcript = ""
    transcript_error = ""
    try:
        transcript = get_transcript(video_id, langs)
    except Exception as e:  # noqa: BLE001
        transcript_error = f"{type(e).__name__}: {e}"

    out = {
        "video_id": video_id,
        "title": meta["title"],
        "channel": meta["channel"],
        "url": meta["watch_url"],
        "thumbnail_url": meta["thumbnail_url"],
        "thumbnail_path": thumb_path,
        "transcript_len": len(transcript),
        "transcript": transcript,
        "transcript_error": transcript_error,
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


# ----------------------------------------------------------------------------
# save
# ----------------------------------------------------------------------------
def upload_file_to_notion(path: str) -> str:
    """Notion File Upload API로 로컬 파일 업로드. file_upload id 반환 (실패 시 빈 문자열)."""
    try:
        filename = os.path.basename(path)
        content_type = mimetypes.guess_type(path)[0] or "image/jpeg"
        # 1) 업로드 객체 생성
        r = requests.post(
            f"{NOTION_API}/file_uploads",
            headers=notion_headers(),
            json={"filename": filename, "content_type": content_type},
            timeout=30,
        )
        r.raise_for_status()
        up = r.json()
        upload_id = up["id"]
        upload_url = up["upload_url"]
        # 2) 실제 파일 전송 (multipart)
        with open(path, "rb") as f:
            files = {"file": (filename, f, content_type)}
            # multipart 전송 시 Content-Type 헤더는 requests가 자동 설정
            hdr = notion_headers()
            hdr.pop("Content-Type", None)
            r2 = requests.post(upload_url, headers=hdr, files=files, timeout=60)
        r2.raise_for_status()
        return upload_id
    except Exception as e:  # noqa: BLE001
        print(f"[warn] 썸네일 파일 업로드 실패, 외부 URL로 대체: {e}", file=sys.stderr)
        return ""


def build_thumbnail_prop(args):
    """썸네일 files 속성 구성: 로컬 파일 업로드 우선, 실패 시 외부 URL."""
    if args.thumbnail and os.path.exists(args.thumbnail):
        upload_id = upload_file_to_notion(args.thumbnail)
        if upload_id:
            return {
                "files": [
                    {
                        "type": "file_upload",
                        "name": os.path.basename(args.thumbnail),
                        "file_upload": {"id": upload_id},
                    }
                ]
            }
    if args.thumbnail_url:
        return {
            "files": [
                {
                    "type": "external",
                    "name": "thumbnail.jpg",
                    "external": {"url": args.thumbnail_url},
                }
            ]
        }
    return None


def cmd_save(args):
    insight = args.insight.strip()
    if len(insight) > INSIGHT_LIMIT:
        insight = insight[:INSIGHT_LIMIT]
        print(f"[warn] 인사이트가 {INSIGHT_LIMIT}자를 초과해 잘렸습니다", file=sys.stderr)

    date_val = args.date or datetime.date.today().isoformat()
    categories = [c.strip() for c in (args.category or "").split(",") if c.strip()]

    props = {
        COL_TITLE: {"title": [{"text": {"content": args.title}}]},
        COL_CHANNEL: {"rich_text": [{"text": {"content": args.channel}}]},
        COL_URL: {"url": args.url},
        COL_INSIGHT: {"rich_text": [{"text": {"content": insight}}]},
        COL_DATE: {"date": {"start": date_val}},
    }
    if categories:
        props[COL_CATEGORY] = {"multi_select": [{"name": c} for c in categories]}

    thumb_prop = build_thumbnail_prop(args)
    if thumb_prop:
        props[COL_THUMB] = thumb_prop

    payload = {"parent": {"database_id": args.db}, "properties": props}
    r = requests.post(
        f"{NOTION_API}/pages", headers=notion_headers(), json=payload, timeout=60
    )
    if r.status_code >= 300:
        print(f"Error {r.status_code}: {r.text}", file=sys.stderr)
        sys.exit(1)
    res = r.json()
    print(json.dumps({"ok": True, "page_id": res.get("id"), "url": res.get("url")}, ensure_ascii=False, indent=2))


# ----------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="YouTube -> Notion 인사이트 저장")
    sub = parser.add_subparsers(dest="command", required=True)

    p_fetch = sub.add_parser("fetch", help="URL에서 메타데이터/자막/썸네일 수집")
    p_fetch.add_argument("url", help="유튜브 URL 또는 video id")
    p_fetch.add_argument("--langs", default="ko,en", help="자막 우선 언어 (쉼표구분, 기본 ko,en)")
    p_fetch.add_argument("--thumb-dir", dest="thumb_dir", default=DEFAULT_THUMB_DIR, help="썸네일 저장 폴더")

    p_save = sub.add_parser("save", help="Notion DB에 행 추가")
    p_save.add_argument("--db", default=DEFAULT_DB_ID, help="대상 DB id")
    p_save.add_argument("--title", required=True)
    p_save.add_argument("--channel", default="")
    p_save.add_argument("--url", required=True)
    p_save.add_argument("--insight", required=True, help="1000자 이내 인사이트")
    p_save.add_argument("--category", default="", help="카테고리 (쉼표구분)")
    p_save.add_argument("--date", default="", help="정리일 YYYY-MM-DD (기본 오늘)")
    p_save.add_argument("--thumbnail", default="", help="로컬 썸네일 파일 경로 (파일 업로드)")
    p_save.add_argument("--thumbnail-url", dest="thumbnail_url", default="", help="외부 썸네일 URL (업로드 실패 시 대체)")

    args = parser.parse_args()
    if args.command == "fetch":
        cmd_fetch(args)
    elif args.command == "save":
        cmd_save(args)


if __name__ == "__main__":
    main()
