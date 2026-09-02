'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/primitives'

/** §30 — Daily Brief PDF 출력 (브라우저 인쇄 → PDF로 저장) */
export function PrintButton() {
  return (
    <Button variant="primary" onClick={() => window.print()}>
      <Printer className="h-3 w-3" aria-hidden />
      PDF로 저장
    </Button>
  )
}
