import { Label } from '@/components/ui/primitives'
import { tierOf } from '@/lib/sources'

/** 소스 신뢰도 Tier 라벨 (색상 배지 대신 텍스트) */
export function TierTag({ source }: { source: string }) {
  return <Label className="border-line text-muted">TIER {tierOf(source)}</Label>
}
