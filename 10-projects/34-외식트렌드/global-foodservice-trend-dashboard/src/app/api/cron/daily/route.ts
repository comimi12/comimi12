import type { NextRequest } from 'next/server'
import { fail, ok } from '@/lib/api'
import { runPipeline } from '@/lib/collect/pipeline'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * GET /api/cron/daily — 매일 06:00 KST 스케줄 진입점 (§24)
 * Vercel Cron 또는 GitHub Actions 가 호출한다.
 * Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || secret === 'change-me') {
    return fail('CRON_SECRET 이 설정되지 않았습니다.', 500)
  }
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) return fail('인증 실패', 401)

  try {
    return ok(await runPipeline())
  } catch (err) {
    return fail(err instanceof Error ? err.message : String(err), 500)
  }
}
