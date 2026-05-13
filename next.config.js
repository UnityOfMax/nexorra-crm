/** @type {import('next').NextConfig} */
const nextConfig = {
  // Skip TS type checking and ESLint during Vercel builds — we run tsc locally before pushing
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  experimental: {
    serverComponentsExternalPackages: [
      'googleapis',
      'google-auth-library',
      'twilio',
      'resend',
      'web-push',
    ],
  },
  images: {
    domains: ['localhost', 'app.nexorra.io'],
  },
  async headers() {
    return [
      {
        source: '/p/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, s-maxage=30, stale-while-revalidate=60' },
        ],
      },
      {
        // Templates must be embeddable in the editor iframe (same origin)
        source: '/templates/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
