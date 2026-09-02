import type { NextRequest } from 'next/server'
import { fail, ok } from '@/lib/api'
import { runPipeline } from '@/lib/collect/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * POST /api/collect — 수집 파이프라인 수동 실행 (§24)
 * body: { "dryRun": true } 로 DB 쓰기 없이 수집·분석만 검증할 수 있다.
 * CRON_SECRET 이 설정돼 있으면 Bearer 토큰을 요구한다.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && secret !== 'change-me') {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) return fail('인증 실패', 401)
  }

  let dryRun = false
  try {
    const body = await req.json()
    dryRun = Boolean(body?.dryRun)
  } catch {
    // 본문 없음 — 기본값 사용
  }

  try {
    return ok(await runPipeline({ dryRun }))
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500)
  }
}
