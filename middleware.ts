import { NextRequest, NextResponse } from 'next/server';

const APP_DOMAIN = 'app.ainexorra.com';
const LEGACY_BASE_DOMAIN = 'ourlimitedoffer.com';

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Pass through Next.js internals and API calls regardless of host
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Legacy: *.ourlimitedoffer.com → /p/[slug] (backward compat) ──
  if (host.endsWith(`.${LEGACY_BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${LEGACY_BASE_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www') {
      const url = request.nextUrl.clone();
      const remainingPath = pathname === '/' ? '' : pathname;
      url.pathname = `/p/${subdomain}${remainingPath}`;
      const response = NextResponse.rewrite(url);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
      response.headers.set('Pragma', 'no-cache');
      return response;
    }
    return NextResponse.next();
  }

  // ── Custom domains: not the app domain, not a Vercel preview URL ──
  // e.g. lori.ourlimitedoffer.com individually registered in Vercel with
  // custom_domain set in the CRM landing page settings.
  if (
    host !== APP_DOMAIN &&
    !host.endsWith('.ainexorra.com') &&
    !host.endsWith('.vercel.app') &&
    !host.includes('localhost')
  ) {
    try {
      // Resolve which landing page owns this domain
      const apiUrl = `https://${APP_DOMAIN}/api/landing-pages/by-domain?domain=${encodeURIComponent(host)}`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      if (res.ok) {
        const { pageId, accountSlug } = await res.json();
        const url = request.nextUrl.clone();
        url.pathname = `/account/${accountSlug}/landing-pages/${pageId}`;
        const response = NextResponse.rewrite(url);
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0');
        return response;
      }
    } catch {
      // Domain not mapped — fall through to normal app
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
