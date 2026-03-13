/** @type {import('next').NextConfig} */
const nextConfig = {
  // Bundle agent prompt + memory files into the Vercel deployment output
  outputFileTracingIncludes: {
    '/api/agents/runs': ['./agents/**/*', './.claude/commands/**/*'],
  },
  experimental: {
    serverComponentsExternalPackages: [
      'googleapis',
      'google-auth-library',
      'twilio',
      '@anthropic-ai/sdk',
      'resend',
      'web-push',
    ],
  },
  images: {
    domains: ['localhost', 'app.ainexorra.com'],
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
