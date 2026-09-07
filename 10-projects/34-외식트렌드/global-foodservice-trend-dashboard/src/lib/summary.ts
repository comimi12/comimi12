/**
 * 요약문 정리 — RSS 본문 앞뒤에 붙는 매체 홍보 문구를 걷어낸다.
 *
 * 무료(rule-based) 수집 모드에서는 요약이 원문 문장 그대로라, "This story was
 * originally published on QSR…" 같은 뉴스레터 안내가 요약 첫 줄을 차지한다.
 * 화면에서는 기사 내용만 보이게 이 문장들을 버린다.
 */
const BOILERPLATE: RegExp[] = [
  /this story was originally published/i,
  /originally (published|appeared) (on|in)/i,
  /to receive daily news/i,
  /subscribe to (our|the)\b/i,
  /sign up for (our|the)\b/i,
  /^advertisement$/i,
  /^read more\b/i,
]

function isBoilerplate(sentence: string): boolean {
  return BOILERPLATE.some((re) => re.test(sentence))
}

/** 문장 단위로 쪼개 홍보 문구를 걸러낸 요약 줄 목록. */
export function cleanSummaryLines(lines: string[]): string[] {
  return lines
    .filter(Boolean)
    .flatMap((line) => line.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !isBoilerplate(s))
}

/** 카드 한 칸에 넣을 한 문단짜리 요약. */
export function cleanSummaryText(lines: string[]): string {
  return cleanSummaryLines(lines).join(' ')
}
