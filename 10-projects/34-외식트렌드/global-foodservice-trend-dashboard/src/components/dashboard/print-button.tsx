'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/primitives'

/** §30 — Daily Brief PDF 출력 (브라우저 인쇄 → PDF로 저장) */
export function PrintButton() {
  return (
    // 스마트폰에서는 PDF 저장을 쓰지 않으므로 숨긴다.
    <Button variant="primary" onClick={() => window.print()} className="hidden md:inline-flex">
      <Printer className="h-3 w-3" aria-hidden />
      PDF로 저장
    </Button>
  )
}
