import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { AnalysisSchema, type Analysis } from './schema'
import { SYSTEM_PROMPT, buildUserPrompt, type ArticleInput } from './prompt'
import { analyzeWithRules } from './rule-based'

/**
 * §23 — AI Provider 추상화.
 * AI_PROVIDER=claude | openai | none 으로 교체 가능하며,
 * none 이거나 키가 없으면 규칙 기반 폴백 분석을 사용한다.
 */
export interface AiAnalyzer {
  readonly name: string
  analyze(input: ArticleInput): Promise<Analysis>
}

/* ------------------------------- Claude ------------------------------- */

class ClaudeAnalyzer implements AiAnalyzer {
  readonly name = 'claude'
  private client: Anthropic
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey })
    this.model = model
  }

  async analyze(input: ArticleInput): Promise<Analysis> {
    const response = await this.client.messages.parse({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      // 기사 분석은 짧고 반복적인 작업이라 medium 이면 충분하다.
      output_config: {
        effort: 'medium',
        format: zodOutputFormat(AnalysisSchema),
      },
      messages: [{ role: 'user', content: buildUserPrompt(input) }],
    })

    if (response.stop_reason === 'refusal') {
      throw new Error(
        `Claude refused to analyze the article (${response.stop_details?.category ?? 'unknown'})`,
      )
    }
    if (!response.parsed_output) {
      throw new Error('Claude returned no parsable analysis')
    }
    return response.parsed_output
  }
}

/* ------------------------------- OpenAI ------------------------------- */

class OpenAiAnalyzer implements AiAnalyzer {
  readonly name = 'openai'
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string) {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async analyze(input: ArticleInput): Promise<Analysis> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nReturn a single JSON object.` },
        { role: 'user', content: buildUserPrompt(input) },
      ],
    })
    const raw = completion.choices[0]?.message?.content
    if (!raw) throw new Error('OpenAI returned an empty response')
    return AnalysisSchema.parse(JSON.parse(raw))
  }
}

/* ------------------------- Rule-based fallback ------------------------ */

/**
 * AI 키가 없을 때도 파이프라인이 끝까지 돌도록 하는 규칙 기반 분석기.
 * 요약·번역을 생성하지 않고 원문에서 관측 가능한 것만 추출한다.
 */
class RuleBasedAnalyzer implements AiAnalyzer {
  readonly name = 'rule-based'

  async analyze(input: ArticleInput): Promise<Analysis> {
    return analyzeWithRules(input)
  }
}

/* ------------------------------- Factory ------------------------------ */

export function getAnalyzer(): AiAnalyzer {
  const provider = (process.env.AI_PROVIDER ?? 'none').toLowerCase()

  if (provider === 'claude' && process.env.ANTHROPIC_API_KEY) {
    return new ClaudeAnalyzer(
      process.env.ANTHROPIC_API_KEY,
      process.env.ANTHROPIC_MODEL ?? 'claude-opus-5',
    )
  }
  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    return new OpenAiAnalyzer(
      process.env.OPENAI_API_KEY,
      process.env.OPENAI_MODEL ?? 'gpt-4.1-mini',
    )
  }
  return new RuleBasedAnalyzer()
}

export type { Analysis, ArticleInput }
