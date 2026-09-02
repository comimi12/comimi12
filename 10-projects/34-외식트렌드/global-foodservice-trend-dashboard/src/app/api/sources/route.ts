import { ok } from '@/lib/api'
import { getSources } from '@/lib/repository'

export const dynamic = 'force-dynamic'

/** GET /api/sources — Source Admin (§29) */
export async function GET() {
  return ok(await getSources())
}
