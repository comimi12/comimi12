# Do Better Workspace 가이드

> Claude Code + Johnny Decimal 기반 PKM 워크스페이스.
> 이 파일은 Claude Code가 매 세션 시작 시 자동으로 읽는 프로젝트 지침입니다.
> 본인 프로필(이름, 역할, 관심사)은 이 파일 하단의 "내 프로필" 섹션을 직접 작성하거나 `/setup-workspace` 스킬로 채우세요.

## 작업 기준 10가지 규칙

모든 작업의 기준. 눈치 보지 말고 솔직하게 말한다.

**모든 답변**
- (5) 사용자 생각에 무조건 동의하지 말고, 문제점이 있으면 짚는다.
- (6) 확실한 사실인지 추측인지 구분해서 말한다.
- (7) 중요한 주장은 원출처를 확인하고, 못 찾으면 "확인하지 못했다"고 말한다.

**산출물·판단이 있는 작업** (단순 수정·간단한 질문은 제외)
- (1) 시작 전, 모르는 건 먼저 물어본다.
- (2) 시작 전, 결과물 기준(내용·분량·형식)을 먼저 제안한다.
- (3) 답을 하나만 주지 말고, 다른 방법 3개를 제시한다.
- (8) 결과물을 낸 뒤, 2번 기준을 하나씩 지켰는지 스스로 확인한다.

**해당 시점에**
- (4) 사용자가 쓴 글을 보여주면 그 말투 그대로 쓴다.
- (9) 잘 됐던 방식은 스킬로 저장을 제안해 다음에 또 쓴다.
- (10) 새 대화를 열기 전에, 지금까지 내용의 정리본을 남긴다.

## 폴더 구조 (Johnny Decimal)

```
00-inbox/      # 임시 캡처 (20개 미만 유지, 주간 처리)
00-system/     # 시스템 설정, 템플릿, 가이드
10-projects/   # 활성 프로젝트 (시한부)
20-operations/ # 지속적 운영 (종료일 없음)
30-knowledge/  # 지식 (00-wiki + 도메인 아카이브)
40-personal/   # 개인 노트 (daily, weekly, ideas, reflections, todos)
50-resources/  # 외부 자료, 첨부파일
90-archive/    # 완료/중단 항목
```

### 주요 하위 폴더

| 번호 | 폴더 | 용도 |
|------|------|------|
| **00-wiki** | 30-knowledge/ | **지식 위키 (복리 축적). 아래 Wiki Schema 참조** |
| 41-daily | 40-personal/ | Daily Notes (월별: 41-daily/YYYY-MM/) |
| 42-weekly | 40-personal/ | Weekly Review |
| 43-ideas | 40-personal/ | 아이디어 캡처 |
| 44-reflections | 40-personal/ | 회고 및 학습 |
| 46-todos | 40-personal/ | active-todos.md |
| 37-claude-code | 30-knowledge/ | Claude Code 관련 지식 |

## Wiki (30-knowledge/00-wiki/)

지식이 복리로 축적되는 위키. 주제에 대해 물으면 **00-wiki/index.md를 먼저 확인**.

@30-knowledge/00-wiki/SCHEMA.md

## 파일 명명 규칙

| 유형 | 형식 | 예시 |
|------|------|------|
| Daily Note | `YYYY-MM-DD.md` | 2026-04-24.md |
| 주제 노트 | `주제명.md` | thinking-partner.md |
| JD 폴더 | `XX-name` 또는 `XX.YY-name` | 37-claude-code, 37.01-learning |
| 중복 파일명 | JD prefix 필수 | 18-progress-tracker.md |

## Inbox 관리 (00-inbox)

- **목적**: 임시 캡처, 영구 저장소 아님
- **규칙**: 20개 미만 유지
- **주기**: 주간 처리 (Capture → Process → Organize)

## 첨부파일 (50-resources/attachments/)

- 모든 비텍스트 파일 저장
- 명명: `[관련노트]_[설명].[ext]`

## Google Workspace 연동 (gws CLI)

`gws` (Google Workspace CLI, v0.22.5) CLI로 Google Workspace에 연동되어 있습니다.
Gmail, Calendar, Drive, Sheets, Docs, Slides, Tasks 등을 직접 호출할 수 있습니다.

- 사용법: `gws <service> <resource> <method> --params '<JSON>'`
- 예시: `gws gmail users messages list --params '{"userId":"me","maxResults":5}'`
- 예시: `gws calendar events list --params '{"calendarId":"primary"}'`
- 인증: keyring 백엔드에 OAuth 토큰 저장됨 (별도 로그인 불필요)
- daily-note 스킬은 gws 인증 시 Google Calendar 오늘 일정을 자동 포함

## Skills 사용

이 워크스페이스의 `.claude/skills/`에 프로젝트 전용 스킬이 있습니다.
스킬은 키워드 기반으로 **자동 트리거**됩니다. (수동 슬래시 커맨드 아님)

예: "오늘 daily note 만들어줘" → `daily-note` 스킬 자동 실행
예: "할 일 추가해줘" → `todo` 스킬 자동 실행

## Agents 사용

`.claude/agents/`에 서브에이전트가 있습니다. 복잡한 작업을 Claude가 자동으로 위임하거나, 명시적으로 "research-worker로 조사해줘" 같이 호출할 수 있습니다.

---

## 내 프로필

> 이 섹션을 직접 작성하거나, Claude에게 "워크스페이스 세팅해줘"라고 말하면 `setup-workspace` 스킬이 자동 실행되어 채워줍니다. 같은 스킬이 Python venv·선택 도구(git/gws) 세팅도 안내합니다.

**이름**: 차재환
**역할**: 서비스 교육, 해외 영업지원
**관심사**: AX 교육 — AI를 활용해 일잘러가 되는 법을 강의 (AI 실무 활용 역량 전파)
**이 워크스페이스 용도**: AI 교육, 자료분석, 손익분석, 기획

_작성일: 2026-06-15_

---

**Last Updated**: 2026-04-24
