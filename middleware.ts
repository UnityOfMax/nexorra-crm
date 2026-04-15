import { NextRequest, NextResponse } from 'next/server';

// In production these default to the live domains.
// Set BASE_DOMAIN and INTERNAL_API_BASE in .env.local to test locally.
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'app.ainexorra.com';
const LEGACY_BASE_DOMAIN = process.env.BASE_DOMAIN || 'ourlimitedoffer.com';
const INTERNAL_API_BASE = process.env.INTERNAL_API_BASE || `https://${APP_DOMAIN}`;

// In-memory cache for domain resolution (persists per edge isolate)
const domainCache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60_000; // 60 seconds

function getCached(key: string) {
  const entry = domainCache.get(key);
  if (entry && entry.expiry > Date.now()) return entry.data;
  domainCache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  if (domainCache.size > 500) {
    const oldest = domainCache.keys().next().value;
    if (oldest) domainCache.delete(oldest);
  }
  domainCache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // Pass through Next.js internals and API calls regardless of host
  if (pathname.startsWith('/_next/') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ── Wildcard: *.ourlimitedoffer.com → /p/[slug] ──
  // /questions path maps to a separate page with slug {subdomain}-questions
  if (host.endsWith(`.${LEGACY_BASE_DOMAIN}`)) {
    const subdomain = host.replace(`.${LEGACY_BASE_DOMAIN}`, '');
    if (subdomain && subdomain !== 'www') {
      const isQuestionsPath = pathname === '/questions' || pathname.startsWith('/questions/');
      const lookupSlug = isQuestionsPath ? `${subdomain}-questions` : subdomain;
      const url = request.nextUrl.clone();
      url.pathname = `/p/${lookupSlug}`;
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
      const cacheKey = `domain:${host}`;
      let resolved = getCached(cacheKey);
      if (!resolved) {
        const apiUrl = `${INTERNAL_API_BASE}/api/landing-pages/by-domain?domain=${encodeURIComponent(host)}`;
        const res = await fetch(apiUrl, { cache: 'no-store' });
        if (res.ok) {
          resolved = await res.json();
          setCache(cacheKey, resolved);
        }
      }
      if (resolved) {
        const { pageId, accountSlug } = resolved;
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
