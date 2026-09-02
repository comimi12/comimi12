/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Prisma Client 는 서버에서 지연 로딩한다.
 *
 * DEMO 모드(기본값)에서는 `prisma generate` 를 돌리지 않아도 앱이 빌드·구동되어야 하므로
 * 정적 import 를 쓰지 않는다. next.config.ts 의 serverExternalPackages 와 한 쌍이다.
 */
let clientPromise: Promise<any | null> | null = null

export function dataMode(): 'demo' | 'live' {
  return process.env.DATA_MODE === 'live' ? 'live' : 'demo'
}

export function isLive(): boolean {
  return dataMode() === 'live' && Boolean(process.env.DATABASE_URL)
}

const globalForPrisma = globalThis as unknown as { __prisma?: any }

export async function getPrisma(): Promise<any | null> {
  if (!isLive()) return null
  if (globalForPrisma.__prisma) return globalForPrisma.__prisma
  if (!clientPromise) {
    clientPromise = (async () => {
      try {
        const mod = await import('@prisma/client')
        const client = new mod.PrismaClient()
        globalForPrisma.__prisma = client
        return client
      } catch (err) {
        console.error(
          '[db] Prisma Client 를 불러오지 못했습니다. `npx prisma generate` 를 실행했는지 확인하세요.',
          err,
        )
        return null
      }
    })()
  }
  return clientPromise
}
