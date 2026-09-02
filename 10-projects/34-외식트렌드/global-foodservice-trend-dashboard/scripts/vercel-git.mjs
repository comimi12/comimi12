/**
 * Vercel ↔ GitHub 연동 도우미
 *
 *   node scripts/vercel-git.mjs status    # 연동 상태 확인
 *   node scripts/vercel-git.mjs connect   # 저장소 연결 + Root Directory + 빌드 스킵 조건 설정
 *
 * 사전 조건: https://github.com/apps/vercel 에서 Vercel GitHub App 설치
 * (계정 권한 승인이라 사람이 직접 해야 하는 단계)
 *
 * 인증은 로컬 Vercel CLI 토큰을 그대로 쓴다. 토큰은 출력하지 않는다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const APP_DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

const REPO = 'comimi12/comimi12'
// 저장소 루트 기준 이 앱의 위치 (Vercel Root Directory)
const ROOT_DIRECTORY = '10-projects/34-외식트렌드/global-foodservice-trend-dashboard'
// exit 0 = 빌드 스킵. Root Directory 안에 변경이 없으면 빌드하지 않는다.
const IGNORE_BUILD_CMD = 'git diff --quiet HEAD^ HEAD -- .'

function authToken() {
  const candidates = [
    path.join(process.env.APPDATA ?? '', 'xdg.data', 'com.vercel.cli', 'auth.json'),
    path.join(process.env.APPDATA ?? '', 'com.vercel.cli', 'auth.json'),
    path.join(process.env.LOCALAPPDATA ?? '', 'com.vercel.cli', 'auth.json'),
    path.join(process.env.HOME ?? '', '.local', 'share', 'com.vercel.cli', 'auth.json'),
  ]
  for (const file of candidates) {
    if (file && fs.existsSync(file)) {
      const token = JSON.parse(fs.readFileSync(file, 'utf8')).token
      if (token) return token
    }
  }
  throw new Error('Vercel CLI 토큰을 찾지 못했습니다. `npx vercel login` 먼저 실행하세요.')
}

function projectRef() {
  const file = path.join(APP_DIR, '.vercel', 'project.json')
  if (!fs.existsSync(file)) {
    throw new Error('.vercel/project.json 이 없습니다. `npx vercel link` 를 먼저 실행하세요.')
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

async function api(pathname, { method = 'GET', body, token, teamId } = {}) {
  const url = new URL(`https://api.vercel.com${pathname}`)
  if (teamId) url.searchParams.set('teamId', teamId)
  const res = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let json
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { raw: text }
  }
  return { status: res.status, ok: res.ok, json }
}

async function getProject(token, ref) {
  const r = await api(`/v9/projects/${ref.projectId}`, { token, teamId: ref.orgId })
  if (!r.ok) throw new Error(`프로젝트 조회 실패 (${r.status}): ${JSON.stringify(r.json)}`)
  return r.json
}

function describeLink(project) {
  const link = project.link
  if (!link) return null
  const repo = link.org && link.repo ? `${link.org}/${link.repo}` : link.repo
  return { repo, type: link.type, rootDirectory: project.rootDirectory ?? '.' }
}

async function status() {
  const token = authToken()
  const ref = projectRef()
  const project = await getProject(token, ref)
  const link = describeLink(project)

  console.log(`project        : ${project.name}`)
  console.log(`root directory : ${project.rootDirectory ?? '.'}`)
  if (link) {
    console.log(`git 연동       : 연결됨 (${link.type}: ${link.repo})`)
    console.log(`빌드 스킵 조건 : ${project.commandForIgnoringBuildStep ?? '(미설정)'}`)
    console.log('\n→ main 에 푸시하면 Vercel 이 자동 배포합니다.')
    return 0
  }
  console.log('git 연동       : 미연결')
  console.log('\n다음 순서로 진행하세요.')
  console.log('  1) https://github.com/apps/vercel 에서 Vercel GitHub App 설치')
  console.log(`     (Repository access 에서 최소 ${REPO} 를 포함)`)
  console.log('  2) npm run connect:git')
  return 1
}

async function connect() {
  const token = authToken()
  const ref = projectRef()

  // 1) 저장소 연결
  const link = await api(`/v9/projects/${ref.projectId}/link`, {
    method: 'POST',
    token,
    teamId: ref.orgId,
    body: { type: 'github', repo: REPO },
  })

  if (!link.ok) {
    const msg = link.json?.error?.message ?? JSON.stringify(link.json)
    console.error(`저장소 연결 실패 (${link.status}): ${msg}`)
    if (/install the GitHub integration/i.test(msg)) {
      console.error('\n→ https://github.com/apps/vercel 에서 Vercel GitHub App 을 먼저 설치하세요.')
      console.error(`   설치 시 Repository access 에 ${REPO} 를 포함해야 합니다.`)
    }
    return 1
  }
  console.log(`저장소 연결 완료: ${REPO}`)

  // 2) Root Directory + 빌드 스킵 조건
  const patch = await api(`/v9/projects/${ref.projectId}`, {
    method: 'PATCH',
    token,
    teamId: ref.orgId,
    body: {
      rootDirectory: ROOT_DIRECTORY,
      commandForIgnoringBuildStep: IGNORE_BUILD_CMD,
    },
  })
  if (!patch.ok) {
    console.error(
      `Root Directory 설정 실패 (${patch.status}): ${JSON.stringify(patch.json?.error ?? patch.json)}`,
    )
    console.error('→ Vercel 대시보드 Settings → General 에서 수동 설정하세요.')
    console.error(`   Root Directory: ${ROOT_DIRECTORY}`)
    return 1
  }
  console.log(`Root Directory  : ${ROOT_DIRECTORY}`)
  console.log(`빌드 스킵 조건  : ${IGNORE_BUILD_CMD}`)
  console.log('\n완료 — 이제 main 에 푸시하면 자동 배포됩니다.')
  console.log('(이 폴더에 변경이 없는 푸시는 빌드를 건너뜁니다)')
  return 0
}

const cmd = process.argv[2] ?? 'status'
const run = cmd === 'connect' ? connect : status
// process.exit() 를 쓰면 Windows 에서 fetch 소켓 정리 중 libuv assertion 이 뜬다.
// 종료 코드만 지정하고 이벤트 루프가 자연스럽게 끝나게 둔다.
run()
  .then((code) => {
    process.exitCode = code
  })
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
