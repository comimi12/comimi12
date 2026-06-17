---
name: youtube-to-notion
description: 자막 있는 유튜브 URL을 받아 인사이트를 1000자 이내로 요약하고 썸네일을 파일로 저장하여 Notion "유튜브 인사이트" DB에 행으로 추가. "유튜브 정리", "이 영상 노션에 저장", "유튜브 인사이트 저장", "영상 요약해서 노션", "youtube to notion" 등을 언급하거나 유튜브 URL을 주면서 노션 저장을 요청하면 자동 실행.
allowed-tools:
  - Bash
  - Read
  - Write
---

# YouTube → Notion 인사이트 저장 스킬

자막 있는 유튜브 URL을 받아 **메타데이터·자막·썸네일을 수집 → 인사이트 1000자 요약 → Notion DB 행 추가**까지 자동화한다.

## 사전 요구사항

- 환경변수 `NOTION_TOKEN` (settings.local.json에 설정됨)
- Python 패키지: `requests`, `youtube-transcript-api`
- 대상 DB: "유튜브 인사이트" (기본 id는 스크립트에 하드코딩, `--db`로 변경 가능)
  - 컬럼: 영상 제목(title) · 채널(rich_text) · 영상 URL(url) · 인사이트 (1000자 내)(rich_text) · 썸네일(files) · 카테고리(multi_select) · 정리일(date)

## 실행 환경 (중요)

- **Bash 도구**로 실행한다 (PowerShell은 한글 인자 인코딩이 깨짐).
- Python 경로: `/c/Users/owner/AppData/Local/Programs/Python/Python312/python3.exe`
- 항상 `PYTHONUTF8=1` 환경에서 실행한다.

```bash
PYBIN="/c/Users/owner/AppData/Local/Programs/Python/Python312/python3.exe"
SCRIPT=".claude/skills/youtube-to-notion/scripts/youtube_to_notion.py"
```

## 절차

### 1단계: 수집 (fetch)

URL에서 제목·채널·자막·썸네일을 가져온다. 썸네일은 `50-resources/attachments/`에 파일로 저장된다.

```bash
PYTHONUTF8=1 "$PYBIN" "$SCRIPT" fetch "<유튜브_URL>"
```

출력(JSON)에서 확인:
- `title`, `channel`, `url`, `thumbnail_path`, `thumbnail_url`
- `transcript` (자막 전문), `transcript_len`
- `transcript_error` — 비어있지 않으면 자막 수집 실패. 사용자에게 알리고, 다른 언어(`--langs`)를 시도하거나 자막 없는 영상임을 안내.

### 2단계: 인사이트 요약 (Claude가 수행)

`transcript`를 읽고 **1000자 이내**로 핵심 인사이트를 정리한다.
- 단순 줄거리 요약이 아니라 **실무에 적용할 인사이트 중심** (차재환님 관심사: AX 교육, AI 실무 활용).
- 글머리 기호보다 응축된 문장 위주. 1000자 한도를 반드시 지킬 것.
- 카테고리를 DB 옵션 중에서 1~2개 고른다: `AI`, `마케팅`, `교육`, `비즈니스`, `생산성`, `기타`.

### 3단계: 저장 (save)

요약·카테고리와 함께 DB에 행을 추가한다. 썸네일은 Notion 파일 업로드(실패 시 외부 URL 자동 대체).

```bash
PYTHONUTF8=1 "$PYBIN" "$SCRIPT" save \
  --title "<제목>" \
  --channel "<채널>" \
  --url "<URL>" \
  --insight "<1000자 이내 인사이트>" \
  --category "AI,교육" \
  --thumbnail "<thumbnail_path>" \
  --thumbnail-url "<thumbnail_url>"
```

성공 시 `{"ok": true, "page_id": ..., "url": ...}` 출력. 사용자에게 노션 페이지 URL을 보고한다.

## 팁

- `--date`는 생략하면 오늘 날짜로 자동 설정.
- 인사이트가 1000자를 넘으면 스크립트가 잘라내며 경고를 출력하므로, 2단계에서 미리 1000자 이내로 맞출 것.
- 여러 URL을 받으면 1→2→3단계를 영상별로 반복.
- `--thumbnail`(로컬 파일)과 `--thumbnail-url`(외부)을 둘 다 넘기면, 파일 업로드를 먼저 시도하고 실패 시 외부 URL로 대체한다.

## 한계

- 자막이 없는 영상은 처리 불가 (오디오 전사는 범위 밖).
- 자막 수집은 youtube-transcript-api에 의존 — YouTube 측 변경/차단 시 실패할 수 있음.
