import { redirect } from 'next/navigation'

/**
 * Daily Brief 는 대시보드(/)와 내용이 같아 하나로 합쳤다.
 * 이미 공유된 링크(카카오톡 등)가 살아 있도록 이 경로는 대시보드로 넘긴다.
 */
export default function DailyBriefRedirect() {
  redirect('/')
}
