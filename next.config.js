/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'app.ainexorra.com'],
  },
  async headers() {
    return [
      {
        // Public landing pages must never be cached by CDN or browser
        // so that edits appear immediately after saving
        source: '/p/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Surrogate-Control', value: 'no-store' },
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
