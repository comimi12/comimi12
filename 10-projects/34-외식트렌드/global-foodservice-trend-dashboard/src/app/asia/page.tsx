import { RegionDashboard } from '@/components/dashboard/region-dashboard'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'ASIA — Global Foodservice Trend Intelligence' }

export default function Page() {
  return <RegionDashboard region="ASIA" />
}
