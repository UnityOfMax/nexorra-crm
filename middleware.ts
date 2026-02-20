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

  // Rewrite root (and any sub-paths) to /p/[subdomain]
  const url = request.nextUrl.clone();
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
