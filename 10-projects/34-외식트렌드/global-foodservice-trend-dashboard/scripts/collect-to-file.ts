/**
 * RSS 를 수집·분석해 src/lib/data/collected.json 에 저장한다.
 * GitHub Actions 가 매일 09:00 KST 에 실행하고, 변경이 있으면 커밋한다.
 *
 *   npx tsx scripts/collect-to-file.ts
 *
 * ANTHROPIC_API_KEY 가 있으면 한국어 요약·번역까지 생성되고,
 * 없으면 규칙 기반 폴백(영문 원문 인용)으로 동작한다.
 */
import fs from 'node:fs'
import path from 'node:path'
import { runPipeline } from '../src/lib/collect/pipeline'
import { markDuplicates } from '../src/lib/dedupe'
import { collectedArticles } from '../src/lib/data/collected'
import type { NewsArticle } from '../src/lib/types'

/** 최근 며칠치를 보관할지 (§27 장기 보존은 DB 몫, 파일은 롤링 윈도) */
const RETAIN_DAYS = Number(process.env.COLLECT_RETAIN_DAYS ?? 45)
const MAX_ARTICLES = Number(process.env.COLLECT_MAX_ARTICLES ?? 600)

const OUT = path.join(process.cwd(), 'src', 'lib', 'data', 'collected.json')

async function main() {
  const report = await runPipeline({ dryRun: true })

  const previous = collectedArticles()
  const byId = new Map<string, NewsArticle>()
  // 기존 것을 먼저 넣고 신규로 덮어써 최신 분석 결과를 우선한다.
  previous.forEach((a) => byId.set(a.id, a))
  report.articles.forEach((a) => byId.set(a.id, a))

  const cutoff = Date.now() - RETAIN_DAYS * 86_400_000
  const merged = markDuplicates(
    Array.from(byId.values()).filter((a) => new Date(a.publishedAt).getTime() >= cutoff),
  )
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, MAX_ARTICLES)

  const store = {
    generatedAt: new Date().toISOString(),
    analyzer: report.analyzer,
    sourcesOk: report.sourcesOk,
    articles: merged,
  }

  fs.writeFileSync(OUT, `${JSON.stringify(store, null, 2)}\n`, 'utf8')

  console.log('=== 수집 결과 파일 저장 ===')
  console.log(`analyzer   : ${report.analyzer}`)
  console.log(`소스       : ${report.sourcesOk}/${report.sourcesTried} 성공`)
  console.log(`신규 기사  : ${report.articles.length}건`)
  console.log(`이전 보관  : ${previous.length}건`)
  console.log(`최종 저장  : ${merged.length}건 (최근 ${RETAIN_DAYS}일)`)
  console.log(`파일       : ${OUT}`)
  if (report.errors.length) {
    console.log(`오류       : ${report.errors.length}건`)
    report.errors.slice(0, 5).forEach((e) => console.log(`  ${e}`))
  }
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
