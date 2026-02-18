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

  return NextResponse.rewrite(url);
}

export const config = {
  // Run on all paths except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
