/**
 * 브라우저 내장 번역 (무료 · API 키 불필요 · 서버 전송 없음).
 *
 * Chrome / Edge 138+ 의 Translator API 를 사용한다. 번역 모델이 사용자의 기기에서
 * 돌기 때문에 비용이 들지 않고 기사 본문이 외부로 나가지 않는다.
 * 지원하지 않는 브라우저에서는 unsupported 를 돌려주고 UI 가 안내로 대체한다.
 *
 * 참고: 최초 1회는 모델(수십 MB) 다운로드가 필요하다.
 */

export type TranslateStatus =
  | 'unsupported' // 브라우저가 Translator API 미지원
  | 'unavailable' // 지원하지만 en→ko 조합 불가
  | 'downloadable' // 모델 내려받기 필요
  | 'ready'
  | 'error'

interface TranslatorLike {
  translate(input: string): Promise<string>
  destroy?: () => void
}

interface TranslatorFactory {
  availability(opts: {
    sourceLanguage: string
    targetLanguage: string
  }): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
  create(opts: {
    sourceLanguage: string
    targetLanguage: string
    monitor?: (m: EventTarget) => void
  }): Promise<TranslatorLike>
}

function factory(): TranslatorFactory | null {
  if (typeof window === 'undefined') return null
  const g = window as unknown as { Translator?: TranslatorFactory }
  return g.Translator ?? null
}

export function isTranslateSupported(): boolean {
  return factory() !== null
}

export async function checkAvailability(): Promise<TranslateStatus> {
  const T = factory()
  if (!T) return 'unsupported'
  try {
    const state = await T.availability({ sourceLanguage: 'en', targetLanguage: 'ko' })
    if (state === 'unavailable') return 'unavailable'
    if (state === 'downloadable') return 'downloadable'
    return 'ready'
  } catch {
    return 'error'
  }
}

let cached: Promise<TranslatorLike> | null = null

/** Translator 인스턴스는 재사용한다(생성 비용이 크다). */
async function getTranslator(onProgress?: (pct: number) => void): Promise<TranslatorLike> {
  const T = factory()
  if (!T) throw new Error('이 브라우저는 내장 번역을 지원하지 않습니다.')
  if (!cached) {
    cached = T.create({
      sourceLanguage: 'en',
      targetLanguage: 'ko',
      monitor(m) {
        m.addEventListener('downloadprogress', (event) => {
          const e = event as ProgressEvent
          if (e.total > 0) onProgress?.(Math.round((e.loaded / e.total) * 100))
        })
      },
    }).catch((err) => {
      cached = null
      throw err
    })
  }
  return cached
}

/** 같은 문장을 두 번 번역하지 않는다. */
const memo = new Map<string, string>()

export async function translateMany(
  inputs: string[],
  onProgress?: (pct: number) => void,
): Promise<string[]> {
  const translator = await getTranslator(onProgress)
  const out: string[] = []
  for (const text of inputs) {
    const key = text.trim()
    if (!key) {
      out.push('')
      continue
    }
    const hit = memo.get(key)
    if (hit !== undefined) {
      out.push(hit)
      continue
    }
    const result = await translator.translate(key)
    memo.set(key, result)
    out.push(result)
  }
  return out
}
