import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Prisma Client is loaded lazily on the server only (see src/lib/db.ts).
  // Keeping it external prevents the bundler from resolving it at build time,
  // so the app still builds and runs in DEMO mode without `prisma generate`.
  serverExternalPackages: ['@prisma/client'],
}

export default nextConfig
