import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import OpenAI from 'openai'
import { AnalysisSchema, type Analysis } from './schema'
import { SYSTEM_PROMPT, buildUserPrompt, type ArticleInput } from './prompt'

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

const CATEGORY_RULES: [Analysis['category'], RegExp][] = [
  ['RESTAURANT_TECH', /\b(ai|robot|automation|kiosk|pos|app|software|voice)\b/i],
  ['M_AND_A', /\b(acquisit|acquire|merger|takeover|stake|buyout)\b/i],
  ['EXPANSION', /\b(open|opening|expand|expansion|new market|store count|units)\b/i],
  ['FRANCHISE', /\b(franchis|refranchis|master franchise)\b/i],
  ['DELIVERY', /\b(delivery|off-premise|aggregator|doordash|uber eats|deliveroo)\b/i],
  ['LABOR', /\b(wage|labour|labor|staffing|shortage|hiring)\b/i],
  ['PRICE_COST', /\b(price|pricing|cost|inflation|value menu|discount)\b/i],
  ['BEVERAGE', /\b(coffee|tea|drink|beverage|cocktail|alcohol|matcha)\b/i],
  ['MENU_FOOD', /\b(menu|dish|launch|flavor|flavour|ingredient|recipe)\b/i],
  ['SUSTAINABILITY', /\b(sustainab|packaging|emission|recycl)\b/i],
  ['DESIGN_CONCEPT', /\b(design|format|concept|remodel|prototype)\b/i],
  ['MARKETING', /\b(loyalty|campaign|promotion|marketing|brand refresh)\b/i],
  ['DATA_INSIGHT', /\b(index|survey|data|report|research|traffic|same-store)\b/i],
]

/**
 * AI 키가 없을 때도 파이프라인이 끝까지 돌도록 하는 규칙 기반 분석.
 * 요약을 생성하지 않고 원문 문장을 그대로 인용한다(사실 생성 금지).
 */
class RuleBasedAnalyzer implements AiAnalyzer {
  readonly name = 'rule-based'

  async analyze(input: ArticleInput): Promise<Analysis> {
    const text = `${input.title} ${input.body}`
    const category =
      CATEGORY_RULES.find(([, re]) => re.test(text))?.[0] ?? 'DATA_INSIGHT'

    const sentences = input.body
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 30)
      .slice(0, 3)

    return {
      original_title: input.title,
      korean_title: input.title,
      summary_ko: sentences.length
        ? sentences
        : [input.title, '', ''].slice(0, 1),
      region: (['GLOBAL', 'ASIA', 'EUROPE', 'AMERICAS'].includes(input.sourceRegion)
        ? input.sourceRegion
        : 'GLOBAL') as Analysis['region'],
      country: input.sourceCountry,
      category,
      secondary_categories: [],
      brands: [],
      keywords: [],
      trend: '',
      why_it_matters: '',
      korea_implication: '',
      sentiment: 'NEUTRAL',
      business_impact_score: 60,
      novelty_score: 50,
      market_scale_score: 55,
      source_reliability_score: 70,
      korea_relevance_score: 50,
      recommended_action: 'REFERENCE',
    }
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
