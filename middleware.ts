import { NextRequest, NextResponse } from 'next/server';

const BASE_DOMAIN = 'ourlimitedoffer.com';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';

  // Only act on subdomains of ourlimitedoffer.com
  if (!host.endsWith(`.${BASE_DOMAIN}`)) {
    return NextResponse.next();
  }

  const subdomain = host.replace(`.${BASE_DOMAIN}`, '');

  // Skip www or empty
  if (!subdomain || subdomain === 'www') {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();

  // Let API calls and Next.js internals from the subdomain pass through unchanged.
  // Without this, a client-side fetch to /api/... from lorijackson.ourlimitedoffer.com
  // would get rewritten to /p/lorijackson/api/... and 404.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Rewrite root (and any non-API sub-paths) to /p/[subdomain]
  const remainingPath = url.pathname === '/' ? '' : url.pathname;
  url.pathname = `/p/${subdomain}${remainingPath}`;

  const response = NextResponse.rewrite(url);
  // Prevent any CDN (Vercel edge, Cloudflare, etc.) from caching the
  // rewritten response so that edits appear immediately after saving.
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
  response.headers.set('Pragma', 'no-cache');
  return response;
}

export const config = {
  // Run on all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
