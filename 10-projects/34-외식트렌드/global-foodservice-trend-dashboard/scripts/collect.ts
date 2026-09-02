/**
 * 로컬에서 수집 파이프라인을 실행한다.
 *   npm run collect        # 수집 + DB 저장 (DATA_MODE=live 필요)
 *   npm run collect:dry    # 수집·분석만, DB 쓰기 없음
 */
import { runPipeline } from '../src/lib/collect/pipeline'

const dryRun = process.argv.includes('--dry-run')

runPipeline({ dryRun })
  .then((report) => {
    console.log(`\n=== 수집 리포트 (${report.mode} / analyzer: ${report.analyzer}) ===`)
    console.log(`상태          : ${report.status}`)
    console.log(`소스          : ${report.sourcesOk}/${report.sourcesTried} 성공`)
    console.log(`수집 기사     : ${report.articlesFound}건`)
    console.log(`신규 기사     : ${report.articlesNew}건`)
    console.log(`중복 판정     : ${report.duplicates}건`)
    console.log(`AI 분석       : ${report.aiAnalyzed}건`)
    console.log(`Daily Brief   : ${report.briefGenerated ? '생성됨' : '건너뜀'}`)
    console.log('\n--- 소스별 ---')
    for (const o of report.outcomes) {
      const mark = o.ok ? 'OK  ' : 'FAIL'
      console.log(`${mark} ${o.sourceName.padEnd(38)} found=${o.found} new=${o.inserted} ${o.message ?? ''}`)
    }
    if (report.errors.length) {
      console.log('\n--- 오류 ---')
      report.errors.forEach((e) => console.log(`  ${e}`))
    }
  })
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
