/**
 * Source 레지스트리와 워치리스트를 DB에 심는다.
 *   npm run db:seed
 * DATA_MODE=live + DATABASE_URL 이 설정된 상태에서 실행한다.
 */
import { PrismaClient } from '@prisma/client'
import { SOURCES } from '../src/lib/sources'
import { RADAR_KEYWORDS, WATCHLIST_BRANDS } from '../src/lib/radar-keywords'

const prisma = new PrismaClient()

async function main() {
  for (const source of SOURCES) {
    await prisma.source.upsert({
      where: { slug: source.id },
      create: {
        slug: source.id,
        name: source.name,
        region: source.region,
        country: source.country,
        url: source.url,
        rssUrl: source.rssUrl,
        reliabilityTier: source.reliabilityTier,
        active: source.active,
        note: source.note ?? null,
      },
      update: {
        name: source.name,
        region: source.region,
        country: source.country,
        url: source.url,
        rssUrl: source.rssUrl,
        reliabilityTier: source.reliabilityTier,
        active: source.active,
        note: source.note ?? null,
      },
    })
  }
  console.log(`✓ sources: ${SOURCES.length}건`)

  for (const brand of WATCHLIST_BRANDS) {
    await prisma.brand.upsert({
      where: { normalized: brand.toLowerCase() },
      create: { name: brand, normalized: brand.toLowerCase(), watchlist: true },
      update: { watchlist: true },
    })
  }
  console.log(`✓ watchlist brands: ${WATCHLIST_BRANDS.length}건`)

  for (const keyword of RADAR_KEYWORDS) {
    await prisma.keyword.upsert({
      where: { normalized: keyword.keyword.toLowerCase() },
      create: {
        term: keyword.keyword,
        normalized: keyword.keyword.toLowerCase(),
        labelKo: keyword.labelKo,
        isRadar: true,
      },
      update: { labelKo: keyword.labelKo, isRadar: true },
    })
  }
  console.log(`✓ radar keywords: ${RADAR_KEYWORDS.length}건`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
