import { z } from 'zod'

/** §25 — AI 분석 결과 스키마 (JSON only) */
export const AnalysisSchema = z.object({
  original_title: z.string(),
  korean_title: z.string(),
  /** 3줄 요약 */
  summary_ko: z.array(z.string()),
  region: z.enum(['GLOBAL', 'ASIA', 'EUROPE', 'AMERICAS']),
  country: z.string(),
  category: z.enum([
    'MENU_FOOD',
    'BEVERAGE',
    'CONSUMER',
    'PRICE_COST',
    'RESTAURANT_TECH',
    'OPERATIONS',
    'SERVICE',
    'FRANCHISE',
    'EXPANSION',
    'M_AND_A',
    'DESIGN_CONCEPT',
    'SUSTAINABILITY',
    'LABOR',
    'DELIVERY',
    'MARKETING',
    'DATA_INSIGHT',
  ]),
  secondary_categories: z.array(z.string()),
  brands: z.array(z.string()),
  keywords: z.array(z.string()),
  trend: z.string(),
  why_it_matters: z.string(),
  korea_implication: z.string(),
  sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE']),
  business_impact_score: z.number(),
  novelty_score: z.number(),
  market_scale_score: z.number(),
  source_reliability_score: z.number(),
  korea_relevance_score: z.number(),
  recommended_action: z.enum([
    'IMMEDIATE_REVIEW',
    'BENCHMARK',
    'MID_LONG_TERM',
    'REFERENCE',
  ]),
})

export type Analysis = z.infer<typeof AnalysisSchema>

/** OpenAI / 폴백 파서용 JSON Schema */
export const ANALYSIS_JSON_SCHEMA = z.toJSONSchema(AnalysisSchema, {
  target: 'draft-2020-12',
})
